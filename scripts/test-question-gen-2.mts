// Second pass: the two paths the first test didn't cover — a regional language,
// and textbook photos driving the content.
//
//   npx tsx --env-file=.env.local scripts/test-question-gen-2.mts
//
// The textbook page is rendered here as a PNG rather than shipped as a fixture,
// so the test stays self-contained and the "generate from my book" claim is
// checked against known page content.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateQuestions, type ScanImage } from "../lib/scan-providers";
import { scannedToQuestions, type ScannedPaper } from "../lib/scan";
import type { Question } from "../lib/types";

const line = (s = "") => console.log(s);
const rule = (t: string) => line(`\n${"=".repeat(64)}\n${t}\n${"=".repeat(64)}`);

function show(q: Question, i: number) {
  line(`\n  ${i + 1}. [${q.type}] ${q.marks} mark(s)`);
  line(`     "${q.title}"`);
  if (q.matchLeft?.length)
    q.matchLeft.forEach((l, j) => line(`       ${l}  →  ${q.matchRight?.[j] ?? "?"}`));
  q.items.slice(0, 4).forEach((it) => {
    if (it.num1 || it.num2) line(`       ${it.num1} ${q.operation ?? "?"} ${it.num2}`);
    else {
      line(`       - ${it.content}`);
      if (it.options?.length) line(`         options: ${it.options.join(" | ")}`);
    }
  });
}

async function generate(
  label: string,
  brief: Parameters<typeof generateQuestions>[0],
  images: ScanImage[]
): Promise<Question[] | null> {
  const t0 = Date.now();
  const res = await generateQuestions(brief, images, process.env.SCAN_MODEL || "claude-sonnet-4-6");
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (res.error || !res.raw) {
    line(`FAIL (${secs}s): ${res.error}`);
    return null;
  }
  let parsed: ScannedPaper;
  try {
    parsed = JSON.parse(res.raw);
  } catch {
    line(`FAIL: non-JSON response`);
    return null;
  }
  const qs = scannedToQuestions(parsed.questions ?? []);
  const total = qs.reduce((n, q) => n + q.marks, 0);
  line(`OK (${secs}s) — ${qs.length} questions, ${total} marks (asked ${brief.marks})`);
  line(`provider reported language: ${parsed.settings?.language ?? "(none)"}`);
  qs.forEach(show);
  return qs;
}

/* ------------------------------------------------- 3. regional language */

