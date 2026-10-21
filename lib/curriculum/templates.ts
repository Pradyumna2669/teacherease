import type { QuestionType } from "@/lib/types";
import type { Band, LoadVector, PresentationProfile } from "./types";

// Parameterised item generators.
//
// Primary arithmetic is verifiable by code: 473 + 218 either equals 691 or it
// does not. So these skills are never stored as thousands of fixed questions
// and never handed to a language model — a generator produces them and a rule
// checks them. Infinite, provably correct, tunable by band, no review queue and
// no hallucination surface.
//
// Every template MUST return an answer its own `check` confirms. generate()
// below enforces that and throws rather than emitting a wrong sum, because one
// wrong answer in front of a class costs more trust than ten good papers earn.

export interface GeneratedItem {
  skill: string;
  templateId: string;
  /** Instruction from the template, if it set one. */
  title?: string;
  questionType: QuestionType;
  /** Question text. Empty for math-vertical, which renders from num1/num2. */
  text: string;
  answer: string;
  options?: string[];
  num1?: string;
  num2?: string;
  operation?: "+" | "-" | "x" | "÷";
  load: LoadVector;
  band: Band;
}

export interface Template {
  id: string;
  skill: string;
  questionType: QuestionType;
  /** Bands this template can actually produce. */
  bands: Band[];
  /**
   * The instruction this question is printed under. Without it several skills
   * sharing a question type all print as "Answer the following questions",
   * which is not how a teacher heads a paper. Falls back to the generic title
   * for the type.
   */
  title?: string;
  build: (r: Rng, band: Band, p: PresentationProfile) => Omit<GeneratedItem, "skill" | "templateId" | "questionType" | "band">;
  /** Independent re-derivation of the answer. Must not reuse build's working. */
  check: (item: Omit<GeneratedItem, "skill" | "templateId" | "questionType" | "band">) => boolean;
}

// ---- deterministic randomness -------------------------------------------

export type Rng = () => number;

