import { isStructuralQuestion, type Question } from "@/lib/types";

// Answer-key shapes, and the rule for what on a paper can be answered.
//
// Kept free of the Anthropic SDK so the answer-key panel can import it in the
// browser: lib/answers-provider.ts holds the model call. Same split as
// lib/scan.ts vs lib/scan-providers.ts, and for the same reason — pulling the
// SDK into a client component drags node:child_process into the bundle and the
// build fails.

export interface AnswerRequest {
  /** Stable id the answer is filed back against. */
  id: string;
  /** "3a", "5" — what the teacher sees on the sheet, for the model's context. */
  label: string;
  /** The question text itself. */
  text: string;
  /** Options for a multiple-choice item, so the model picks rather than invents. */
  options?: string[];
  /** Question type, so a match gets a pairing and a sum gets a number. */
  kind: string;
}

export interface AnswerResult {
  answers?: { id: string; answer: string }[];
  error?: string;
  status?: number;
}

// Flattens a paper into the questions worth answering. A handwriting drill or a
// drawing box has no answer, so asking for one only wastes tokens and invites
// the model to invent something.
const UNANSWERABLE = new Set([
  "handwriting",
  "draw",
  "picture-composition",
  "dictation",
  "composition",
  "label-image",
  "diagram-label",
]);

export function answerableItems(questions: Question[]): AnswerRequest[] {
  const out: AnswerRequest[] = [];
  let questionNumber = 0;
  questions.forEach((q) => {
    if (isStructuralQuestion(q)) return;
    questionNumber += 1;
    if (UNANSWERABLE.has(q.type)) return;

    // Match and table answers belong to the whole question, not to one row.
    if (q.type === "match") {
      const left = (q.matchLeft || []).filter(Boolean);
      const right = (q.matchRight || []).filter(Boolean);
      if (!left.length || !right.length) return;
      out.push({
        id: `q:${q.id}`,
        label: String(questionNumber),
        kind: "match the following",
        text: `Column A: ${left.join(" | ")}\nColumn B: ${right.join(" | ")}`,
      });
      return;
    }

    q.items.forEach((item, ii) => {
      const text = (item.content || "").trim();
      const sum =
        item.nums?.filter(Boolean).join(` ${q.operation || "+"} `) ||
        (item.num1 && item.num2
          ? `${item.num1} ${q.operation || "+"} ${item.num2}`
          : "");
      const body = text || sum;
      if (!body) return;
      out.push({
        id: `i:${item.id}`,
        label: `${questionNumber}${String.fromCharCode(97 + ii)}`,
        kind: q.type,
        text: body,
        options: item.options?.filter(Boolean),
      });
    });
  });
  return out;
}
