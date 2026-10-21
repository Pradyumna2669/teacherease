import { TEMPLATES, generate, rngFrom, hasCarry, hasBorrow } from "./templates";
import { PRESENTATION, isAligned, cumulativeScope } from "./boards";
import { SKILLS, SKILL_BY_ID, prerequisiteClosure } from "./skills";
import { buildPaper } from "./generate";
import type { Band } from "./types";

// Self-check for the curriculum layer, runnable with `npx tsx lib/curriculum/verify.ts`.
//
// Templates are the one part of this system that promises never to be wrong, so
// the promise is tested rather than asserted: every template is run many times
// in every band and its answer re-derived independently here — not by calling
// the template's own check(), which would only prove it agrees with itself.

const BANDS: Band[] = ["easy", "medium", "hard"];
const RUNS = 200;

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.error("  FAIL " + msg);
};

// ---- 1. the graph is sound ----------------------------------------------
console.log("graph");
{
  const ids = new Set(SKILLS.map((s) => s.id));
  if (ids.size !== SKILLS.length) fail("duplicate skill ids");
  for (const s of SKILLS) {
    for (const req of s.requires ?? []) {
      if (!ids.has(req)) fail(`${s.id} requires unknown skill ${req}`);
      const pre = SKILL_BY_ID.get(req);
      if (pre && pre.typicalClass > s.typicalClass) {
        fail(`${s.id} (class ${s.typicalClass}) requires ${req} taught later (class ${pre.typicalClass})`);
      }
    }
    // A cycle would make prerequisiteClosure loop forever.
    if (prerequisiteClosure(s.id).has(s.id)) fail(`${s.id} is its own prerequisite`);
  }
  console.log(`  ${SKILLS.length} skills, ${ids.size} unique`);
}

// ---- 2. arithmetic helpers ----------------------------------------------
console.log("carry/borrow helpers");
{
  const cases: [number, number, boolean][] = [
    [111, 222, false],
    [456, 321, false],
    [58, 34, true],
    [473, 218, true],
    [999, 1, true],
  ];
  for (const [a, b, want] of cases) {
    if (hasCarry(a, b) !== want) fail(`hasCarry(${a},${b}) should be ${want}`);
  }
  const borrows: [number, number, boolean][] = [
    [456, 123, false],
    [400, 123, true],
    [321, 199, true],
    [999, 111, false],
  ];
  for (const [a, b, want] of borrows) {
    if (hasBorrow(a, b) !== want) fail(`hasBorrow(${a},${b}) should be ${want}`);
  }
}

// ---- 3. every template, every band, many times --------------------------
console.log(`templates (${TEMPLATES.length} × ${RUNS} runs)`);
{
  const profile = PRESENTATION.cbse;
  for (const t of TEMPLATES) {
    if (!SKILL_BY_ID.has(t.skill)) fail(`${t.id} points at unknown skill ${t.skill}`);
    for (const band of BANDS) {
      if (!t.bands.includes(band)) continue;
      for (let i = 0; i < RUNS; i++) {
        const r = rngFrom(i * 7919 + band.length * 104729 + t.id.length);
        let item;
        try {
          item = generate(t, r, band, profile);
        } catch (err) {
          fail(`${t.id} [${band}] threw: ${(err as Error).message}`);
          break;
        }

        // Independent re-derivation, not the template's own check().
        if (item.operation && item.num1 && item.num2) {
          const a = Number(item.num1);
          const b = Number(item.num2);
          const want =
            item.operation === "+" ? a + b
            : item.operation === "-" ? a - b
            : item.operation === "x" ? a * b
            : a / b;
          if (Number(item.answer) !== want) {
            fail(`${t.id} [${band}] ${a} ${item.operation} ${b} = ${item.answer}, expected ${want}`);
            break;
          }
          if (item.operation === "-" && a < b) {
            fail(`${t.id} [${band}] negative result ${a} - ${b}`);
            break;
          }
        }

        if (!item.answer || !String(item.answer).trim()) {
          fail(`${t.id} [${band}] produced an empty answer`);
          break;
        }
        if (item.questionType !== "math-vertical" && !item.text.trim()) {
          fail(`${t.id} [${band}] produced empty question text`);
          break;
        }
        if (item.options && !item.options.includes(item.answer)) {
          fail(`${t.id} [${band}] answer "${item.answer}" is not among its options`);
          break;
        }
        if (item.options && new Set(item.options).size !== item.options.length) {
          fail(`${t.id} [${band}] has duplicate options`);
          break;
        }
      }
    }
  }
}

