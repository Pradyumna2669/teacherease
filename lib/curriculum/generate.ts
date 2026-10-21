import type { Question, SubItem, PaperLanguage } from "@/lib/types";
import { titlesFor } from "@/lib/languages";
import { isAligned, PRESENTATION } from "./boards";
import { SKILL_BY_ID } from "./skills";
import {
  TEMPLATES_BY_SKILL,
  generate,
  rngFrom,
  withNumericOptions,
  type GeneratedItem,
  type Rng,
} from "./templates";
import type { BankItem } from "./bank";
import type { Band, BoardId } from "./types";

// Assembling a paper from the skill graph.
//
// Everything here is rules — no model is called. The pipeline resolves skills,
// drops anything the board has not taught yet, works out a blueprint from the
// marks, pulls items from templates, and hands back the builder's own
// Question[] so a generated paper is editable exactly like a scanned one.
//
// A skill with no template simply yields nothing today. It is reported back
// rather than silently dropped, because "we could not cover division" is
// information the teacher needs and a shorter paper is not.

export interface PaperRequest {
  board: BoardId;
  class: number;
  /** Skills the teacher has taught. Usually her coverage list. */
  skills: string[];
  marks: number;
  level: Band | "mixed";
  language?: PaperLanguage;
  /** Same seed, same paper. Omit for a fresh one each time. */
  seed?: number;
  /**
   * Curated questions fetched for this request. Used for skills no template can
   * generate — anything whose answer is not arithmetic — and for Classes 9-12,
   * where the bank is the whole engine.
   */
  bankItems?: BankItem[];
}

export interface PaperResult {
  questions: Question[];
  /** Marks actually placed, which can fall short of what was asked. */
  marksPlaced: number;
  /** Skills that were asked for but produced nothing, and why. */
  gaps: { skill: string; reason: string }[];
}

/** What one item of each type is worth. Keeps the blueprint arithmetic honest. */
const MARKS_PER_ITEM: Record<string, number> = {
  "fill-blanks": 1,
  "math-vertical": 1,
  mcq: 1,
  "true-false": 1,
  "short-answer": 2,
  "word-problem": 2,
  "long-answer": 5,
  match: 4,
  "assertion-reason": 1,
  "case-study": 4,
};

const marksFor = (type: string) => MARKS_PER_ITEM[type] ?? 1;

/** The shape of a real school paper: most pupils pass, a few questions stretch. */
const MIXED_SPLIT: [Band, number][] = [
  ["easy", 0.3],
  ["medium", 0.5],
  ["hard", 0.2],
];

function bandFor(level: Band | "mixed", index: number, total: number): Band {
  if (level !== "mixed") return level;
  const position = total <= 1 ? 0 : index / total;
  let acc = 0;
  for (const [band, share] of MIXED_SPLIT) {
    acc += share;
    if (position < acc) return band;
  }
  return "hard";
}

let counter = 0;
const nextId = () => `g${(counter++).toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`;

/**
 * Share the marks across the skills she picked.
 *
 * Deliberately even rather than weighted: a teacher who ticks six topics
 * expects to see all six, and a weighting she cannot see would look like the
 * system ignoring her.
 */
function blueprint(skills: string[], marks: number): Map<string, number> {
  const out = new Map<string, number>();
  if (!skills.length) return out;
  const per = Math.max(2, Math.floor(marks / skills.length));
  let left = marks;
  for (const skill of skills) {
    if (left <= 0) break;
    const give = Math.min(per, left);
    out.set(skill, give);
    left -= give;
  }
  // Anything left over from rounding goes back to the first skills.
  let i = 0;
  const ordered = Array.from(out.keys());
  while (left > 0 && ordered.length) {
    const skill = ordered[i % ordered.length];
    out.set(skill, (out.get(skill) ?? 0) + 1);
    left--;
    i++;
  }
  return out;
}

/**
 * Column arithmetic all shares one question type, so three sections of it would
 * otherwise print as "Solve the following" three times over. A teacher writing
 * this paper by hand would head them Add, Subtract, Multiply — so do that.
 *
 * Only the languages with translated paper copy are listed; anything else falls
 * back to the generic title for its type, which is still correct, just less
 * specific.
 */
const OPERATION_TITLES: Partial<
  Record<PaperLanguage, Record<string, string>>
> = {
  english: {
    "+": "Add the following:",
    "-": "Subtract the following:",
    x: "Multiply the following:",
    "÷": "Divide the following:",
  },
  hindi: {
    "+": "जोड़ कीजिए:",
    "-": "घटाइए:",
    x: "गुणा कीजिए:",
    "÷": "भाग दीजिए:",
  },
  marathi: {
    "+": "बेरीज करा:",
    "-": "वजाबाकी करा:",
    x: "गुणाकार करा:",
    "÷": "भागाकार करा:",
  },
};

/**
 * Group generated items into the builder's questions.
 *
 * One question per skill and type, which gives the 5-8 mark sections a real
 * paper has. Grouping purely by type was tried and produced a single 20-mark
 * "Fill in the blanks", which is no more like a real paper than three of them
 * in a row.
 *
 * Repeated headings are solved at the source instead: a template says what it
 * is asking ("Find the simple interest:"), so two skills sharing a question
 * type still read as two different instructions.
 */
