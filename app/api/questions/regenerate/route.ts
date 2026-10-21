import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scannedToQuestions, type ScannedPaper } from "@/lib/scan";
import { autoPopulateOutlineImages } from "@/lib/outline-images";
import { getBalance, spendAmount, actionCost } from "@/lib/credits";
import { regenerateSingleQuestion } from "@/lib/scan-providers";
import type { Question } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
      { error: "Please sign in to regenerate questions." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const question = body.question as Question | undefined;
  if (!question || !question.type) {
    return NextResponse.json(
      { error: "A valid question is required." },
      { status: 400 }
    );
  }

  const subject = str(body.subject, 80) || "General";
  const className = str(body.className, 40) || undefined;
  const language = str(body.language, 40) || "english";
  const notes = str(body.notes, 500) || undefined;

  const cost = actionCost("regenerateQuestion");

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
        error: `Not enough credits — regenerating a question costs ${cost} credits, you have ${balance}. Top up to continue.`,
        upgrade: true,
        needed: cost,
        balance,
      },
      { status: 402 }
    );
  }

  const result = await regenerateSingleQuestion(
    {
      subject,
      className,
      language,
      question,
      notes,
    },
    MODEL
  );

  if (result.error || !result.raw) {
    return NextResponse.json(
      { error: result.error || "Regeneration failed." },
      { status: result.status || 502 }
    );
  }

  let parsed: ScannedPaper;
  try {
    parsed = JSON.parse(result.raw);
  } catch {
    return NextResponse.json(
      { error: "The generated question was malformed. Please try again." },
      { status: 502 }
    );
  }

  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return NextResponse.json(
      { error: "No question was generated. Please try again." },
      { status: 502 }
    );
  }

  // Same normaliser the scan flow uses — fresh ids, sane defaults, label strip.
  const normalized = scannedToQuestions(parsed.questions);
  const newQuestion = normalized[0];

  // Preserve mark value from original if model changed it
  if (question.marks && question.marks > 0) {
    newQuestion.marks = question.marks;
  }

  try {
    await autoPopulateOutlineImages([newQuestion]);
  } catch {
    /* non-blocking enhancement */
  }

  let balanceAfter: number | undefined;
  try {
    if (cost > 0) {
      const spend = await spendAmount(user.id, cost, "regenerateQuestion", question.id);
      balanceAfter = spend.balanceAfter;
    }
  } catch {
    /* metering failure shouldn't discard work already completed */
  }

  return NextResponse.json({
    question: newQuestion,
    cost,
    creditsRemaining: balanceAfter,
  });
}
