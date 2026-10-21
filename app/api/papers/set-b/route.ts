import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scannedToQuestions, type ScannedPaper } from "@/lib/scan";
import { autoPopulateOutlineImages } from "@/lib/outline-images";
import { getBalance, spendAmount, actionCost } from "@/lib/credits";
import { generateQuestions, type GenerateBrief } from "@/lib/scan-providers";
import { recordFunnelEvent } from "@/lib/funnel-events";
import type { Question, PaperSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = process.env.SCAN_MODEL || "claude-sonnet-4-6";

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
      { error: "Please sign in to generate a parallel paper." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sourcePaperId = str(body.sourcePaperId, 60);
  if (!sourcePaperId) {
    return NextResponse.json(
      { error: "Source paper ID is required." },
      { status: 400 }
    );
  }

  const variant = str(body.variant, 20) || "Set B";
  const customNotes = str(body.notes, 500);
  const includeAnswerKey =
    typeof body.includeAnswerKey === "boolean" ? body.includeAnswerKey : undefined;

  // Fetch the source paper owned by this teacher
  const { data: sourcePaper, error: fetchErr } = await supabase
    .from("papers")
    .select("*")
    .eq("id", sourcePaperId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !sourcePaper) {
    return NextResponse.json(
      { error: "Source paper not found." },
      { status: 404 }
    );
  }

  const originalQuestions = (sourcePaper.questions as Question[]) || [];
  if (originalQuestions.length === 0) {
    return NextResponse.json(
      { error: "Source paper has no questions yet. Add questions before creating a parallel set." },
      { status: 400 }
    );
  }

  const sourceSettings = (sourcePaper.settings as PaperSettings) || {};
  const marksFromQuestions = originalQuestions.reduce(
    (sum, q) => sum + (Number.isFinite(q.marks) ? q.marks : 0),
    0
  );
  const targetMarks = sourceSettings.totalMarks || (marksFromQuestions > 0 ? marksFromQuestions : 60);
  const subject = sourcePaper.subject || sourceSettings.subject || "General";
  const className = sourcePaper.class_name || sourceSettings.className || undefined;
  const language = sourceSettings.language || "english";
  const answerKeyRequested =
    includeAnswerKey !== undefined ? includeAnswerKey : sourceSettings.answerKey === true;

  const blueprintLines = originalQuestions.map((q, idx) => {
    return `${idx + 1}. [${q.type}] "${q.title}" — ${q.marks} Marks${q.items?.length ? ` (${q.items.length} sub-items)` : ""}`;
  });

  const cost = actionCost("aiQuestions");

  let balance: number;
  try {
    ({ balance } = await getBalance(user.id));
  } catch {
    return NextResponse.json(
      { error: "We couldn't check your credits just now — please try again in a moment." },
      { status: 503 }
    );
  }

  if (balance < cost) {
    return NextResponse.json(
      {
        error: `You've used all your free paper generations. Get 10 more papers for ₹59.`,
        upgrade: true,
        needed: cost,
        balance,
      },
      { status: 402 }
    );
  }

  const brief: GenerateBrief = {
    subject,
    className,
    unitName: `${subject} Syllabus (${sourcePaper.title})`,
    marks: targetMarks,
    language,
    paperMode: true,
    answerKey: answerKeyRequested,
    timeAllowed: sourceSettings.timeAllowed,
    notes: [
      `CREATE A PARALLEL EXAMINATION (${variant}) FOR "${sourcePaper.title}".`,
      "",
      "Original paper blueprint to mirror:",
      ...blueprintLines,
      "",
      `PARALLEL ${variant} RULES:`,
      "1. Mirror the EXACT section structure, question types, and mark distribution of the blueprint above.",
      "2. Generate COMPLETELY FRESH, NON-OVERLAPPING questions, different numerical values, different options, and different context so students in adjacent seats cannot copy.",
      "3. Maintain equivalent difficulty, syllabus depth, and timing to ensure both sets are fair.",
      customNotes ? `Teacher instructions: ${customNotes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const result = await generateQuestions(brief, [], MODEL);
  if (result.error || !result.raw) {
    return NextResponse.json(
      { error: result.error || `Failed to generate ${variant}.` },
      { status: result.status || 502 }
    );
  }

  let parsed: ScannedPaper;
  try {
    parsed = JSON.parse(result.raw);
  } catch {
    return NextResponse.json(
      { error: `The generated ${variant} questions were malformed. Please try again.` },
      { status: 502 }
    );
  }

  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return NextResponse.json(
      { error: `No questions were generated for ${variant}. Please try again.` },
      { status: 502 }
    );
  }

  const newQuestions = scannedToQuestions(parsed.questions);
  try {
    await autoPopulateOutlineImages(newQuestions);
  } catch {
    /* non-blocking enhancement */
  }

  // Compute clean new title: e.g. "Term 1 Exam (Set B)"
  let cleanBaseTitle = sourcePaper.title.replace(/\s*\((?:Set\s+[A-Z]|copy)\)$/i, "").trim();
  const newTitle = `${cleanBaseTitle} (${variant})`;

  const newSettings: PaperSettings = {
    ...sourceSettings,
    subject,
    className: className || sourceSettings.className,
    totalMarks: targetMarks,
    assessmentTitle: `${sourceSettings.assessmentTitle || cleanBaseTitle} (${variant})`,
    language,
    answerKey: answerKeyRequested,
    instructions:
      Array.isArray(parsed.settings?.instructions) && parsed.settings.instructions.length > 0
        ? parsed.settings.instructions.map(String).filter((s) => s.trim().length > 0)
        : sourceSettings.instructions,
  };

  // Insert the newly generated paper
  const { data: newPaper, error: insertErr } = await supabase
    .from("papers")
    .insert({
      user_id: user.id,
      title: newTitle,
      subject,
      class_name: className || null,
      settings: newSettings,
      questions: newQuestions,
      method: "ai_generated",
    })
    .select("id, title")
    .single();

  if (insertErr || !newPaper) {
    return NextResponse.json(
      { error: "Failed to save the generated paper." },
      { status: 500 }
    );
  }

  let balanceAfter: number | undefined;
  try {
    if (cost > 0) {
      const spend = await spendAmount(user.id, cost, "aiQuestions", newPaper.id);
      balanceAfter = spend.balanceAfter;
    }
  } catch {
    /* Metering failure shouldn't discard work already generated */
  }

  await recordFunnelEvent("paper_generated", user.id, {
    mode: "set_b",
    sourcePaperId,
    variant,
    questionCount: newQuestions.length,
    hasAnswerKey: answerKeyRequested,
  });

  return NextResponse.json({
    id: newPaper.id,
    title: newPaper.title,
    cost,
    creditsRemaining: balanceAfter,
  });
}
