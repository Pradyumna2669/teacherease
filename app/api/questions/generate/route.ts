import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scannedToQuestions, type ScannedPaper } from "@/lib/scan";
import { autoPopulateOutlineImages } from "@/lib/outline-images";
import { getBalance, spendAmount, actionCost } from "@/lib/credits";
import { generateQuestions, type ScanImage, type GenerateBrief } from "@/lib/scan-providers";
import { recordFunnelEvent } from "@/lib/funnel-events";

// AI question generation for one unit of the teacher's question bank. Takes a
// brief (subject/class/unit/book/marks) plus optional photos of the textbook
// pages, and returns fresh questions the client files into the bank.
//
// Charged as a flat run fee plus a per-photo fee, since photos are what make the
// vision call expensive. Mirrors /api/scan: pre-check the balance as a cheap
// gate, then charge atomically only after a successful generation.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = process.env.SCAN_MODEL || "claude-sonnet-4-6";

const MAX_IMAGES = 6;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_MARKS = 200;

function toScanImage(input: string): ScanImage | null {
  const m = /^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/i.exec(input.trim());
  const mediaType = m
    ? m[1].toLowerCase().replace("image/jpg", "image/jpeg")
    : "image/jpeg";
  const data = m ? m[2] : input.trim();
  if (!data) return null;
  if ((data.length * 3) / 4 > MAX_BYTES) return null;
  return { mediaType, data };
}

function str(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to generate questions." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const subject = str(body.subject, 80);
  const paperMode = body.mode === "paper";
  const unitName = str(body.unitName, paperMode ? 1200 : 120);
  const marks = Number(body.marks);

  if (!subject || !unitName) {
    return NextResponse.json(
      { error: "Subject and unit are required." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(marks) || marks < 1 || marks > MAX_MARKS) {
    return NextResponse.json(
      { error: `Marks must be between 1 and ${MAX_MARKS}.` },
      { status: 400 }
    );
  }

  // Optional textbook photos.
  const images: ScanImage[] = [];
  if (Array.isArray(body.images)) {
    if (body.images.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Please attach at most ${MAX_IMAGES} photos.` },
        { status: 400 }
      );
    }
    for (const img of body.images) {
      if (typeof img !== "string") continue;
      const parsed = toScanImage(img);
      if (!parsed) {
        return NextResponse.json(
          { error: "A photo is invalid or larger than 5MB." },
          { status: 400 }
        );
      }
      images.push(parsed);
    }
  }

  const brief: GenerateBrief = {
    subject,
    className: str(body.className, 40) || undefined,
    unitName,
    bookName: str(body.bookName, 120) || undefined,
    marks,
    language: str(body.language, 40) || undefined,
    types: Array.isArray(body.types)
      ? body.types.filter((t): t is string => typeof t === "string").slice(0, 12)
      : undefined,
    notes: str(body.notes, 12000) || undefined,
    answerKey: body.answerKey === true,
    paperMode,
    timeAllowed: str(body.timeAllowed, 80) || undefined,
  };

  // One AI paper generation = aiQuestions (20 credits). 60 free credits = 3 papers.
  // Per-page vision fee is added when textbook photos are attached.
  const cost = actionCost("aiQuestions") + actionCost("aiQuestionsPage", images.length);
  const gateCost = cost;

  // Fails CLOSED: an unreadable balance must not reach the vision call, or a
  // Supabase blip hands out free Claude generations.
  let balance: number;
  try {
    ({ balance } = await getBalance(user.id));
  } catch {
    return NextResponse.json(
      {
        error:
          "We couldn't check your credits just now — please try again in a moment.",
      },
      { status: 503 }
    );
  }
  if (balance < gateCost) {
    return NextResponse.json(
      {
        error: "You've used all papers in your pack. Get 5 more papers for just ₹29.",
        upgrade: true,
        needed: gateCost,
        balance,
      },
      { status: 402 }
    );
  }

  const result = await generateQuestions(brief, images, MODEL);
  if (result.error || !result.raw) {
    return NextResponse.json(
      { error: result.error || "Generation failed." },
      { status: result.status || 502 }
    );
  }

  let parsed: ScannedPaper;
  try {
    parsed = JSON.parse(result.raw);
  } catch {
    return NextResponse.json(
      { error: "The generated questions were malformed. Please try again." },
      { status: 502 }
    );
  }

  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return NextResponse.json(
      { error: "No questions were generated. Try adding more detail or a photo." },
      { status: 502 }
    );
  }

  if (paperMode) {
    const generatedMarks = parsed.questions.reduce(
      (sum, question) => sum + (Number.isFinite(question.marks) ? question.marks : 0),
      0
    );
    if (generatedMarks !== marks) {
      return NextResponse.json(
        { error: `The generated paper totalled ${generatedMarks} marks instead of ${marks}. Please generate it again.` },
        { status: 502 }
      );
    }
  }

  // Same normaliser the scan flow uses — fresh ids, sane defaults, label strip.
  const questions = scannedToQuestions(parsed.questions);
  try {
    await autoPopulateOutlineImages(questions);
  } catch {
    /* image fetching is non-blocking enhancement */
  }

  let balanceAfter: number | undefined;
  try {
    const ref = str(body.unitId, 60) || undefined;
    // Run fee and photo fees go out as ONE charge: as two spends, a failure
    // between them left the photos free and the ledger half-written.
    if (cost > 0) {
      const spend = await spendAmount(user.id, cost, "aiQuestions", ref);
      balanceAfter = spend.balanceAfter;
    }
  } catch {
    /* metering failure shouldn't discard work the teacher already waited for */
  }

  await recordFunnelEvent("paper_generated", user.id, {
    mode: paperMode ? "complete" : "question_bank",
    questionCount: questions.length,
    sourcePageCount: images.length,
    hasSourcePdf: images.length > 0,
    hasAnswerKey: brief.answerKey === true,
  });

  return NextResponse.json({
    questions,
    cost,
    settings: paperMode
      ? {
          subject,
          className: str(body.className, 40) || undefined,
          totalMarks: marks,
          assessmentTitle: "Mid-Term Examination",
          language: str(body.language, 40) || "english",
          answerKey: parsed.settings?.answerKey === true || brief.answerKey === true,
          timeAllowed: str(body.timeAllowed, 80) || undefined,
          instructions:
            Array.isArray(parsed.settings?.instructions) && parsed.settings.instructions.length > 0
              ? parsed.settings.instructions.map(String).filter((s) => s.trim().length > 0)
              : undefined,
        }
      : undefined,
    creditsRemaining: balanceAfter,
  });
}
