import { SKILLS, SKILL_BY_ID, prerequisiteClosure } from "./skills";
import type { BoardId, BoardScope, PresentationProfile } from "./types";

// Where — and only where — a board exists.
//
// Scope is derived from each skill's typicalClass rather than typed out 70
// times per board, because the boards agree about most of primary maths. What
// they disagree about is listed in OVERRIDES, and that list is the honest size
// of the difference between them.

export const BOARDS: { id: BoardId; label: string }[] = [
  { id: "cbse", label: "CBSE" },
  { id: "maharashtra", label: "Maharashtra State Board" },
];

// Primary and middle school. Classes 9-12 are a different model entirely -- a
// chapter-anchored bank, because at that level the textbook is prescribed and
// chapter names are finally a reliable index.
export const MVP_CLASSES = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Real divergences between boards. A skill listed here is taught in a
 * different class from its typicalClass, or not at all in these classes.
 *
 * Everything absent from this table is taught in the same class by both — which
 * is the great majority of primary maths, and the reason a single skill graph
 * can serve every board.
 */
const OVERRIDES: Partial<Record<BoardId, Record<string, number | null>>> = {
  maharashtra: {
    // MH works with larger numbers earlier in the primary years.
    "NUM.PV.4D": 3,
    "NUM.CMP.4D": 3,
    // Decimals arrive a year later than CBSE.
    "DEC.TENTHS": 5,
    "DEC.ADD.SUB": 5,
  },
  cbse: {
    // CBSE introduces decimals in Class 4 through money.
    "DEC.TENTHS": 4,
  },
};

function classFor(board: BoardId, skillId: string): number | null {
  const override = OVERRIDES[board]?.[skillId];
  if (override !== undefined) return override;
  return SKILL_BY_ID.get(skillId)?.typicalClass ?? null;
}

/** The full board × class × skill mapping, built once at module load. */
export const BOARD_SCOPE: BoardScope[] = BOARDS.flatMap(({ id: board }) =>
  SKILLS.flatMap((skill) => {
    const cls = classFor(board, skill.id);
    if (cls == null || !MVP_CLASSES.includes(cls)) return [];
    return [
      {
        board,
        class: cls,
        skill: skill.id,
        // First half of the year for the foundations a later skill needs.
        term: (skill.requires?.length ? 2 : 1) as 1 | 2,
        emphasis: (skill.requires?.length ? "supporting" : "core") as "core" | "supporting",
      },
    ];
  })
);

/** Skills a board teaches in a class. Ordered as the graph declares them. */
export function skillsInScope(board: BoardId, cls: number): string[] {
  return BOARD_SCOPE.filter((s) => s.board === board && s.class === cls).map(
    (s) => s.skill
  );
}

/**
 * Everything a class may fairly be asked, which is this year's skills PLUS
 * everything taught in earlier classes. A Class 5 paper revising Class 3
 * multiplication is completely normal, and a scope that forgot that would make
 * revision papers impossible.
 */
export function cumulativeScope(board: BoardId, cls: number): Set<string> {
  return new Set(
    BOARD_SCOPE.filter((s) => s.board === board && s.class <= cls).map((s) => s.skill)
  );
}

/**
 * Board-alignment guard. A question is allowed only if its skill is in scope
 * AND every skill it leans on has already been introduced by this board.
 *
 * The second half is what catches the subtle failures — a Class 3 money
 * question that quietly needs the decimal notation this board does not
 * introduce until Class 4.
 */
export function isAligned(
  board: BoardId,
  cls: number,
  skillId: string
): { ok: true } | { ok: false; reason: string } {
  const scope = cumulativeScope(board, cls);
  if (!scope.has(skillId)) {
    return { ok: false, reason: `${skillId} is not taught by ${board} up to class ${cls}` };
  }
  for (const req of Array.from(prerequisiteClosure(skillId))) {
    if (!scope.has(req)) {
      return {
        ok: false,
        reason: `${skillId} needs ${req}, which ${board} introduces later`,
      };
    }
  }
  return { ok: true };
}

/**
 * How a board wants a page to read. For primary classes this is where boards
 * actually differ most — not in which concepts they teach.
 */
export const PRESENTATION: Record<BoardId, PresentationProfile> = {
  cbse: {
    currency: "₹",
    names: ["Rahul", "Priya", "Aman", "Sneha", "Arjun", "Meera", "Kabir", "Anita"],
    units: { length: "cm", weight: "kg", capacity: "L" },
  },
  maharashtra: {
    currency: "₹",
    names: ["Sagar", "Snehal", "Omkar", "Manasi", "Rohit", "Ashwini", "Nikhil", "Pooja"],
    units: { length: "cm", weight: "kg", capacity: "L" },
  },
};
