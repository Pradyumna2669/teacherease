import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { CHAPTERS } from "../lib/curriculum/chapters";
import { SKILLS, CONCEPT_BY_ID } from "../lib/curriculum/skills";
import { TEMPLATES_BY_SKILL } from "../lib/curriculum/templates";

// Writes ready-to-paste prompts into prompts/, one file per batch.
//
//   npx tsx scripts/make-prompts.ts
//
// Each file asks for one chapter (Classes 9-12) or one concept's worth of
// skills (Classes 1-8), across every question type, in the exact JSON shape
// scripts/import-bank.ts accepts. Paste one into a chat model, save the reply
// as prompts/<name>.json, then import.
//
// Skips anything the bank already has, so re-running after a partial session
// only asks for what is still missing.

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PER_TYPE = 6;

// Placeholders are __TOKEN__ rather than bare words: a plain "N" also matches
// the N in "ONLY", which quietly corrupted every prompt the first time.
const SHAPE = `Return ONLY a JSON object, no prose before or after, no markdown
fence:

{"items":[
  {"class":__CLASS__,__BOARD____PLACEMENT__,"subject":"__SUBJECT__",
   "question_type":"mcq","difficulty":"easy","text":"...",
   "options":["..","..","..",".."],"answer":"..","explanation":".."}
]}

Rules:
- "answer" must exactly match one of "options" for mcq. Four options, all
  different, no "all of the above".
- Omit "options" for every type except mcq.
- "difficulty" is "easy", "medium" or "hard".
- No question numbers in "text". No "Q1.", no "1)".
- No references to a figure, diagram or graph — this paper is text only.
- Indian context: rupees, metric units, Indian names.
- The answer must be correct. Check it. If unsure, ask something easier.`;

const TYPES_FOR = (cls: number) =>
  cls <= 8
    ? ["mcq", "fill-blanks", "true-false", "short-answer", "word-problem", "match"]
    : ["mcq", "fill-blanks", "short-answer", "long-answer", "word-problem", "assertion-reason", "case-study"];

async function main() {
  mkdirSync("prompts", { recursive: true });

  const { data: existing } = await db
    .from("bank_items")
    .select("chapter, skill_id");
  const haveChapter = new Set((existing ?? []).map((r) => r.chapter).filter(Boolean));
  const haveSkill = new Set((existing ?? []).map((r) => r.skill_id).filter(Boolean));

  const written: string[] = [];

  // ---- Classes 1-8: the skills no template can generate -------------------
  const byConcept = new Map<string, typeof SKILLS>();
  for (const s of SKILLS) {
    if (TEMPLATES_BY_SKILL[s.id]?.length) continue;
    if (haveSkill.has(s.id)) continue;
    const bucket = byConcept.get(s.concept);
    if (bucket) bucket.push(s);
    else byConcept.set(s.concept, [s]);
  }

  for (const [conceptId, skills] of Array.from(byConcept.entries())) {
    const concept = CONCEPT_BY_ID.get(conceptId);
    const cls = Math.min(...skills.map((s) => s.typicalClass));
    const types = TYPES_FOR(cls);
    const body = `You write exam questions for Indian school teachers.

Class ${cls} maths. Topic: ${concept?.label ?? conceptId}.

Write ${PER_TYPE} questions for EACH of these skills, for EACH question type
listed. Spread the difficulty across easy, medium and hard.

Skills (use the skill_id exactly as given):
${skills.map((s) => `  - skill_id "${s.id}" — ${s.statement}`).join("\n")}

Question types: ${types.join(", ")}

Each question must test only its own skill, at Class ${cls} level, and nothing
harder.

${SHAPE.replace("__PLACEMENT__", `"skill_id":"THE_SKILL_ID"`)
  .replace("__BOARD__", "")
  .replace("__SUBJECT__", "maths")
  .replace("__CLASS__", String(cls))}`;

    const name = `prompts/c${cls}-${conceptId}.txt`;
    writeFileSync(name, body, "utf8");
    written.push(name);
  }

  // ---- Classes 9-12: one per chapter --------------------------------------
  for (const set of CHAPTERS) {
    for (const chapter of set.chapters) {
      if (haveChapter.has(chapter)) continue;
      const types = TYPES_FOR(set.class);
      const body = `You write exam questions for Indian school teachers.

Class ${set.class} ${set.subject}, ${set.board === "cbse" ? "CBSE" : "Maharashtra State Board"}, from ${set.book}.
Chapter: ${chapter}

Write ${PER_TYPE} questions for EACH question type listed, all from this chapter
only. Spread the difficulty across easy, medium and hard.

Question types: ${types.join(", ")}

${SHAPE.replace("__PLACEMENT__", `"chapter":"${chapter}"`)
  .replace("__BOARD__", `"board":"${set.board}",`)
  .replace("__SUBJECT__", set.subject)
  .replace("__CLASS__", String(set.class))}`;

      const name = `prompts/c${set.class}-${set.board}-${set.subject}-${chapter
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}.txt`;
      writeFileSync(name, body, "utf8");
      written.push(name);
    }
  }

  console.log(`${written.length} prompt(s) written to prompts/`);
  console.log(`
Each one asks for roughly ${PER_TYPE * 6}-${PER_TYPE * 7} questions.

  1. paste a prompt into the model
  2. save the JSON reply as prompts/<same-name>.json
  3. npx tsx scripts/import-bank.ts prompts/*.json

Re-run this script any time — it only writes prompts for what the bank is
still missing.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
