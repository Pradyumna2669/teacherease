// Generates the promo voiceover into promo/public/ as vo1..vo7.mp3.
//
// Uses Microsoft Edge neural TTS via the `edge-tts` Python package — no API key
// and no cloud account. Install once:
//
//   pip install edge-tts
//
// Then:  node scripts/gen-vo.mjs
//
// Swap VOICE for a male read (en-IN-PrabhatNeural) or a Hindi read (see
// `python -m edge_tts --list-voices` for the full list). Re-run, then
// `npm run render` — Root.tsx picks the new files up unchanged, though a very
// different line length may need the scene timings in Root.tsx nudged.

import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(OUT, { recursive: true });

const VOICE = process.env.VO_VOICE || "en-IN-NeerjaExpressiveNeural";
const RATE = process.env.VO_RATE || "+8%";

// One line per scene. Written as a teacher talking about her own week — first
// person throughout, so it reads as a recommendation rather than an ad.
const LINES = [
  "Every week, a new question paper. And every week, the same struggle.",
  "Then I found PaperGen.",
  "I just photograph my handwritten paper — and it types itself. Ready to print.",
  "Hindi, Marathi, Tamil, Telugu — I type in English letters, and it writes the script for me.",
  "Fifteen plus question types. A live A4 preview. And a one-click PDF.",
  "I started free — sixty credits, no card needed.",
  "PaperGen dot online. Make your first paper today.",
];

for (const [i, text] of LINES.entries()) {
  const file = join(OUT, `vo${i + 1}.mp3`);
  await run("python", [
    "-m",
    "edge_tts",
    "--voice",
    VOICE,
    `--rate=${RATE}`,
    "--text",
    text,
    "--write-media",
    file,
  ]);
  console.log(`wrote vo${i + 1}.mp3  "${text.slice(0, 48)}…"`);
}

console.log(`\ndone — ${LINES.length} lines in ${VOICE}`);
