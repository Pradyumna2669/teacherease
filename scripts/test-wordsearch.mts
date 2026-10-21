import { buildWordSearch } from "../lib/wordsearch";
const r: Array<[string, boolean, string]> = [];
const ck = (n: string, ok: boolean, d = "") => { r.push([n, ok, d]); console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`); };

const words = ["RIVER", "MOUNTAIN", "FOREST", "DESERT", "OCEAN"];
const a = buildWordSearch(words, 12, 42);
ck("grid is square 12x12", a.grid.length === 12 && a.grid.every(x => x.length === 12));
ck("all words placed", a.skipped.length === 0, `skipped: ${a.skipped.join(",") || "none"}`);
ck("grid is all A-Z", a.grid.every(row => row.every(c => /^[A-Z]$/.test(c))));

// Words must be findable in one of the four directions.
function contains(grid: string[][], w: string) {
  const n = grid.length, dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r0 = 0; r0 < n; r0++) for (let c0 = 0; c0 < n; c0++) for (const [dr,dc] of dirs) {
    let ok = true;
    for (let i = 0; i < w.length; i++) {
      const r1 = r0 + dr*i, c1 = c0 + dc*i;
      if (r1<0||r1>=n||c1<0||c1>=n||grid[r1][c1]!==w[i]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}
for (const w of words) ck(`"${w}" is findable in the grid`, contains(a.grid, w));

const b = buildWordSearch(words, 12, 42);
ck("same seed reproduces the same grid", JSON.stringify(a.grid) === JSON.stringify(b.grid));
const c = buildWordSearch(words, 12, 7);
ck("different seed gives a different grid", JSON.stringify(a.grid) !== JSON.stringify(c.grid));

const d = buildWordSearch(["EXTRAORDINARILY"], 5, 3);
ck("grid grows to fit a word longer than requested size", d.grid.length >= 15, `${d.grid.length}`);
const e = buildWordSearch(["a", "", "  "], 8, 1);
ck("junk words are dropped, no crash", e.grid.length === 8 && e.placed.length === 0);

console.log("\n" + "=".repeat(50));
const f = r.filter(([, ok]) => !ok);
console.log(`${r.length - f.length}/${r.length} checks passed`);
if (f.length) process.exitCode = 1;
