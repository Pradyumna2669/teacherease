// Word-search grid builder.
//
// The grid is generated once in the editor and stored on the question, not
// regenerated at render time. Two reasons: the printed sheet must match the
// preview the teacher approved, and a grid that reshuffled on every render
// would make the answer key useless.

export type Direction = readonly [number, number];

// Across, down, and both diagonals. Reversed placements are deliberately left
// out — for primary and middle school, backwards words make the puzzle a
// slog rather than a warm-up.
const DIRECTIONS: Direction[] = [
  [0, 1], // left to right
  [1, 0], // top to bottom
  [1, 1], // diagonal down-right
  [1, -1], // diagonal down-left
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Small deterministic PRNG so a given seed always yields the same grid. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WordSearchResult {
  grid: string[][];
  /** Words actually placed — a word longer than the grid cannot be. */
  placed: string[];
  /** Words that would not fit, so the editor can tell the teacher. */
  skipped: string[];
}

function canPlace(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  [dr, dc]: Direction,
  size: number
): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    const cell = grid[r][c];
    // Overlapping is fine when the letters agree — that is what makes a
    // word search feel dense rather than a list in a box.
    if (cell !== null && cell !== word[i]) return false;
  }
  return true;
}

/**
 * Build a square grid containing every word it can fit.
 *
 * @param words   the word list, in any case
 * @param size    grid side; clamped so it always fits the longest word
 * @param seed    any integer — the same seed reproduces the same grid
 */
export function buildWordSearch(
  words: string[],
  size: number,
  seed = 1
): WordSearchResult {
  const cleaned = words
    .map((w) => w.replace(/[^A-Za-z]/g, "").toUpperCase())
    .filter((w) => w.length >= 2);

  const longest = cleaned.reduce((m, w) => Math.max(m, w.length), 0);
  const side = Math.max(size, longest, 5);

  const grid: (string | null)[][] = Array.from({ length: side }, () =>
    Array<string | null>(side).fill(null)
  );

  const rand = mulberry32(seed);
  const placed: string[] = [];
  const skipped: string[] = [];

  // Longest first — they are the hardest to fit, so place them while the grid
  // is still empty.
  for (const word of [...cleaned].sort((a, b) => b.length - a.length)) {
    let done = false;
    // Bounded attempts, then give up on this word rather than loop forever.
    for (let attempt = 0; attempt < 220 && !done; attempt++) {
      const dir = DIRECTIONS[Math.floor(rand() * DIRECTIONS.length)];
      const row = Math.floor(rand() * side);
      const col = Math.floor(rand() * side);
      if (!canPlace(grid, word, row, col, dir, side)) continue;
      for (let i = 0; i < word.length; i++) {
        grid[row + dir[0] * i][col + dir[1] * i] = word[i];
      }
      placed.push(word);
      done = true;
    }
    if (!done) skipped.push(word);
  }

  // Fill the gaps with random letters.
  const filled = grid.map((row) =>
    row.map((cell) => cell ?? ALPHABET[Math.floor(rand() * 26)])
  );

  return { grid: filled, placed, skipped };
}
