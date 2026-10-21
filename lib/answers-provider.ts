import Anthropic from "@anthropic-ai/sdk";
import type { PaperSettings } from "@/lib/types";
import type { AnswerRequest, AnswerResult } from "@/lib/answers";

// The model call behind the answer key. Server-only — importing this from a
// client component pulls the Anthropic SDK into the browser bundle.
//
// Deliberately separate from lib/scan-providers.ts: that module's job/run
// machinery is hard-wired to the scan output schema, and threading a second
// schema through it would put the scan path — the feature the product is built
// on — at risk for the sake of a smaller one.
//
// The model is asked only to answer questions it is given. It never rewrites,
// renumbers or adds a question, because the paper has already been printed in
// the teacher's head by the time she asks for a key.

const SYSTEM = `You are marking assistant to an Indian school teacher.

You are given the questions from one exam paper. Return the correct answer for
each, keyed by the id you were given.

Rules:
- Answer ONLY the questions given. Never add, merge, renumber or reword one.
- Keep every answer short enough to sit in a marking key: a word or number for a
  blank, the chosen option for multiple choice, the pairing for a match, one or
  two sentences for a short answer, the working then the result for a sum.
- For multiple choice, give the option text, not just the letter, so the key
  survives the options being reordered later.
- Match the language of the question. A Marathi question gets a Marathi answer.
- If a question cannot be answered from what is written — a diagram is missing,
  a passage was not supplied, the question is incomplete — return an empty
  string for it rather than guessing. A wrong key is worse than a gap, because
  the teacher trusts it in front of a class.
- Never explain yourself outside the answer text.`;

const SCHEMA = {
  type: "object",
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          answer: { type: "string" },
        },
        required: ["id", "answer"],
        additionalProperties: false,
      },
    },
  },
  required: ["answers"],
  additionalProperties: false,
} as const;

function briefFor(settings: PaperSettings, items: AnswerRequest[]): string {
  const head = [
    settings.subject && `Subject: ${settings.subject}`,
    settings.className && `Class: ${settings.className}`,
    `Language: ${settings.language}`,
  ]
    .filter(Boolean)
    .join("\n");

  const body = items
    .map((q) => {
      const opts = q.options?.length
        ? `\n   options: ${q.options.map((o) => `"${o}"`).join(", ")}`
        : "";
      return `- id: ${q.id}\n   number: ${q.label}\n   type: ${q.kind}\n   question: ${q.text}${opts}`;
    })
    .join("\n");

  return `${head}\n\nAnswer each of these:\n${body}`;
}

export async function generateAnswers(
  settings: PaperSettings,
  items: AnswerRequest[],
  model: string
): Promise<AnswerResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      error: "Answer keys are not configured (missing ANTHROPIC_API_KEY).",
      status: 503,
    };
  }
  const client = new Anthropic();
  try {
    const message = await client.messages.create({
      model,
      max_tokens: 8000,
      system: SYSTEM,
      // Cold: there is one right answer and we do not want variety.
      temperature: 0,
      output_config: {
        format: {
          type: "json_schema",
          schema: SCHEMA as unknown as Record<string, unknown>,
        },
      },
      messages: [{ role: "user", content: briefFor(settings, items) }],
    });

    const text = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    if (!text) return { error: "No answers were returned.", status: 502 };

    const parsed = JSON.parse(text) as { answers?: unknown };
    if (!Array.isArray(parsed.answers)) {
      return { error: "The answers came back malformed.", status: 502 };
    }
    const answers = parsed.answers
      .filter(
        (a): a is { id: string; answer: string } =>
          !!a &&
          typeof (a as { id?: unknown }).id === "string" &&
          typeof (a as { answer?: unknown }).answer === "string"
      )
      .map((a) => ({ id: a.id, answer: a.answer.trim().slice(0, 1200) }));

    return { answers };
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Answer generation failed.";
    return { error: detail, status: 502 };
  }
}

