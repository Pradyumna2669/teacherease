import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBalance, spendAmount, actionCost } from "@/lib/credits";
import { answerableItems } from "@/lib/answers";
import { generateAnswers } from "@/lib/answers-provider";
import { DEFAULT_SETTINGS, type PaperSettings, type Question } from "@/lib/types";
import { recordFunnelEvent } from "@/lib/funnel-events";

// Answer key for one paper. Charged as a single flat run fee — this is text
// only, so it costs a fraction of a scan.
//
// Mirrors /api/questions/generate: pre-check the balance as a cheap gate, run,
// then charge atomically only after something usable came back.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = process.env.SCAN_MODEL || "claude-sonnet-4-6";
const MAX_ITEMS = 120;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to make an answer key." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const questions = Array.isArray(body.questions)
    ? (body.questions as Question[])
    : [];
  if (!questions.length) {
    return NextResponse.json(
      { error: "Add some questions first." },
      { status: 400 }
    );
  }

  const settings: PaperSettings = {
    ...DEFAULT_SETTINGS,
    ...((body.settings as Partial<PaperSettings>) || {}),
  };

  const items = answerableItems(questions).slice(0, MAX_ITEMS);
  if (!items.length) {
    return NextResponse.json(
      {
        error:
          "Nothing on this paper needs an answer — handwriting and drawing questions have none.",
      },
      { status: 400 }
    );
  }

  const cost = actionCost("answers");

  // Fails CLOSED: an unreadable balance must not reach the model, or a Supabase
  // blip hands out free generations.
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
  if (balance < cost) {
    return NextResponse.json(
      {
        error: `Not enough credits — an answer key costs ${cost} credits, you have ${balance}.`,
        upgrade: true,
        needed: cost,
        balance,
      },
      { status: 402 }
    );
  }

  const result = await generateAnswers(settings, items, MODEL);
  if (result.error || !result.answers) {
    return NextResponse.json(
      { error: result.error || "Could not write the answer key." },
      { status: result.status || 502 }
    );
  }

  // Only ids we asked about come back through, so a hallucinated key cannot
  // land on a question that does not exist.
  const asked = new Set(items.map((i) => i.id));
  const answers = result.answers.filter((a) => asked.has(a.id) && a.answer);
  if (!answers.length) {
    return NextResponse.json(
      { error: "No answers came back. Please try again." },
      { status: 502 }
    );
  }

  let balanceAfter: number | undefined;
  try {
    const ref = typeof body.paperId === "string" ? body.paperId : undefined;
    const spend = await spendAmount(user.id, cost, "answers", ref);
    balanceAfter = spend.balanceAfter;
  } catch {
    /* metering failure shouldn't discard work the teacher already waited for */
  }

  await recordFunnelEvent("answer_key_generated", user.id, {
    questionCount: answers.length,
    hasAnswerKey: true,
  });
  return NextResponse.json({ answers, cost, balanceAfter });
}
