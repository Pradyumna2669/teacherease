// Scan accuracy against a paper rendered in a handwriting font, scored against
// known ground truth.
//
//   npx tsx --env-file=.env.local scripts/test-scan-accuracy.mts
//
// A handwriting FONT is not real handwriting — letterforms are consistent in a
// way a child's or a rushed teacher's are not. This catches prompt regressions
// and digit-level mistakes; it does not prove accuracy on a real photo. Only
// scans from actual papers do that.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractPaper, type ScanImage } from "../lib/scan-providers";
import { type ScannedPaper } from "../lib/scan";

const HAND = `"Segoe Script", "Ink Free", "Segoe Print", cursive`;

// Ground truth. Digits chosen to include the pairs handwriting confuses:
// 1/7, 0/6, 5/S, 9/g, and four-digit numbers whose length must survive.
const TRUTH = {
  fillBlanks: ["7 × 8 = ___", "There are ___ days in a week.", "The place value of 9 in 1970 is ___."],
  mcqStem: "Which of these is an even number?",
  mcqOptions: ["17", "26", "39", "45"],
  sums: [
    ["5994", "519", "438"],
    ["7561", "3459"],
  ],
  matchLeft: ["Cow", "Hen", "Bee"],
  matchRight: ["Milk", "Egg", "Honey"],
};

const PAGE = `<div style="width:1000px;min-height:1400px;background:#fffdf8;padding:60px;font-family:${HAND};font-size:27px;line-height:1.9;color:#1a1a2e">
  <div style="text-align:center;font-size:32px">Sunrise Public School</div>
  <div style="text-align:center;font-size:26px">Unit Test — Maths — Class 4</div>
  <hr/>
  <p><b>Q.1) Fill in the blanks:</b> <span style="float:right">(3M)</span></p>
  <div style="margin-left:34px">
    a) 7 &times; 8 = ________<br/>
    b) There are ________ days in a week.<br/>
    c) The place value of 9 in 1970 is ________.
  </div>
  <p><b>Q.2) Choose the correct answer:</b> <span style="float:right">(1M)</span></p>
  <div style="margin-left:34px">
    a) Which of these is an even number?<br/>
    &nbsp;&nbsp; (i) 17 &nbsp;&nbsp; (ii) 26 &nbsp;&nbsp; (iii) 39 &nbsp;&nbsp; (iv) 45
  </div>
  <p><b>Q.3) Add:</b> <span style="float:right">(2M)</span></p>
  <div style="margin-left:34px;display:flex;gap:120px">
    <div>1)<br/>
      <div style="text-align:right;width:150px">5994</div>
      <div style="text-align:right;width:150px">519</div>
      <div style="text-align:right;width:150px;border-bottom:2px solid #1a1a2e">+&nbsp;&nbsp;&nbsp; 438</div>
    </div>
    <div>2)<br/>
      <div style="text-align:right;width:150px">7561</div>
      <div style="text-align:right;width:150px;border-bottom:2px solid #1a1a2e">&minus;&nbsp;&nbsp; 3459</div>
    </div>
  </div>
  <p><b>Q.4) Match the following:</b> <span style="float:right">(3M)</span></p>
  <div style="margin-left:34px">
    1) Cow &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Milk<br/>
    2) Hen &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Egg<br/>
    3) Bee &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Honey
  </div>
</div>`;

function renderPage(): ScanImage[] {
  const dir = mkdtempSync(join(tmpdir(), "pg-hand-"));
  const comp = join(dir, "p.tsx");
  const entry = join(dir, "e.ts");
  const png = join(dir, "p.png");
  writeFileSync(
    comp,
    `import React from "react";
import {AbsoluteFill, Composition} from "remotion";
const P: React.FC = () => (<AbsoluteFill style={{background:"#fffdf8"}}>
  <div dangerouslySetInnerHTML={{__html: ${JSON.stringify(PAGE)}}} /></AbsoluteFill>);
export const Root: React.FC = () => (<Composition id="P" component={P} durationInFrames={1} fps={1} width={1000} height={1400} />);`
  );
  writeFileSync(entry, `import {registerRoot} from "remotion";\nimport {Root} from "./p";\nregisterRoot(Root);`);
  execFileSync("npx", ["remotion", "still", entry, "P", png, "--frame=0"], {
    cwd: join(process.cwd(), "promo"),
    stdio: "pipe",
    shell: true,
  });
  return [{ mediaType: "image/png", data: readFileSync(png).toString("base64") }];
}