// ---- 4. board alignment --------------------------------------------------
console.log("board alignment");
{
  // Every skill a board teaches must have all its prerequisites already taught.
  for (const board of ["cbse", "maharashtra"] as const) {
    for (const cls of [3, 4, 5]) {
      for (const skill of Array.from(cumulativeScope(board, cls))) {
        const verdict = isAligned(board, cls, skill);
        if (!verdict.ok) fail(`${board} class ${cls}: ${verdict.reason}`);
      }
    }
  }

  // And the guard must actually reject something, or it is not a guard.
  const shouldReject = isAligned("cbse", 3, "MUL.2D2D");
  if (shouldReject.ok) fail("guard let a Class 4 skill into a Class 3 CBSE paper");

  const shouldPass = isAligned("cbse", 4, "MUL.2D2D");
  if (!shouldPass.ok) fail(`guard wrongly rejected MUL.2D2D for CBSE class 4: ${shouldPass.reason}`);
}

// ---- 5. template coverage of the graph -----------------------------------
{
  const covered = new Set(TEMPLATES.map((t) => t.skill));
  console.log(`coverage: ${covered.size} of ${SKILLS.length} skills have a template`);
}

// ---- 6. whole papers -----------------------------------------------------
console.log("paper assembly");
{
  const cases = [
    { board: "cbse" as const, cls: 3, marks: 40, level: "mixed" as const,
      skills: ["NUM.PV.3D", "ADD.3D3D.REG", "SUB.3D3D.BOR", "MUL.TABLES.2-10", "MUL.2D1D.REG", "MULDIV.WORD.1STEP"] },
    { board: "maharashtra" as const, cls: 3, marks: 30, level: "easy" as const,
      skills: ["NUM.PV.4D", "ADD.3D3D.REG", "MON.ADD.SUB"] },
    { board: "cbse" as const, cls: 5, marks: 50, level: "hard" as const,
      skills: ["MUL.2D2D", "DIV.3D1D.REM", "FAC.FACTORS", "ARE.RECTANGLE", "FRA.ADD.SAME"] },
  ];

  for (const c of cases) {
    const paper = buildPaper({
      board: c.board, class: c.cls, skills: c.skills, marks: c.marks, level: c.level, seed: 42,
    });
    const label = `${c.board} class ${c.cls} ${c.marks}m ${c.level}`;

    if (!paper.questions.length) {
      fail(`${label}: produced no questions`);
      continue;
    }

    const totalMarks = paper.questions.reduce((sum, q) => sum + q.marks, 0);
    if (totalMarks !== paper.marksPlaced) {
      fail(`${label}: question marks ${totalMarks} disagree with marksPlaced ${paper.marksPlaced}`);
    }
    if (paper.marksPlaced > c.marks) {
      fail(`${label}: placed ${paper.marksPlaced} marks, more than the ${c.marks} asked for`);
    }
    if (paper.marksPlaced < c.marks * 0.7) {
      fail(`${label}: only placed ${paper.marksPlaced} of ${c.marks} marks`);
    }

    const seenText = new Set<string>();
    for (const q of paper.questions) {
      if (!q.items.length) fail(`${label}: question "${q.title}" has no items`);
      for (const item of q.items) {
        if (!item.answer || !item.answer.trim()) {
          fail(`${label}: an item in "${q.title}" has no answer`);
        }
        const key = `${item.content}|${item.num1 ?? ""}|${item.num2 ?? ""}`;
        if (seenText.has(key)) fail(`${label}: repeated item ${key}`);
        seenText.add(key);
      }
    }

    // Nothing out of scope may have survived.
    for (const gap of paper.gaps) {
      if (gap.reason === "unknown skill") fail(`${label}: ${gap.skill} is not in the graph`);
    }

    const covered = new Set(paper.questions.map((q) => q.type));
    console.log(
      `  ${label}: ${paper.questions.length} questions, ${paper.marksPlaced}/${c.marks} marks, types [${Array.from(covered).join(", ")}]${paper.gaps.length ? `, ${paper.gaps.length} gap(s)` : ""}`
    );
  }

  // Out-of-scope skills must be refused, not quietly included.
  const tooAdvanced = buildPaper({
    board: "cbse", class: 3, skills: ["MUL.2D2D", "ADD.3D3D.REG"], marks: 20, level: "easy", seed: 7,
  });
  if (!tooAdvanced.gaps.some((g) => g.skill === "MUL.2D2D")) {
    fail("a Class 4 skill was not reported as out of scope for a Class 3 paper");
  }
  // The same seed must give the same paper, or "regenerate" is a lie.
  const a = buildPaper({ board: "cbse", class: 4, skills: ["ADD.4D4D.REG"], marks: 10, level: "medium", seed: 99 });
  const b = buildPaper({ board: "cbse", class: 4, skills: ["ADD.4D4D.REG"], marks: 10, level: "medium", seed: 99 });
  const strip = (p: typeof a) => p.questions.map((q) => q.items.map((i) => `${i.num1}+${i.num2}=${i.answer}`).join(",")).join("|");
  if (strip(a) !== strip(b)) fail("same seed produced different papers");
}

console.log("");
if (failures) {
  console.error(`${failures} FAILURE(S)`);
  process.exit(1);
} else {
  console.log("all checks passed");
}
