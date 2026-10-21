// Manual end-to-end check of the question-bank feature against a live provider.
//
//   npx tsx --env-file=.env.local scripts/test-question-gen.mts
//
// Exercises the two pieces that carry real risk:
//   1. AI generation — the prompt, the provider call, and the normaliser that
//      turns provider JSON into Question objects the builder can render.
//   2. The rotation picker — that repeated papers on one unit differ, and that
//      least-used questions win.
//
// Auth and credit metering are not covered here; those mirror /api/scan, which
// is already in production.

import { generateQuestions } from "../lib/scan-providers";
import { scannedToQuestions, type ScannedPaper } from "../lib/scan";
import { pickQuestions, type BankItem } from "../lib/question-bank";
import type { Question } from "../lib/types";

const line = (s = "") => console.log(s);
const rule = (t: string) =>
  line(`\n${"=".repeat(64)}\n${t}\n${"=".repeat(64)}`);

function showQuestion(q: Question, i: number) {
  line(`\n  ${i + 1}. [${q.type}] ${q.marks} mark(s)`);
  line(`     "${q.title}"`);
  if (q.passage) line(`     passage: ${q.passage.slice(0, 90)}…`);
  if (q.matchLeft?.length) {
    q.matchLeft.forEach((l, j) => line(`       ${l}  →  ${q.matchRight?.[j] ?? "?"}`));
  }
  q.items.slice(0, 4).forEach((it) => {
    if (it.num1 || it.num2) {
      line(`       ${it.num1} ${q.operation ?? "?"} ${it.num2}`);
    } else {
      line(`       - ${it.content}`);
      if (it.options?.length) line(`         options: ${it.options.join(" | ")}`);
    }
  });
  if (q.items.length > 4) line(`       …and ${q.items.length - 4} more`);
}

async function testGeneration() {
  rule("1. AI GENERATION  (provider: " + (process.env.SCAN_PROVIDER ?? "anthropic") + ")");

  const brief = {
    subject: "Mathematics",
    className: "4",
    unitName: "Unit 3 — Multiplication and Division",
    bookName: "NCERT Math-Magic Class 4",
    marks: 20,
  };
  line(`Brief: ${brief.subject} · Class ${brief.className}`);
  line(`Unit:  ${brief.unitName}`);
  line(`Book:  ${brief.bookName}`);
  line(`Target: ${brief.marks} marks, no photos\n`);

  const t0 = Date.now();
  const res = await generateQuestions(brief, [], process.env.SCAN_MODEL || "claude-sonnet-4-6");
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  if (res.error || !res.raw) {
    line(`FAIL (${secs}s): ${res.error}`);
    return null;
  }

  let parsed: ScannedPaper;
  try {
    parsed = JSON.parse(res.raw);
  } catch {
    line(`FAIL: provider returned non-JSON:\n${res.raw.slice(0, 400)}`);
    return null;
  }

  const questions = scannedToQuestions(parsed.questions ?? []);
  const total = questions.reduce((n, q) => n + q.marks, 0);

  line(`OK (${secs}s) — ${questions.length} questions, ${total} marks (asked for ${brief.marks})`);
  questions.forEach(showQuestion);

  // The things that break the builder if the model misbehaves.
  rule("1b. NORMALISER CHECKS");
  const checks: Array<[string, boolean, string]> = [
    ["every question has an id", questions.every((q) => !!q.id), ""],
    ["ids are unique", new Set(questions.map((q) => q.id)).size === questions.length, ""],
    ["every question has a type", questions.every((q) => !!q.type), ""],
    ["marks are positive numbers", questions.every((q) => q.marks > 0), ""],
    ["items is always an array", questions.every((q) => Array.isArray(q.items)), ""],
    [
      "no leading question numbers left in titles",
      questions.every((q) => !/^\s*(Q\s*\.?\s*)?\d+\s*[.)]/i.test(q.title)),
      questions.find((q) => /^\s*(Q\s*\.?\s*)?\d+\s*[.)]/i.test(q.title))?.title ?? "",
    ],
    [
      "no leading labels left in items",
      questions.every((q) => q.items.every((it) => !/^\s*\(?[a-z]\)\s/i.test(it.content))),
      "",
    ],
    [
      "mcq items carry options",
      questions.filter((q) => q.type === "mcq").every((q) => q.items.every((it) => (it.options?.length ?? 0) >= 2)),
      "",
    ],
    [
      "match pairs are balanced",
      questions
        .filter((q) => q.type === "match")
        .every((q) => (q.matchLeft?.length ?? 0) === (q.matchRight?.length ?? 0)),
      "",
    ],
    ["marks within 40% of target", Math.abs(total - brief.marks) <= brief.marks * 0.4, `got ${total}`],
  ];
  let failed = 0;
  for (const [name, ok, detail] of checks) {
    line(`  ${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? ` — ${detail}` : ""}`);
    if (!ok) failed++;
  }
  line(`\n  ${checks.length - failed}/${checks.length} checks passed`);
  return questions;
}

