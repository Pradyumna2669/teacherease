import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { CHAPTERS } from "../lib/curriculum/chapters";
import { SKILLS, SKILL_BY_ID } from "../lib/curriculum/skills";
import { TEMPLATES_BY_SKILL } from "../lib/curriculum/templates";

// .env.local by hand rather than pulling in dotenv for one script.
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) {
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// Fills bank_items with questions.
//
//   npx tsx scripts/seed-bank.ts --class 10 --subject maths --board cbse
//   npx tsx scripts/seed-bank.ts --gaps            # skills with no template
//   npx tsx scripts/seed-bank.ts --all --limit 20  # everything, capped
//
// Resumable by construction: a unique index on (subject, class, type, question
// text) means re-running skips what already exists, so a failed run is just
// restarted rather than unpicked.
//
// Everything written here is provenance 'llm'. It is NOT labelled as a previous
// year question and must never be — a teacher preparing a class against
// invented "past papers" is worse off than one with no past papers at all. Real
// PYQs get provenance 'pyq' and a source_ref naming the paper, and they come
// from actual board papers, not from here.

const MODEL = process.env.SCAN_MODEL || "claude-sonnet-4-6";
const PER_CALL = 8;
// Gap between calls. Gemini's free tier allows only a few requests a minute,
// so a bulk seed has to be paced or it spends the whole run in backoff.
const PACE_MS = Number(process.env.SEED_PACE_MS ?? 4500);

const anthropic = new Anthropic();
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const has = (name: string) => args.includes(`--${name}`);

const TYPES_BY_CLASS = (cls: number): { type: string; marks: number }[] =>
  cls <= 8
    ? [
        { type: "mcq", marks: 1 },
        { type: "fill-blanks", marks: 1 },
        { type: "true-false", marks: 1 },
        { type: "short-answer", marks: 2 },
        { type: "match", marks: 4 },
        { type: "word-problem", marks: 3 },
      ]
    : [
        { type: "mcq", marks: 1 },
        { type: "fill-blanks", marks: 1 },
        { type: "short-answer", marks: 2 },
        { type: "long-answer", marks: 5 },
        { type: "word-problem", marks: 3 },
        { type: "assertion-reason", marks: 1 },
        { type: "case-study", marks: 4 },
      ];

const SYSTEM = `You write exam questions for Indian school teachers.

Rules that matter more than fluency:
- The question must be answerable from the class and topic given, and from
  nothing beyond it. A Class 9 question must never need Class 11 method.
- The answer must be correct. Check it before you write it. If you are not
  certain, write an easier question you are certain about.
- Indian context: rupees, metric units, Indian names and places.
- Plain classroom English. Short sentences.
- No question numbers, no marks in the text, no "Q1." prefixes.
- For MCQ give exactly four options, one correct, three plausible-but-wrong.
  Never "all of the above".
- For match-the-following give equal-length left and right lists, and put the
  correct pairing in the answer.
- No diagrams, no images, no "refer to the figure" — this paper is text only.`;

interface Drafted {
  text: string;
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
}

const SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "string" },
          explanation: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
        },
        required: ["text", "answer", "difficulty"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

// Whichever provider has credit. Seeding is a bulk job and Gemini Flash has a
// generous free tier, so it is the default; Anthropic gives better questions
// when the account is funded. --provider chooses, SEED_PROVIDER is the default.
type Provider = "gemini" | "anthropic";
const PROVIDER: Provider =
  (flag("provider") as Provider) ||
  (process.env.SEED_PROVIDER as Provider) ||
  "gemini";

const SHAPE = `Return ONLY a JSON object of this exact shape, with no prose
around it:
{"questions":[{"text":"...","options":["..."],"answer":"...","explanation":"...","difficulty":"easy|medium|hard"}]}
Include "options" only for multiple-choice questions.`;

/**
 * Models occasionally emit a raw newline or tab inside a JSON string literal,
 * which is invalid JSON and throws away the whole batch of eight questions.
 * Escaping the control characters inside strings recovers it; anything still
 * malformed after this genuinely deserves to fail.
 */
function sanitise(raw: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of raw) {
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString && ch === "\n") out += "\\n";
    else if (inString && ch === "\r") out += "\\r";
    else if (inString && ch === "\t") out += "\\t";
    else out += ch;
  }
  return out;
}

async function draftAnthropic(prompt: string): Promise<Drafted[]> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    temperature: 0.9, // variety matters; correctness is checked separately
    output_config: {
      format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> },
    },
    messages: [{ role: "user", content: prompt }],
  });
  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return (JSON.parse(sanitise(text)) as { questions?: Drafted[] }).questions ?? [];
}