/** mulberry32 — small, fast, and seedable so a paper can be reproduced. */
export function rngFrom(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[int(r, 0, xs.length - 1)];

// ---- arithmetic facts, checked properly ---------------------------------

const digits = (n: number) => String(n).split("").reverse().map(Number);

/** True when adding a and b carries in at least one column. */
export function hasCarry(a: number, b: number): boolean {
  const da = digits(a);
  const db = digits(b);
  let carry = 0;
  for (let i = 0; i < Math.max(da.length, db.length); i++) {
    const sum = (da[i] ?? 0) + (db[i] ?? 0) + carry;
    if (sum >= 10) {
      carry = 1;
      return true;
    }
    carry = 0;
  }
  return false;
}

/** True when a - b borrows in at least one column. */
export function hasBorrow(a: number, b: number): boolean {
  const da = digits(a);
  const db = digits(b);
  let borrow = 0;
  for (let i = 0; i < da.length; i++) {
    const top = da[i] - borrow;
    const bot = db[i] ?? 0;
    if (top < bot) {
      borrow = 1;
      return true;
    }
    borrow = 0;
  }
  return false;
}

const L = (
  steps: 1 | 2 | 3,
  regrouping: 0 | 1 | 2,
  magnitude: 1 | 2 | 3 = 1,
  reading: 1 | 2 | 3 = 1,
  transfer: 1 | 2 | 3 = 1,
  distractors: 0 | 1 | 2 | 3 = 0
): LoadVector => ({ steps, regrouping, magnitude, reading, transfer, distractors });

/** Numbers that sit near the right answer, so an MCQ is not guessable. */
function nearMisses(r: Rng, answer: number, count: number): string[] {
  const out = new Set<number>();
  const deltas = [1, -1, 2, -2, 10, -10, 9, -9, 100, -100];
  while (out.size < count) {
    const d = pick(r, deltas);
    const candidate = answer + d;
    if (candidate > 0 && candidate !== answer) out.add(candidate);
  }
  return Array.from(out).map(String);
}

function shuffled<T>(r: Rng, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = int(r, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Band → operand range for column arithmetic.
const range3 = { easy: [100, 399], medium: [200, 799], hard: [400, 999] } as const;
const range4 = { easy: [1000, 3999], medium: [2000, 7999], hard: [4000, 9999] } as const;

// ---- the templates -------------------------------------------------------

export const TEMPLATES: Template[] = [
  // ===== Addition =========================================================
  {
    id: "T.ADD.3D3D.REG",
    skill: "ADD.3D3D.REG",
    questionType: "math-vertical",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const [lo, hi] = range3[band];
      let a = 0;
      let b = 0;
      // Regrouping is the point of this skill, so insist on it.
      do {
        a = int(r, lo, hi);
        b = int(r, lo, hi);
      } while (!hasCarry(a, b) || a + b > 999);
      return {
        text: "",
        answer: String(a + b),
        num1: String(a),
        num2: String(b),
        operation: "+" as const,
        load: L(1, 1, band === "hard" ? 2 : 1),
      };
    },
    check: (i) => Number(i.num1) + Number(i.num2) === Number(i.answer),
  },
  {
    id: "T.ADD.4D4D.REG",
    skill: "ADD.4D4D.REG",
    questionType: "math-vertical",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const [lo, hi] = range4[band];
      let a = 0;
      let b = 0;
      do {
        a = int(r, lo, hi);
        b = int(r, lo, hi);
      } while (!hasCarry(a, b) || a + b > 9999);
      return {
        text: "",
        answer: String(a + b),
        num1: String(a),
        num2: String(b),
        operation: "+" as const,
        load: L(1, 2, 2),
      };
    },
    check: (i) => Number(i.num1) + Number(i.num2) === Number(i.answer),
  },

  // ===== Subtraction ======================================================
  {
    id: "T.SUB.3D3D.BOR",
    skill: "SUB.3D3D.BOR",
    questionType: "math-vertical",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const [lo, hi] = range3[band];
      let a = 0;
      let b = 0;
      do {
        a = int(r, lo, hi);
        b = int(r, 100, a - 1);
      } while (a <= b || !hasBorrow(a, b));
      return {
        text: "",
        answer: String(a - b),
        num1: String(a),
        num2: String(b),
        operation: "-" as const,
        load: L(1, 1, band === "hard" ? 2 : 1),
      };
    },
    check: (i) => Number(i.num1) - Number(i.num2) === Number(i.answer),
  },
  {
    id: "T.SUB.4D4D.BOR",
    skill: "SUB.4D4D.BOR",
    questionType: "math-vertical",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const [lo, hi] = range4[band];
      let a = 0;
      let b = 0;
      do {
        a = int(r, lo, hi);
        b = int(r, 1000, a - 1);
      } while (a <= b || !hasBorrow(a, b));
      return {
        text: "",
        answer: String(a - b),
        num1: String(a),
        num2: String(b),
        operation: "-" as const,
        load: L(1, 2, 2),
      };
    },
    check: (i) => Number(i.num1) - Number(i.num2) === Number(i.answer),
  },

  // ===== Tables and multiplication ========================================
  {
    id: "T.MUL.TABLES",
    skill: "MUL.TABLES.2-10",
    questionType: "fill-blanks",
    title: "Fill in the blanks:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const a = band === "easy" ? int(r, 2, 5) : int(r, 6, 10);
      const b = int(r, 2, 10);
      return {
        text: `${a} × ${b} = ______`,
        answer: String(a * b),
        load: L(1, 0, 1),
      };
    },
    check: (i) => {
      const m = /^(\d+) × (\d+)/.exec(i.text);
      return !!m && Number(m[1]) * Number(m[2]) === Number(i.answer);
    },
  },
  {
    id: "T.MUL.2D1D.REG",
    skill: "MUL.2D1D.REG",
    questionType: "math-vertical",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const a = band === "easy" ? int(r, 12, 39) : band === "medium" ? int(r, 24, 79) : int(r, 45, 99);
      const b = band === "easy" ? int(r, 2, 4) : int(r, 5, 9);
      return {
        text: "",
        answer: String(a * b),
        num1: String(a),
        num2: String(b),
        operation: "x" as const,
        load: L(1, 1, band === "hard" ? 2 : 1),
      };
    },
    check: (i) => Number(i.num1) * Number(i.num2) === Number(i.answer),
  },
  {
    id: "T.MUL.3D1D.REG",
    skill: "MUL.3D1D.REG",
    questionType: "math-vertical",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const a = band === "easy" ? int(r, 112, 299) : band === "medium" ? int(r, 234, 599) : int(r, 456, 999);
      const b = band === "easy" ? int(r, 2, 4) : int(r, 5, 9);
      return {
        text: "",
        answer: String(a * b),
        num1: String(a),
        num2: String(b),
        operation: "x" as const,
        load: L(1, 2, 2),
      };
    },
    check: (i) => Number(i.num1) * Number(i.num2) === Number(i.answer),
  },
  {
    id: "T.MUL.2D2D",
    skill: "MUL.2D2D",
    questionType: "math-vertical",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const a = band === "easy" ? int(r, 11, 29) : band === "medium" ? int(r, 23, 59) : int(r, 45, 99);
      const b = band === "easy" ? int(r, 11, 19) : band === "medium" ? int(r, 15, 39) : int(r, 25, 99);
      return {
        text: "",
        answer: String(a * b),
        num1: String(a),
        num2: String(b),
        operation: "x" as const,
        load: L(2, 2, 2),
      };
    },
    check: (i) => Number(i.num1) * Number(i.num2) === Number(i.answer),
  },

  // ===== Division =========================================================
  {
    id: "T.DIV.2D1D.NOREM",
    skill: "DIV.2D1D.NOREM",
    questionType: "fill-blanks",
    title: "Divide:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const b = band === "easy" ? int(r, 2, 5) : int(r, 6, 9);
      const q = int(r, 2, band === "easy" ? 9 : 11);
      const a = b * q;
      return {
        text: `${a} ÷ ${b} = ______`,
        answer: String(q),
        load: L(1, 0, 1),
      };
    },
    check: (i) => {
      const m = /^(\d+) ÷ (\d+)/.exec(i.text);
      return !!m && Number(m[1]) / Number(m[2]) === Number(i.answer);
    },
  },
  {
    id: "T.DIV.3D1D.REM",
    skill: "DIV.3D1D.REM",
    questionType: "short-answer",
    title: "Divide and write the quotient and remainder:",
    bands: ["medium", "hard"],
    build: (r, band) => {
      const b = band === "medium" ? int(r, 3, 6) : int(r, 6, 9);
      const q = int(r, 20, band === "medium" ? 99 : 160);
      const rem = int(r, 1, b - 1);
      const a = b * q + rem;
      return {
        text: `Divide ${a} by ${b}. Write the quotient and the remainder.`,
        answer: `Quotient ${q}, remainder ${rem}`,
        load: L(2, 1, 2, 2),
      };
    },
    check: (i) => {
      const m = /Divide (\d+) by (\d+)/.exec(i.text);
      const g = /Quotient (\d+), remainder (\d+)/.exec(i.answer);
      if (!m || !g) return false;
      const a = Number(m[1]);
      const b = Number(m[2]);
      return Math.floor(a / b) === Number(g[1]) && a % b === Number(g[2]);
    },
  },

  // ===== Place value ======================================================
  {
    id: "T.NUM.PV.3D.EXPAND",
    skill: "NUM.PV.3D",
    questionType: "fill-blanks",
    title: "Write in expanded form:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const n = band === "easy" ? int(r, 101, 499) : int(r, 305, 999);
      const h = Math.floor(n / 100) * 100;
      const t = Math.floor((n % 100) / 10) * 10;
      const o = n % 10;
      return {
        text: `Write ${n} in expanded form: ______ + ______ + ______`,
        answer: `${h} + ${t} + ${o}`,
        load: L(1, 0, 1),
      };
    },
    check: (i) => {
      const m = /Write (\d+) in expanded/.exec(i.text);
      if (!m) return false;
      const parts = i.answer.split("+").map((s) => Number(s.trim()));
      return parts.reduce((x, y) => x + y, 0) === Number(m[1]);
    },
  },
  {
    id: "T.NUM.PV.4D.EXPAND",
    skill: "NUM.PV.4D",
    questionType: "fill-blanks",
    title: "Write in expanded form:",
    bands: ["medium", "hard"],
    build: (r) => {
      const n = int(r, 1024, 9999);
      const th = Math.floor(n / 1000) * 1000;
      const h = Math.floor((n % 1000) / 100) * 100;
      const t = Math.floor((n % 100) / 10) * 10;
      const o = n % 10;
      return {
        text: `Write ${n} in expanded form: ______ + ______ + ______ + ______`,
        answer: `${th} + ${h} + ${t} + ${o}`,
        load: L(1, 0, 2),
      };
    },
    check: (i) => {
      const m = /Write (\d+) in expanded/.exec(i.text);
      if (!m) return false;
      const parts = i.answer.split("+").map((s) => Number(s.trim()));
      return parts.reduce((x, y) => x + y, 0) === Number(m[1]);
    },
  },
  {
    id: "T.NUM.CMP.3D",
    skill: "NUM.CMP.3D",
    questionType: "fill-blanks",
    title: "Put the correct sign:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const a = int(r, 100, 999);
      // A close pair is the harder comparison; a far pair is the easy one.
      const b = band === "easy" ? int(r, 100, 999) : Math.min(999, Math.max(100, a + int(r, -9, 9)));
      const sign = a > b ? ">" : a < b ? "<" : "=";
      return {
        text: `Put the correct sign (>, < or =):  ${a} ______ ${b}`,
        answer: sign,
        load: L(1, 0, band === "easy" ? 1 : 2),
      };
    },
    check: (i) => {
      const m = /(\d+) ______ (\d+)/.exec(i.text);
      if (!m) return false;
      const a = Number(m[1]);
      const b = Number(m[2]);
      return i.answer === (a > b ? ">" : a < b ? "<" : "=");
    },
  },
  {
    id: "T.NUM.ROUND",
    skill: "NUM.ROUND.10.100",
    questionType: "fill-blanks",
    title: "Round off:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const n = int(r, 111, 989);
      const to = band === "easy" ? 10 : 100;
      const rounded = Math.round(n / to) * to;
      return {
        text: `Round ${n} to the nearest ${to}: ______`,
        answer: String(rounded),
        load: L(1, 0, band === "easy" ? 1 : 2),
      };
    },
    check: (i) => {
      const m = /Round (\d+) to the nearest (\d+)/.exec(i.text);
      if (!m) return false;
      const to = Number(m[2]);
      return Math.round(Number(m[1]) / to) * to === Number(i.answer);
    },
  },
  {
    id: "T.NUM.ODD.EVEN",
    skill: "NUM.ODD.EVEN",
    questionType: "mcq",
    title: "Choose the correct option:",
    bands: ["easy"],
    build: (r) => {
      const n = int(r, 11, 199);
      return {
        text: `Is ${n} odd or even?`,
        answer: n % 2 === 0 ? "Even" : "Odd",
        options: ["Odd", "Even"],
        load: L(1, 0, 1, 1, 1, 1),
      };
    },
    check: (i) => {
      const m = /Is (\d+) odd/.exec(i.text);
      return !!m && i.answer === (Number(m[1]) % 2 === 0 ? "Even" : "Odd");
    },
  },

  // ===== Factors and multiples ============================================
  {
    id: "T.FAC.MULTIPLES",
    skill: "FAC.MULTIPLES",
    questionType: "fill-blanks",
    title: "Write the multiples:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const n = band === "easy" ? int(r, 2, 6) : int(r, 7, 12);
      const first = [1, 2, 3, 4, 5].map((k) => n * k);
      return {
        text: `Write the first five multiples of ${n}: ______`,
        answer: first.join(", "),
        load: L(1, 0, band === "easy" ? 1 : 2),
      };
    },
    check: (i) => {
      const m = /multiples of (\d+)/.exec(i.text);
      if (!m) return false;
      const n = Number(m[1]);
      const got = i.answer.split(",").map((s) => Number(s.trim()));
      return got.length === 5 && got.every((v, k) => v === n * (k + 1));
    },
  },
  {
    id: "T.FAC.FACTORS",
    skill: "FAC.FACTORS",
    questionType: "fill-blanks",
    title: "Write all the factors:",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const pool =
        band === "easy" ? [6, 8, 10, 12] : band === "medium" ? [18, 20, 24, 28] : [36, 40, 48, 60];
      const n = pick(r, pool);
      const factors: number[] = [];
      for (let k = 1; k <= n; k++) if (n % k === 0) factors.push(k);
      return {
        text: `Write all the factors of ${n}: ______`,
        answer: factors.join(", "),
        load: L(band === "hard" ? 2 : 1, 0, band === "hard" ? 2 : 1),
      };
    },
    check: (i) => {
      const m = /factors of (\d+)/.exec(i.text);
      if (!m) return false;
      const n = Number(m[1]);
      const got = i.answer.split(",").map((s) => Number(s.trim()));
      const want: number[] = [];
      for (let k = 1; k <= n; k++) if (n % k === 0) want.push(k);
      return got.length === want.length && got.every((v, k) => v === want[k]);
    },
  },

  // ===== Fractions ========================================================
  {
    id: "T.FRA.ADD.SAME",
    skill: "FRA.ADD.SAME",
    questionType: "fill-blanks",
    title: "Add the fractions:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const d = band === "easy" ? int(r, 3, 6) : int(r, 6, 12);
      const a = int(r, 1, d - 2);
      const b = int(r, 1, d - a);
      return {
        text: `${a}/${d} + ${b}/${d} = ______`,
        answer: `${a + b}/${d}`,
        load: L(1, 0, band === "easy" ? 1 : 2),
      };
    },
    check: (i) => {
      const m = /^(\d+)\/(\d+) \+ (\d+)\/(\d+)/.exec(i.text);
      if (!m) return false;
      return i.answer === `${Number(m[1]) + Number(m[3])}/${m[2]}` && m[2] === m[4];
    },
  },
  {
    id: "T.FRA.SUB.SAME",
    skill: "FRA.SUB.SAME",
    questionType: "fill-blanks",
    title: "Subtract the fractions:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const d = band === "easy" ? int(r, 3, 6) : int(r, 6, 12);
      const a = int(r, 2, d);
      const b = int(r, 1, a - 1);
      return {
        text: `${a}/${d} − ${b}/${d} = ______`,
        answer: `${a - b}/${d}`,
        load: L(1, 0, band === "easy" ? 1 : 2),
      };
    },
    check: (i) => {
      const m = /^(\d+)\/(\d+) − (\d+)\/(\d+)/.exec(i.text);
      if (!m) return false;
      return i.answer === `${Number(m[1]) - Number(m[3])}/${m[2]}` && m[2] === m[4];
    },
  },

  // ===== Measurement ======================================================
  {
    id: "T.LEN.CONVERT",
    skill: "LEN.CONVERT",
    questionType: "fill-blanks",
    title: "Convert:",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      if (band === "hard") {
        const km = int(r, 2, 9);
        const m = int(r, 100, 900);
        return {
          text: `${km} km ${m} m = ______ m`,
          answer: String(km * 1000 + m),
          load: L(2, 0, 2),
        };
      }
      const m = band === "easy" ? int(r, 2, 9) : int(r, 12, 95);
      return {
        text: `${m} m = ______ cm`,
        answer: String(m * 100),
        load: L(1, 0, band === "easy" ? 1 : 2),
      };
    },
    check: (i) => {
      const km = /^(\d+) km (\d+) m =/.exec(i.text);
      if (km) return Number(km[1]) * 1000 + Number(km[2]) === Number(i.answer);
      const m = /^(\d+) m = /.exec(i.text);
      return !!m && Number(m[1]) * 100 === Number(i.answer);
    },
  },
  {
    id: "T.WGT.CONVERT",
    skill: "WGT.CONVERT",
    questionType: "fill-blanks",
    title: "Convert:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const kg = band === "easy" ? int(r, 2, 9) : int(r, 11, 45);
      const g = band === "easy" ? 0 : int(r, 50, 950);
      return {
        text: g ? `${kg} kg ${g} g = ______ g` : `${kg} kg = ______ g`,
        answer: String(kg * 1000 + g),
        load: L(g ? 2 : 1, 0, band === "easy" ? 1 : 2),
      };
    },
    check: (i) => {
      const both = /^(\d+) kg (\d+) g =/.exec(i.text);
      if (both) return Number(both[1]) * 1000 + Number(both[2]) === Number(i.answer);
      const kg = /^(\d+) kg = /.exec(i.text);
      return !!kg && Number(kg[1]) * 1000 === Number(i.answer);
    },
  },
  {
    id: "T.PER.RECTANGLE",
    skill: "PER.RECTANGLE",
    questionType: "short-answer",
    title: "Find the perimeter:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const w = band === "easy" ? int(r, 3, 12) : int(r, 14, 45);
      const h = band === "easy" ? int(r, 3, 12) : int(r, 14, 45);
      return {
        text: `A rectangle is ${w} cm long and ${h} cm wide. Find its perimeter.`,
        answer: `${2 * (w + h)} cm`,
        load: L(2, 0, band === "easy" ? 1 : 2, 2, 2),
      };
    },
    check: (i) => {
      const m = /is (\d+) cm long and (\d+) cm wide/.exec(i.text);
      if (!m) return false;
      return Number(i.answer.replace(/[^\d]/g, "")) === 2 * (Number(m[1]) + Number(m[2]));
    },
  },
  {
    id: "T.ARE.RECTANGLE",
    skill: "ARE.RECTANGLE",
    questionType: "short-answer",
    title: "Find the area:",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const w = band === "easy" ? int(r, 3, 9) : band === "medium" ? int(r, 8, 25) : int(r, 15, 48);
      const h = band === "easy" ? int(r, 3, 9) : band === "medium" ? int(r, 8, 25) : int(r, 15, 48);
      return {
        text: `Find the area of a rectangle ${w} cm long and ${h} cm wide.`,
        answer: `${w * h} sq cm`,
        load: L(1, band === "hard" ? 2 : 1, band === "easy" ? 1 : 2, 2, 2),
      };
    },
    check: (i) => {
      const m = /rectangle (\d+) cm long and (\d+) cm wide/.exec(i.text);
      if (!m) return false;
      return Number(i.answer.replace(/[^\d]/g, "")) === Number(m[1]) * Number(m[2]);
    },
  },

  // ===== Money ============================================================
  {
    id: "T.MON.CHANGE",
    skill: "MON.ADD.SUB",
    questionType: "word-problem",
    title: "Solve the following:",
    bands: ["easy", "medium", "hard"],
    build: (r, band, p) => {
      const name = pick(r, p.names);
      const thing = pick(r, ["a book", "a pencil box", "a water bottle", "a school bag", "a lunch box"]);
      const cost = band === "easy" ? int(r, 15, 60) : band === "medium" ? int(r, 65, 240) : int(r, 260, 780);
      const gave = Math.ceil((cost + int(r, 5, 90)) / 10) * 10;
      return {
        text: `${name} bought ${thing} for ${p.currency}${cost}. ${name} gave the shopkeeper ${p.currency}${gave}. How much change did ${name} get back?`,
        answer: `${p.currency}${gave - cost}`,
        load: L(1, 1, band === "hard" ? 2 : 1, 2, 2),
      };
    },
    check: (i) => {
      const m = /for .(\d+)\.[\s\S]*gave the shopkeeper .(\d+)\./.exec(i.text);
      if (!m) return false;
      return Number(i.answer.replace(/[^\d]/g, "")) === Number(m[2]) - Number(m[1]);
    },
  },

  // ===== Patterns =========================================================
  {
    id: "T.PAT.NUMBER",
    skill: "PAT.NUMBER",
    questionType: "fill-blanks",
    title: "Continue the pattern:",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const start = int(r, 2, 30);
      const step = band === "easy" ? int(r, 2, 5) : band === "medium" ? int(r, 6, 12) : int(r, 11, 25);
      const seq = [0, 1, 2, 3].map((k) => start + step * k);
      return {
        text: `Continue the pattern: ${seq.join(", ")}, ______, ______`,
        answer: `${start + step * 4}, ${start + step * 5}`,
        load: L(1, 0, band === "hard" ? 2 : 1),
      };
    },
    check: (i) => {
      const m = /pattern: ([\d, ]+),\s*______/.exec(i.text);
      if (!m) return false;
      const seq = m[1].split(",").map((s) => Number(s.trim()));
      const step = seq[1] - seq[0];
      const got = i.answer.split(",").map((s) => Number(s.trim()));
      const last = seq[seq.length - 1];
      return got[0] === last + step && got[1] === last + 2 * step;
    },
  },

  // ===== Word problems, multiplication ====================================
  {
    id: "T.MULDIV.WORD.GROUPS",
    skill: "MULDIV.WORD.1STEP",
    questionType: "word-problem",
    title: "Solve the following:",
    bands: ["easy", "medium", "hard"],
    build: (r, band, p) => {
      const name = pick(r, p.names);
      const unit = pick(r, [
        { many: "boxes", one: "box", item: "pencils" },
        { many: "packets", one: "packet", item: "biscuits" },
        { many: "rows", one: "row", item: "chairs" },
        { many: "shelves", one: "shelf", item: "books" },
      ]);
      const groups = band === "easy" ? int(r, 3, 8) : band === "medium" ? int(r, 6, 15) : int(r, 12, 28);
      const per = band === "easy" ? int(r, 3, 9) : band === "medium" ? int(r, 8, 18) : int(r, 15, 35);
      return {
        text: `${name} has ${groups} ${unit.many}. Each ${unit.one} holds ${per} ${unit.item}. How many ${unit.item} are there altogether?`,
        answer: String(groups * per),
        load: L(1, 1, band === "hard" ? 2 : 1, 2, 2),
      };
    },
    check: (i) => {
      const m = /has (\d+) \w+\. Each \w+ holds (\d+)/.exec(i.text);
      return !!m && Number(m[1]) * Number(m[2]) === Number(i.answer);
    },
  },

  // ===== Classes 1-2 ======================================================
  {
    id: "T.ADD.WITHIN.20",
    skill: "ADD.WITHIN.20",
    questionType: "fill-blanks",
    title: "Add:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const a = band === "easy" ? int(r, 1, 9) : int(r, 5, 14);
      const b = int(r, 1, 20 - a);
      return { text: `${a} + ${b} = ______`, answer: String(a + b), load: L(1, 0, 1) };
    },
    check: (i) => {
      const m = /^(\d+) \+ (\d+)/.exec(i.text);
      return !!m && Number(m[1]) + Number(m[2]) === Number(i.answer);
    },
  },
  {
    id: "T.SUB.WITHIN.20",
    skill: "SUB.WITHIN.20",
    questionType: "fill-blanks",
    title: "Subtract:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const a = band === "easy" ? int(r, 5, 12) : int(r, 12, 20);
      const b = int(r, 1, a - 1);
      return { text: `${a} − ${b} = ______`, answer: String(a - b), load: L(1, 0, 1) };
    },
    check: (i) => {
      const m = /^(\d+) − (\d+)/.exec(i.text);
      return !!m && Number(m[1]) - Number(m[2]) === Number(i.answer);
    },
  },
  {
    id: "T.NUM.BEFORE.AFTER",
    skill: "NUM.BEFORE.AFTER",
    questionType: "fill-blanks",
    title: "Write the number that comes just before:",
    bands: ["easy"],
    build: (r) => {
      const n = int(r, 2, 19);
      return {
        text: `______ , ${n}`,
        answer: String(n - 1),
        load: L(1, 0, 1),
      };
    },
    check: (i) => {
      const m = /______ , (\d+)/.exec(i.text);
      return !!m && Number(m[1]) - 1 === Number(i.answer);
    },
  },

  // ===== Integers =========================================================
  {
    id: "T.INT.ADD.SUB",
    skill: "INT.ADD.SUB",
    questionType: "fill-blanks",
    title: "Solve:",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const cap = band === "easy" ? 20 : band === "medium" ? 60 : 150;
      const a = int(r, -cap, cap);
      const b = int(r, -cap, cap);
      // Written with an explicit sign so a negative second operand is readable.
      const shown = b < 0 ? `(${b})` : String(b);
      return {
        text: `${a} + ${shown} = ______`,
        answer: String(a + b),
        load: L(1, 1, band === "easy" ? 1 : 2),
      };
    },
    check: (i) => {
      const m = /^(-?\d+) \+ \(?(-?\d+)\)? =/.exec(i.text);
      return !!m && Number(m[1]) + Number(m[2]) === Number(i.answer);
    },
  },

  // ===== Exponents, squares ===============================================
  {
    id: "T.SQR.SQUARE",
    skill: "SQR.SQUARE.ROOT",
    questionType: "fill-blanks",
    title: "Find the square root:",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const n = band === "easy" ? int(r, 2, 12) : band === "medium" ? int(r, 13, 25) : int(r, 26, 40);
      // Ask for the root of a perfect square, so the answer is always exact.
      return {
        text: `Find the square root of ${n * n}: ______`,
        answer: String(n),
        load: L(1, 0, band === "hard" ? 2 : 1),
      };
    },
    check: (i) => {
      const m = /square root of (\d+)/.exec(i.text);
      return !!m && Number(i.answer) * Number(i.answer) === Number(m[1]);
    },
  },
  {
    id: "T.EXP.LAWS",
    skill: "EXP.LAWS",
    questionType: "fill-blanks",
    title: "Fill in the blanks:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const base = int(r, 2, band === "easy" ? 5 : 9);
      const p1 = int(r, 2, 5);
      const p2 = int(r, 2, 5);
      return {
        text: `${base}^${p1} × ${base}^${p2} = ${base}^______`,
        answer: String(p1 + p2),
        load: L(1, 0, 2),
      };
    },
    check: (i) => {
      const m = /\^(\d+) × \d+\^(\d+)/.exec(i.text);
      return !!m && Number(m[1]) + Number(m[2]) === Number(i.answer);
    },
  },

  // ===== Percentage and interest ==========================================
  {
    id: "T.PCT.OF.QUANTITY",
    skill: "PCT.OF.QUANTITY",
    questionType: "fill-blanks",
    title: "Find the percentage:",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const pct = band === "easy" ? pick(r, [10, 20, 25, 50]) : band === "medium" ? pick(r, [5, 15, 30, 40, 60]) : pick(r, [12, 18, 35, 45, 75]);
      // A multiple of 100 keeps every percentage of it a whole number, so the
      // answer never lands on a fraction a Class 7 pupil has not met yet.
      const whole = int(r, 2, band === "easy" ? 20 : 60) * 100;
      return {
        text: `Find ${pct}% of ${whole}: ______`,
        answer: String((whole * pct) / 100),
        load: L(2, 0, 2),
      };
    },
    check: (i) => {
      const m = /Find (\d+)% of (\d+)/.exec(i.text);
      if (!m) return false;
      const want = (Number(m[2]) * Number(m[1])) / 100;
      return Number.isInteger(want) && want === Number(i.answer);
    },
  },
  {
    id: "T.PL.SIMPLE.INTEREST",
    skill: "PL.SIMPLE.INTEREST",
    questionType: "short-answer",
    title: "Find the simple interest:",
    bands: ["medium", "hard"],
    build: (r, band, p) => {
      const principal = int(r, 2, band === "medium" ? 20 : 60) * 500;
      const rate = pick(r, [4, 5, 6, 8, 10]);
      const years = int(r, 1, band === "medium" ? 3 : 5);
      const si = (principal * rate * years) / 100;
      return {
        text: `Find the simple interest on ${p.currency}${principal} at ${rate}% per year for ${years} year${years > 1 ? "s" : ""}.`,
        answer: `${p.currency}${si}`,
        load: L(2, 0, 2, 3, 2),
      };
    },
    check: (i) => {
      const m = /on .(\d+) at (\d+)% per year for (\d+)/.exec(i.text);
      if (!m) return false;
      const want = (Number(m[1]) * Number(m[2]) * Number(m[3])) / 100;
      return Number(i.answer.replace(/[^\d]/g, "")) === want;
    },
  },

  // ===== Algebra ==========================================================
  {
    id: "T.EQN.ONE.STEP",
    skill: "EQN.ONE.STEP",
    questionType: "fill-blanks",
    title: "Solve for x:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const x = int(r, 2, band === "easy" ? 12 : 30);
      const k = int(r, 2, band === "easy" ? 9 : 20);
      return { text: `x + ${k} = ${x + k}`, answer: String(x), load: L(1, 0, 2) };
    },
    check: (i) => {
      const m = /^x \+ (\d+) = (\d+)$/.exec(i.text);
      return !!m && Number(m[2]) - Number(m[1]) === Number(i.answer);
    },
  },
  {
    id: "T.EQN.TWO.STEP",
    skill: "EQN.TWO.STEP",
    questionType: "short-answer",
    title: "Solve for x:",
    bands: ["medium", "hard"],
    build: (r, band) => {
      const x = int(r, 2, band === "medium" ? 12 : 25);
      const a = int(r, 2, 9);
      const b = int(r, 1, band === "medium" ? 15 : 40);
      return {
        text: `${a}x + ${b} = ${a * x + b}`,
        answer: `x = ${x}`,
        load: L(2, 0, 2, 2),
      };
    },
    check: (i) => {
      const m = /(\d+)x \+ (\d+) = (\d+)/.exec(i.text);
      const g = /x = (-?\d+)/.exec(i.answer);
      if (!m || !g) return false;
      return Number(m[1]) * Number(g[1]) + Number(m[2]) === Number(m[3]);
    },
  },

  // ===== Mensuration and data =============================================
  {
    id: "T.MEN.TRIANGLE.AREA",
    skill: "MEN.TRIANGLE.AREA",
    questionType: "short-answer",
    title: "Find the area:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      // Even base keeps the half-base-times-height a whole number.
      const base = int(r, 2, band === "easy" ? 12 : 30) * 2;
      const height = int(r, 3, band === "easy" ? 15 : 40);
      return {
        text: `Find the area of a triangle with base ${base} cm and height ${height} cm.`,
        answer: `${(base * height) / 2} sq cm`,
        load: L(2, 0, 2, 2, 2),
      };
    },
    check: (i) => {
      const m = /base (\d+) cm and height (\d+) cm/.exec(i.text);
      if (!m) return false;
      return Number(i.answer.replace(/[^\d]/g, "")) === (Number(m[1]) * Number(m[2])) / 2;
    },
  },
  {
    id: "T.MEN.CUBOID.VOLUME",
    skill: "MEN.CUBOID.VOLUME",
    questionType: "short-answer",
    title: "Find the volume:",
    bands: ["easy", "medium", "hard"],
    build: (r, band) => {
      const cap = band === "easy" ? 9 : band === "medium" ? 18 : 30;
      const l = int(r, 2, cap);
      const b = int(r, 2, cap);
      const h = int(r, 2, cap);
      return {
        text: `Find the volume of a cuboid ${l} cm long, ${b} cm wide and ${h} cm high.`,
        answer: `${l * b * h} cubic cm`,
        load: L(2, 1, 2, 3, 2),
      };
    },
    check: (i) => {
      const m = /(\d+) cm long, (\d+) cm wide and (\d+) cm high/.exec(i.text);
      if (!m) return false;
      return Number(i.answer.replace(/[^\d]/g, "")) === Number(m[1]) * Number(m[2]) * Number(m[3]);
    },
  },
  {
    id: "T.AVG.MEAN",
    skill: "AVG.MEAN",
    questionType: "short-answer",
    title: "Find the mean:",
    bands: ["easy", "medium"],
    build: (r, band) => {
      const count = band === "easy" ? 4 : 5;
      const mean = int(r, 5, band === "easy" ? 20 : 60);
      // Build round a known mean so the answer is exact.
      const nums: number[] = [];
      let running = 0;
      for (let k = 0; k < count - 1; k++) {
        const v = Math.max(1, mean + int(r, -4, 4));
        nums.push(v);
        running += v;
      }
      const last = mean * count - running;
      if (last < 1) return { text: "", answer: "", load: L(1, 0, 1) };
      nums.push(last);
      return {
        text: `Find the mean of ${nums.join(", ")}.`,
        answer: String(mean),
        load: L(2, 0, 2, 2),
      };
    },
    check: (i) => {
      const m = /mean of ([\d, ]+)\./.exec(i.text);
      if (!m) return false;
      const nums = m[1].split(",").map((x) => Number(x.trim()));
      const sum = nums.reduce((a, b) => a + b, 0);
      return sum / nums.length === Number(i.answer);
    },
  },
];