async function testHindi() {
  rule("3. REGIONAL LANGUAGE (Hindi)");
  const qs = await generate(
    "hindi",
    {
      subject: "पर्यावरण अध्ययन",
      className: "3",
      unitName: "इकाई 2 — हमारा परिवार",
      bookName: "NCERT आस-पास कक्षा 3",
      marks: 12,
      language: "hindi",
    },
    []
  );
  if (!qs) return;

  const allText = qs
    .flatMap((q) => [q.title, ...q.items.map((i) => i.content), ...(q.matchLeft ?? [])])
    .join(" ");
  const devanagari = (allText.match(/[ऀ-ॿ]/g) ?? []).length;
  const latinWords = (allText.match(/\b[A-Za-z]{4,}\b/g) ?? []).length;

  rule("3b. LANGUAGE CHECKS");
  const checks: Array<[string, boolean, string]> = [
    ["output is in Devanagari", devanagari > 50, `${devanagari} Devanagari chars`],
    ["not silently written in English", latinWords < 8, `${latinWords} latin words`],
    ["question types still valid", qs.every((q) => !!q.type), ""],
    ["marks still add up sensibly", Math.abs(qs.reduce((n, q) => n + q.marks, 0) - 12) <= 5, ""],
  ];
  let failed = 0;
  for (const [n, ok, d] of checks) {
    line(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
    if (!ok) failed++;
  }
  line(`\n  ${checks.length - failed}/${checks.length} checks passed`);
}

/* ---------------------------------------------------- 4. textbook photo */

// Render a fake textbook page to PNG via the promo project's Remotion install.
// Content is deliberately specific (invented planet names) so we can tell
// whether the model actually read the page or fell back on general knowledge.
const PAGE_HTML = `
<div style="width:900px;height:1200px;background:#fffdf7;padding:70px;font-family:Georgia,serif;color:#111">
  <div style="font-size:34px;font-weight:bold;border-bottom:3px solid #111;padding-bottom:12px">
    Unit 5 — The Zorbian System
  </div>
  <p style="font-size:24px;line-height:1.6;margin-top:30px">
    The Zorbian System has four planets. They travel around a green star called
    <b>Veln</b>.
  </p>
  <ul style="font-size:23px;line-height:1.8">
    <li><b>Kip</b> is the closest planet to Veln. It takes <b>18 days</b> to go around Veln once.</li>
    <li><b>Mora</b> is the largest planet. It has <b>7 moons</b>.</li>
    <li><b>Tesh</b> is covered in blue ice and has <b>no moons</b>.</li>
    <li><b>Yol</b> is the farthest planet. It takes <b>400 days</b> to go around Veln once.</li>
  </ul>
  <p style="font-size:24px;line-height:1.6;margin-top:24px">
    The Zorbian people live on <b>Mora</b>. They grow a purple fruit called
    <b>glimfruit</b>, which only ripens during the long night.
  </p>
  <p style="font-size:24px;line-height:1.6">
    A Zorbian year on Mora lasts <b>96 days</b>. Their calendar has
    <b>4 seasons</b> of <b>24 days</b> each.
  </p>
</div>`;

function renderTextbookPage(): ScanImage | null {
  const dir = mkdtempSync(join(tmpdir(), "pg-page-"));
  const comp = join(dir, "page.tsx");
  const entry = join(dir, "entry.ts");
  const png = join(dir, "page.png");
  writeFileSync(
    comp,
    `import React from "react";
import {AbsoluteFill, Composition} from "remotion";
const Page: React.FC = () => (
  <AbsoluteFill style={{background:"#fffdf7"}}>
    <div dangerouslySetInnerHTML={{__html: ${JSON.stringify(PAGE_HTML)}}} />
  </AbsoluteFill>
);
export const Root: React.FC = () => (
  <Composition id="Page" component={Page} durationInFrames={1} fps={1} width={900} height={1200} />
);`
  );
  writeFileSync(
    entry,
    `import {registerRoot} from "remotion";\nimport {Root} from "./page";\nregisterRoot(Root);`
  );
  try {
    execFileSync(
      "npx",
      ["remotion", "still", entry, "Page", png, "--frame=0"],
      { cwd: join(process.cwd(), "promo"), stdio: "pipe", shell: true }
    );
    return { mediaType: "image/png", data: readFileSync(png).toString("base64") };
  } catch (err) {
    line(`  (could not render the test page: ${(err as Error).message.slice(0, 120)})`);
    return null;
  }
}

async function testPhotos() {
  rule("4. TEXTBOOK PHOTO");
  line("Rendering a fake textbook page (invented facts, so we can tell whether");
  line("the model read the page or guessed from general knowledge)…\n");

  const img = renderTextbookPage();
  if (!img) {
    line("SKIP — could not render the test page.");
    return;
  }
  line(`  page rendered: ${Math.round((img.data.length * 3) / 4 / 1024)} KB PNG\n`);

  const qs = await generate(
    "photo",
    {
      subject: "Science",
      className: "5",
      unitName: "Unit 5 — The Zorbian System",
      bookName: "Discovering Space, Class 5",
      marks: 12,
    },
    [img]
  );
  if (!qs) return;

  const allText = qs
    .flatMap((q) => [
      q.title,
      q.passage ?? "",
      ...q.items.map((i) => `${i.content} ${(i.options ?? []).join(" ")}`),
      ...(q.matchLeft ?? []),
      ...(q.matchRight ?? []),
    ])
    .join(" ")
    .toLowerCase();

  // Facts that exist ONLY on the rendered page.
  const facts = ["kip", "mora", "tesh", "yol", "veln", "glimfruit", "zorbian"];
  const found = facts.filter((f) => allText.includes(f));
  // Real-solar-system leakage would mean it ignored the page.
  const leaks = ["earth", "jupiter", "mars", "saturn", "venus"].filter((f) =>
    allText.includes(f)
  );

  rule("4b. PHOTO-GROUNDING CHECKS");
  const checks: Array<[string, boolean, string]> = [
    ["used names from the photo", found.length >= 3, `found: ${found.join(", ") || "none"}`],
    ["did not fall back to the real solar system", leaks.length === 0, `leaked: ${leaks.join(", ")}`],
    ["produced usable questions", qs.length >= 2, `${qs.length}`],
    ["marks near target", Math.abs(qs.reduce((n, q) => n + q.marks, 0) - 12) <= 6, ""],
  ];
  let failed = 0;
  for (const [n, ok, d] of checks) {
    line(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
    if (!ok) failed++;
  }
  line(`\n  ${checks.length - failed}/${checks.length} checks passed`);
}

await testHindi();
await testPhotos();
line("");