async function draftGemini(prompt: string): Promise<Drafted[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  // Pinned Gemini versions get retired and 404 for newer keys; the -latest
  // alias keeps this working without a code change. Same reasoning as
  // lib/scan-providers.ts.
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${SYSTEM}\n\n${SHAPE}` }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
      }),
    }
  );
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("empty response");
  return (JSON.parse(sanitise(text)) as { questions?: Drafted[] }).questions ?? [];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Gemini's free tier rate-limits hard and returns 503 under load, and a bulk
 * seed walks straight into both. Retrying with a widening gap turns a run that
 * dies at chapter three into one that finishes slowly, which is the right
 * trade for an offline job.
 */
async function draft(prompt: string): Promise<Drafted[]> {
  const call = () =>
    PROVIDER === "anthropic" ? draftAnthropic(prompt) : draftGemini(prompt);

  let wait = 6000;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const out = await call();
      // Pace the next call so the quota is not spent faster than it refills.
      await sleep(PACE_MS);
      return out;
    } catch (err) {
      const message = (err as Error).message;
      const transient = /(429|503|500|529)|UNAVAILABLE|high demand|quota/i.test(message);
      if (!transient || attempt === 3) throw err;
      process.stdout.write(`    retrying in ${Math.round(wait / 1000)}s... `);
      await sleep(wait);
      wait *= 2.5;
    }
  }
  return [];
}

/** Rules a drafted question must pass before it is allowed near a teacher. */
function usable(q: Drafted, type: string): string | null {
  if (!q.text?.trim()) return "empty text";
  if (!q.answer?.trim()) return "empty answer";
  if (q.text.length > 600) return "too long";
  if (/^Q\s*\d|^\d+\s*[.)]/.test(q.text.trim())) return "carries a question number";
  if (/\bfigure\b|\bdiagram\b|\bgiven graph\b/i.test(q.text)) return "needs a figure";
  if (type === "mcq") {
    if (!q.options || q.options.length !== 4) return "mcq needs exactly 4 options";
    if (new Set(q.options).size !== 4) return "duplicate options";
    if (!q.options.some((o) => o.trim() === q.answer.trim())) return "answer not among options";
    if (q.options.some((o) => /all of the above|none of these/i.test(o))) return "lazy option";
  }
  return null;
}

interface Target {
  board: string | null;
  class: number;
  subject: string;
  skill_id: string | null;
  chapter: string | null;
  topic: string;
  prompt: string;
}

function targetsForGaps(limit: number): Target[] {
  // Skills the templates cannot generate — anything whose answer is not
  // arithmetic. These are what makes a Class 1-8 paper feel thin today.
  const out: Target[] = [];
  for (const s of SKILLS) {
    if (TEMPLATES_BY_SKILL[s.id]?.length) continue;
    out.push({
      board: null,
      class: s.typicalClass,
      subject: "maths",
      skill_id: s.id,
      chapter: null,
      topic: s.statement,
      prompt: `Class ${s.typicalClass} maths, Indian school.\nSkill: ${s.statement}\n\nWrite ${PER_CALL} questions testing exactly this skill and nothing harder.`,
    });
    if (out.length >= limit) break;
  }
  return out;
}

function targetsForChapters(
  board?: string,
  cls?: number,
  subject?: string,
  limit = Infinity
): Target[] {
  const out: Target[] = [];
  for (const set of CHAPTERS) {
    if (board && set.board !== board) continue;
    if (cls && set.class !== cls) continue;
    if (subject && set.subject !== subject) continue;
    for (const chapter of set.chapters) {
      out.push({
        board: set.board,
        class: set.class,
        subject: set.subject,
        skill_id: null,
        chapter,
        topic: chapter,
        prompt: `Class ${set.class} ${set.subject}, ${set.board === "cbse" ? "CBSE" : "Maharashtra State Board"}, from ${set.book}.\nChapter: ${chapter}\n\nWrite ${PER_CALL} questions from this chapter only.`,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

async function run() {
  const limit = Number(flag("limit") ?? 9999);
  const targets = has("gaps")
    ? targetsForGaps(limit)
    : targetsForChapters(flag("board"), Number(flag("class")) || undefined, flag("subject"), limit);

  if (!targets.length) {
    console.error("nothing matched those filters");
    process.exit(1);
  }

  console.log(`${targets.length} target(s), ${PER_CALL} per type, via ${PROVIDER}\n`);
  let inserted = 0;
  let rejected = 0;
  let duplicate = 0;

  for (const [n, target] of targets.entries()) {
    const types = TYPES_BY_CLASS(target.class);
    for (const { type, marks } of types) {
      const prompt = `${target.prompt}\n\nQuestion type: ${type}\nGive a mix of easy, medium and hard.`;
      let drafted: Drafted[] = [];
      try {
        drafted = await draft(prompt);
      } catch (err) {
        console.error(`  ! ${target.topic} [${type}] — ${(err as Error).message}`);
        continue;
      }

      const rows = [];
      for (const q of drafted) {
        const bad = usable(q, type);
        if (bad) {
          rejected++;
          continue;
        }
        rows.push({
          board: target.board,
          class: target.class,
          subject: target.subject,
          skill_id: target.skill_id,
          chapter: target.chapter,
          topic: target.topic,
          question_type: type,
          difficulty: q.difficulty,
          marks,
          body: { text: q.text.trim(), ...(q.options ? { options: q.options } : {}) },
          answer: q.answer.trim(),
          explanation: q.explanation?.trim() ?? null,
          language: "english",
          provenance: "llm",
          review_state: "machine-checked",
        });
      }

      if (!rows.length) continue;
      // ignoreDuplicates leans on the dedupe index, which is what makes a
      // re-run cheap instead of destructive.
      const { data, error } = await db
        .from("bank_items")
        .upsert(rows, { onConflict: "subject,class,question_type,md5", ignoreDuplicates: true })
        .select("id");
      if (error) {
        // The unique index has an expression in it, so PostgREST cannot name it
        // as an onConflict target. Fall back to inserting and swallowing dupes.
        const res = await db.from("bank_items").insert(rows).select("id");
        if (res.error) {
          if (res.error.code === "23505") duplicate += rows.length;
          else console.error(`  ! insert failed: ${res.error.message}`);
        } else inserted += res.data?.length ?? 0;
      } else {
        inserted += data?.length ?? 0;
        duplicate += rows.length - (data?.length ?? 0);
      }
    }
    console.log(
      `[${n + 1}/${targets.length}] ${target.topic} — ${inserted} in, ${rejected} rejected, ${duplicate} dupes`
    );
  }

  console.log(`\ndone: ${inserted} inserted, ${rejected} rejected by rules, ${duplicate} already present`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