export const TEMPLATES_BY_SKILL = TEMPLATES.reduce<Record<string, Template[]>>(
  (acc, t) => {
    (acc[t.skill] ||= []).push(t);
    return acc;
  },
  {}
);

/**
 * Produce one item, and refuse to return a wrong one.
 *
 * `check` re-derives the answer from the rendered question text rather than
 * from build()'s local variables, so a template whose wording and arithmetic
 * drift apart fails here instead of on a child's desk.
 */
export function generate(
  template: Template,
  r: Rng,
  band: Band,
  profile: PresentationProfile
): GeneratedItem {
  const wanted = template.bands.includes(band) ? band : template.bands[template.bands.length - 1];

  for (let attempt = 0; attempt < 12; attempt++) {
    const built = template.build(r, wanted, profile);
    if (template.check(built)) {
      const item: GeneratedItem = {
        ...built,
        skill: template.skill,
        templateId: template.id,
        title: template.title,
        questionType: template.questionType,
        band: wanted,
      };
      if (item.questionType === "mcq" && item.options) {
        item.options = shuffled(r, item.options);
      }
      return item;
    }
  }
  throw new Error(
    `Template ${template.id} could not produce a verifiable item after 12 attempts`
  );
}

/** MCQ distractors for a numeric answer, when a template wants them. */
export function withNumericOptions(item: GeneratedItem, r: Rng): GeneratedItem {
  const answer = Number(item.answer);
  if (!Number.isFinite(answer)) return item;
  const options = shuffled(r, [item.answer, ...nearMisses(r, answer, 3)]);
  return {
    ...item,
    questionType: "mcq",
    options,
    load: { ...item.load, distractors: 3 },
  };
}