function fakeItem(id: string, marks: number, timesUsed: number): BankItem {
  return {
    id,
    title: `Question ${id}`,
    type: "short-answer",
    subject: null,
    class_name: null,
    topic: null,
    subject_id: "s1",
    unit_id: "u1",
    marks,
    enabled: true,
    source: "manual",
    times_used: timesUsed,
    last_used_at: null,
    payload: { id, type: "short-answer", title: `Question ${id}`, marks, items: [] },
    created_at: new Date(0).toISOString(),
  };
}

function testRotation() {
  rule("2. ROTATION PICKER");

  // 12 questions worth 5 marks each, all unused.
  const pool = Array.from({ length: 12 }, (_, i) => fakeItem(`q${i + 1}`, 5, 0));

  const a = pickQuestions(pool, { unitIds: ["u1"], targetMarks: 20 });
  const b = pickQuestions(pool, { unitIds: ["u1"], targetMarks: 20 });
  line(`Paper A: ${a.items.map((i) => i.id).join(", ")}  (${a.marks} marks)`);
  line(`Paper B: ${b.items.map((i) => i.id).join(", ")}  (${b.marks} marks)`);

  const sameOrder = a.items.map((i) => i.id).join() === b.items.map((i) => i.id).join();

  // Now simulate paper A having been built: those four are used once.
  const usedIds = new Set(a.items.map((i) => i.id));
  const after = pool.map((q) =>
    usedIds.has(q.id) ? { ...q, times_used: 1 } : q
  );
  const c = pickQuestions(after, { unitIds: ["u1"], targetMarks: 20 });
  const reused = c.items.filter((i) => usedIds.has(i.id)).length;
  line(`Paper C (after A was used): ${c.items.map((i) => i.id).join(", ")}`);

  // Exhaust the fresh ones, then confirm used questions come back rather than
  // the picker returning short.
  const allUsedOnce = pool.map((q) => ({ ...q, times_used: 1 }));
  allUsedOnce[0].times_used = 0;
  const d = pickQuestions(allUsedOnce, { unitIds: ["u1"], targetMarks: 20 });

  const disabled = pool.map((q, i) => (i < 10 ? { ...q, enabled: false } : q));
  const e = pickQuestions(disabled, { unitIds: ["u1"], targetMarks: 20 });

  const mixed = [fakeItem("big", 10, 0), fakeItem("small1", 2, 0), fakeItem("small2", 2, 0)];
  const f = pickQuestions(mixed, { unitIds: ["u1"], targetMarks: 4 });

  const checks: Array<[string, boolean, string]> = [
    ["hits the marks target", a.marks === 20 && !a.short, `${a.marks}`],
    ["two picks from the same unit differ", !sameOrder, "same order both times"],
    ["avoids questions used in paper A", reused === 0, `${reused} reused`],
    ["falls back to used questions when fresh run out", d.marks === 20 && !d.short, `${d.marks}`],
    ["least-used question is picked first", d.items[0]?.id === "q1", d.items[0]?.id ?? "none"],
    ["skips disabled questions", e.items.every((i) => i.enabled), ""],
    ["reports short when the unit can't cover the target", e.short, ""],
    ["prefers small questions over overshooting", f.marks === 4 && !f.items.some((i) => i.id === "big"), `${f.marks}`],
  ];
  line("");
  let failed = 0;
  for (const [name, ok, detail] of checks) {
    line(`  ${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? ` — ${detail}` : ""}`);
    if (!ok) failed++;
  }
  line(`\n  ${checks.length - failed}/${checks.length} checks passed`);
}

testRotation();
await testGeneration();
line("");