const results: Array<[string, boolean, string]> = [];
const check = (n: string, ok: boolean, d = "") => {
  results.push([n, ok, d]);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

console.log("Rendering a handwriting-font test paper…");
const imgs = renderPage();
console.log(`  ${Math.round((imgs[0].data.length * 3) / 4 / 1024)} KB\n`);

const res = await extractPaper(imgs, process.env.SCAN_MODEL || "claude-sonnet-4-6");
if (res.error || !res.raw) {
  console.error("scan failed:", res.error);
  process.exit(1);
}
const paper: ScannedPaper = JSON.parse(res.raw);
const qs = paper.questions ?? [];
const all = JSON.stringify(qs);

console.log("=== Structure ===");
check("found 4 questions", qs.length === 4, `got ${qs.length}`);
check("no leading labels leaked (Q.1 / a) )", !/"(Q\.?\s*\d|[a-d]\)\s)/.test(all));

console.log("\n=== Fill in the blanks ===");
const fb = qs.find((q) => q.type === "fill-blanks");
check("fill-blanks present", !!fb);
if (fb) {
  for (const t of TRUTH.fillBlanks) {
    const want = norm(t).replace(/_+/g, "_");
    check(
      `item: ${t.slice(0, 34)}`,
      fb.items.some((i) => norm(i.content).replace(/_+/g, "_") === want),
      fb.items.map((i) => i.content).join(" | ").slice(0, 70)
    );
  }
}

console.log("\n=== MCQ (digit pairs 17/26/39/45) ===");
const mcq = qs.find((q) => q.type === "mcq");
check("mcq present", !!mcq);
if (mcq) {
  const opts = (mcq.items[0]?.options ?? []).map(norm);
  check("stem correct", norm(mcq.items[0]?.content ?? "") === norm(TRUTH.mcqStem), mcq.items[0]?.content ?? "");
  for (const o of TRUTH.mcqOptions) check(`option ${o}`, opts.includes(norm(o)), opts.join(","));
}

console.log("\n=== Vertical sums (digit-length must survive) ===");
const math = qs.filter((q) => q.type === "math-vertical");
check("at least one math-vertical", math.length >= 1, `got ${math.length}`);
const operandSets = math.flatMap((q) =>
  q.items.map((i) => (i.nums?.length ? i.nums : [i.num1, i.num2].filter(Boolean)) as string[])
);
console.log(`    operands read: ${JSON.stringify(operandSets)}`);
for (const want of TRUTH.sums) {
  check(
    `sum ${want.join(" , ")}`,
    operandSets.some((got) => got.length === want.length && got.every((g, i) => g === want[i])),
    ""
  );
}
check(
  "no operand lost a digit",
  operandSets.every((set) => set.every((n) => /^\d+$/.test(n))),
  ""
);

console.log("\n=== Match ===");
const m = qs.find((q) => q.type === "match");
check("match present", !!m);
if (m) {
  check("left column", TRUTH.matchLeft.every((x) => (m.matchLeft ?? []).map(norm).includes(norm(x))), (m.matchLeft ?? []).join(","));
  check("right column", TRUTH.matchRight.every((x) => (m.matchRight ?? []).map(norm).includes(norm(x))), (m.matchRight ?? []).join(","));
}

console.log("\n" + "=".repeat(64));
const failed = results.filter(([, ok]) => !ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("");
  failed.forEach(([n, , d]) => console.log(`  FAILED: ${n}${d ? ` — ${d}` : ""}`));
  process.exitCode = 1;
}
console.log("");
