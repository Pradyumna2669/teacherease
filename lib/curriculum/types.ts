// The curriculum layer.
//
// One rule governs this whole directory: a skill never mentions a board, a
// class, a textbook or a chapter. Those are all views onto the skill graph,
// declared in boards.ts. Break that rule and adding a new board stops being a
// mapping exercise and becomes a content rebuild — see the architecture brief.

export type StrandId =
  | "number"
  | "addsub"
  | "muldiv"
  | "fraction"
  | "measure"
  | "money"
  | "time"
  | "geometry"
  | "data"
  | "pattern"
  | "algebra"
  | "ratio";

export type BoardId = "cbse" | "maharashtra";

/**
 * What makes a question hard, measured absolutely so it can be compared
 * against a class baseline later. Every dimension is computable at authoring
 * time — nobody types "medium".
 */
export interface LoadVector {
  /** Operations in the solution path. */
  steps: 1 | 2 | 3;
  /** Carry / borrow / regrouping: none, one place, several. */
  regrouping: 0 | 1 | 2;
  /** Operand size against what the class normally handles. */
  magnitude: 1 | 2 | 3;
  /** Words to read: brief, a sentence, a paragraph. */
  reading: 1 | 2 | 3;
  /** Bare computation, a familiar context, an unfamiliar one. */
  transfer: 1 | 2 | 3;
  /** MCQ options: not applicable, obvious, plausible, near-miss. */
  distractors: 0 | 1 | 2 | 3;
}

export const ZERO_LOAD: LoadVector = {
  steps: 1,
  regrouping: 0,
  magnitude: 1,
  reading: 1,
  transfer: 1,
  distractors: 0,
};

export type Band = "easy" | "medium" | "hard";

export interface Concept {
  id: string;
  strand: StrandId;
  /** What a teacher taps. Her words, not the syllabus document's. */
  label: string;
}

export interface Skill {
  /** Stable forever. Never renumber — items and coverage rows point here. */
  id: string;
  concept: string;
  /** One verb, one object, one constraint. If it needs "and", split it. */
  statement: string;
  /** Where this normally sits. Used to calibrate difficulty, NOT to filter. */
  typicalClass: number;
  /** Skills that must come first. This is what makes it a graph. */
  requires?: string[];
  /** The load a middling question on this skill carries at typicalClass. */
  baseline: LoadVector;
}

/**
 * The only place a board appears. A board is a filter over the skill graph:
 * which skills, which class, which term. Adding a board means adding rows
 * here and nothing else.
 */
export interface BoardScope {
  board: BoardId;
  class: number;
  skill: string;
  /** 1 or 2 — which half of the year it is normally taught in. */
  term: 1 | 2;
  emphasis: "core" | "supporting";
}

/** How a board wants numbers, money and names to appear on the page. */
export interface PresentationProfile {
  currency: string;
  /** Names used in word problems, so a paper sounds local. */
  names: string[];
  units: { length: string; weight: string; capacity: string };
}
