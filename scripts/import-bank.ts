import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { SKILL_BY_ID } from "../lib/curriculum/skills";

// Imports question JSON produced outside the app — pasted from a chat UI,
// bought from a content vendor, or typed by hand.
//
//   npx tsx scripts/import-bank.ts seed/class10-real-numbers.json
//   npx tsx scripts/import-bank.ts seed/*.json
//
// Applies exactly the same rules as scripts/seed-bank.ts. A question that
// arrived by copy-paste is not more trustworthy than one from the API, and the
// point of the rules is that nothing reaches a teacher unchecked.

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Incoming {
  board?: string | null;
  class: number;
  subject?: string;
  chapter?: string | null;
  skill_id?: string | null;
  question_type: string;
  difficulty?: string;
  marks?: number;
  text: string;
  options?: string[];
  answer: string;
  explanation?: string;
  /** Only for genuine past papers, and then it must name the paper. */
  provenance?: string;
  source_ref?: string;
}

const TYPES = new Set([
  "mcq", "fill-blanks", "true-false", "short-answer", "long-answer",
  "word-problem", "match", "assertion-reason", "case-study",
]);

const DEFAULT_MARKS: Record<string, number> = {
  mcq: 1, "fill-blanks": 1, "true-false": 1, "short-answer": 2,
  "long-answer": 5, "word-problem": 3, match: 4, "assertion-reason": 1,
  "case-study": 4,
};

/** Same gate as the seeder. Copy-paste is not a trust signal. */
function reject(q: Incoming): string | null {
  if (!q.text?.trim()) return "empty text";
  if (!q.answer?.toString().trim()) return "empty answer";
  if (!Number.isInteger(q.class) || q.class < 1 || q.class > 12) return "bad class";
  if (!TYPES.has(q.question_type)) return `unknown type ${q.question_type}`;
  if (!q.chapter && !q.skill_id) return "needs a chapter or a skill_id";
  if (q.skill_id && !SKILL_BY_ID.has(q.skill_id)) return `unknown skill ${q.skill_id}`;
  if (q.text.length > 900) return "too long";
  if (/^Q\s*\d|^\d+\s*[.)]/.test(q.text.trim())) return "carries a question number";
  if (/\bfigure\b|\bdiagram\b|\bgiven graph\b/i.test(q.text)) return "needs a figure";
  if (q.question_type === "mcq") {
    if (!q.options || q.options.length !== 4) return "mcq needs exactly 4 options";
    if (new Set(q.options).size !== 4) return "duplicate options";
    if (!q.options.some((o) => o.trim() === q.answer.toString().trim()))
      return "answer not among options";
    if (q.options.some((o) => /all of the above|none of these/i.test(o))) return "lazy option";
  }
  // The one rule that is about honesty rather than quality.
  if (q.provenance === "pyq" && !q.source_ref?.trim())
    return "a past-paper question must name its paper in source_ref";
  return null;
}

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("usage: npx tsx scripts/import-bank.ts <file.json> [more.json]");
    process.exit(1);
  }

  let inserted = 0;
  let rejected = 0;
  let duplicate = 0;

  for (const file of files) {
    let parsed: { items?: Incoming[] } | Incoming[];
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      console.error(`${file}: not valid JSON — ${(err as Error).message}`);
      continue;
    }
    const items = Array.isArray(parsed) ? parsed : parsed.items ?? [];
    if (!items.length) {
      console.error(`${file}: no items`);
      continue;
    }

    const rows = [];
    for (const q of items) {
      const bad = reject(q);
      if (bad) {
        rejected++;
        console.error(`  rejected: ${bad} — ${(q.text ?? "").slice(0, 60)}`);
        continue;
      }
      rows.push({
        board: q.board ?? null,
        class: q.class,
        subject: q.subject ?? "maths",
        skill_id: q.skill_id ?? null,
        chapter: q.chapter ?? null,
        topic: q.chapter ?? q.skill_id ?? null,
        question_type: q.question_type,
        difficulty: ["easy", "medium", "hard"].includes(q.difficulty ?? "")
          ? q.difficulty
          : "medium",
        marks: q.marks ?? DEFAULT_MARKS[q.question_type] ?? 1,
        body: {
          text: q.text.trim(),
          ...(q.options ? { options: q.options } : {}),
        },
        answer: q.answer.toString().trim(),
        explanation: q.explanation?.trim() ?? null,
        language: "english",
        provenance: q.provenance === "pyq" ? "pyq" : "llm",
        source_ref: q.source_ref?.trim() ?? null,
        review_state: "machine-checked",
      });
    }

    // Insert one at a time so a single duplicate does not lose the batch — the
    // dedupe index is what makes re-running a paste safe.
    for (const row of rows) {
      const { error } = await db.from("bank_items").insert(row);
      if (!error) inserted++;
      else if (error.code === "23505") duplicate++;
      else console.error(`  insert failed: ${error.message}`);
    }
    console.log(`${file}: ${rows.length} accepted`);
  }

  console.log(`\ndone: ${inserted} inserted, ${rejected} rejected, ${duplicate} already present`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