function toQuestions(
  items: GeneratedItem[],
  language: PaperLanguage
): Question[] {
  const titles = titlesFor(language);
  const groups = new Map<string, GeneratedItem[]>();
  for (const item of items) {
    const key = `${item.skill}|${item.questionType}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(item);
  }

  const questions: Question[] = [];
  for (const group of Array.from(groups.values())) {
    const first = group[0];
    const type = first.questionType;

    const subItems: SubItem[] = group.map((g) => ({
      id: nextId(),
      content: g.text,
      answer: g.answer,
      ...(g.options ? { options: g.options } : {}),
      ...(g.num1 ? { num1: g.num1 } : {}),
      ...(g.num2 ? { num2: g.num2 } : {}),
      ...(type === "short-answer" || type === "word-problem" ? { lines: 2 } : {}),
    }));

    // Operation wins for column arithmetic (and is translated); otherwise the
    // template's own instruction; otherwise the generic one for the type.
    const title =
      (first.operation && OPERATION_TITLES[language]?.[first.operation]) ||
      (language === "english" && first.title) ||
      titles[type];

    questions.push({
      id: nextId(),
      type,
      title,
      marks: group.reduce((sum, g) => sum + marksFor(g.questionType), 0),
      items: subItems,
      columnsPerRow: type === "math-vertical" ? 4 : type === "mcq" ? 2 : 1,
      ...(first.operation ? { operation: first.operation } : {}),
    } as Question);
  }

  // Bare computation first, reading-heavy questions last — the order a teacher
  // writes a paper in, and the order a child can work through it.
  const weight = (q: Question) =>
    q.type === "math-vertical" ? 0 : q.type === "fill-blanks" ? 1 : q.type === "mcq" ? 2 : 3;
  return questions.sort((a, b) => weight(a) - weight(b));
}

/**
 * A bank row in the shape the assembler already works with, so curated and
 * generated questions flow through one path and print identically.
 */
function fromBank(item: BankItem): GeneratedItem {
  return {
    skill: item.skill_id ?? item.chapter ?? "bank",
    templateId: `bank:${item.id}`,
    questionType: item.question_type,
    text: item.body?.text ?? "",
    answer: item.answer,
    ...(item.body?.options ? { options: item.body.options } : {}),
    load: {
      steps: 1,
      regrouping: 0,
      magnitude: 1,
      reading: 1,
      transfer: 1,
      distractors: item.body?.options ? 2 : 0,
    },
    band: item.difficulty,
  };
}

export function buildPaper(req: PaperRequest): PaperResult {
  const language = req.language ?? "english";
  const profile = PRESENTATION[req.board];
  const r: Rng = rngFrom(req.seed ?? Math.floor(Math.random() * 2 ** 31));
  const gaps: PaperResult["gaps"] = [];

  // Bank rows indexed by whatever placed them: a skill for Classes 1-8, a
  // chapter for 9-12.
  const bankBySkill = new Map<string, BankItem[]>();
  for (const item of req.bankItems ?? []) {
    const key = item.skill_id ?? item.chapter;
    if (!key) continue;
    const bucket = bankBySkill.get(key);
    if (bucket) bucket.push(item);
    else bankBySkill.set(key, [item]);
  }

  // 1 · scope — drop anything this board has not taught by this class.
  const usable: string[] = [];
  for (const skill of req.skills) {
    if (!SKILL_BY_ID.has(skill)) {
      gaps.push({ skill, reason: "unknown skill" });
      continue;
    }
    const verdict = isAligned(req.board, req.class, skill);
    if (!verdict.ok) {
      gaps.push({ skill, reason: verdict.reason });
      continue;
    }
    if (!TEMPLATES_BY_SKILL[skill]?.length && !bankBySkill.has(skill)) {
      gaps.push({ skill, reason: "no questions for this skill yet" });
      continue;
    }
    usable.push(skill);
  }

  // 2 · blueprint — marks per skill.
  const plan = blueprint(usable, req.marks);

  // 3 · generate.
  const items: GeneratedItem[] = [];
  const usedBank = new Set<string>();
  let placed = 0;
  let index = 0;
  const totalSlots = Array.from(plan.values()).reduce((a, b) => a + b, 0);

  for (const [skill, skillMarks] of Array.from(plan.entries())) {
    const templates = TEMPLATES_BY_SKILL[skill];
    let remaining = skillMarks;
    let guard = 0;

    // Curated questions first: they are the only source for a skill without a
    // template, and they read better than a generated one where both exist.
    const pool = (bankBySkill.get(skill) ?? []).filter((b) => !usedBank.has(b.id));
    while (remaining > 0 && pool.length && (!templates?.length || r() < 0.5)) {
      const picked = pool.splice(Math.floor(r() * pool.length), 1)[0];
      usedBank.add(picked.id);
      const item = fromBank(picked);
      const cost = picked.marks || marksFor(item.questionType);
      if (cost > remaining && remaining < 2) break;
      if (items.some((x) => x.text === item.text)) continue;
      items.push(item);
      remaining -= cost;
      placed += cost;
      index++;
    }

    if (!templates?.length) continue;

    while (remaining > 0 && guard++ < 40) {
      const template = templates[Math.floor(r() * templates.length)];
      const band = bandFor(req.level, index, totalSlots);
      const cost = marksFor(template.questionType);
      if (cost > remaining && remaining < 2) break;

      let item: GeneratedItem;
      try {
        item = generate(template, r, band, profile);
      } catch {
        // A template that cannot satisfy its own check is a bug, but it must
        // not take the whole paper down with it.
        gaps.push({ skill, reason: `template ${template.id} failed` });
        break;
      }

      // Keep a paper from repeating itself word for word.
      const duplicate = items.some(
        (x) => x.text === item.text && x.num1 === item.num1 && x.num2 === item.num2
      );
      if (duplicate) continue;

      items.push(item);
      remaining -= cost;
      placed += cost;
      index++;
    }
  }

  return { questions: toQuestions(items, language), marksPlaced: placed, gaps };
}

/** Turn a numeric item into a multiple-choice one, for variety in the mix. */
export function asMcq(item: GeneratedItem, seed: number): GeneratedItem {
  return withNumericOptions(item, rngFrom(seed));
}
