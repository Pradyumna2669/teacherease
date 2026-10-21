import type {
  PaperSettings,
  Question,
  QuestionType,
  PaperLanguage,
  SubItem,
} from "@/lib/types";
import { DEFAULT_SETTINGS, DEFAULT_TITLES, PAPER_LANGUAGES } from "@/lib/types";
import { splitTitleAndHints } from "./hints";
import { postJson } from "./api-client";

// ===== Scan feature: handwritten paper -> structured questions =====
//
// The vision model returns a deliberately *simplified* shape (ScannedPaper).
// We map it to the builder's full `Question[]` here, filling layout defaults
// the model never sees. Keeping the model's output small makes extraction far
// more reliable than asking it to emit every spacing/layout field.

// Question types the scanner is allowed to emit. Subset of QuestionType that a
// model can confidently infer from an image. Anything else falls back to
// "short-answer".
export const SCANNABLE_TYPES: QuestionType[] = [
  "fill-blanks",
  "short-answer",
  "long-answer",
  "mcq",
  "match",
  "true-false",
  "math-vertical",
  "comprehension",
  "word-problem",
  "composition",
  "picture-composition",
  "draw",
  "table",
];

export interface ScannedItem {
  // The question / sub-item text. For fill-blanks use ___ to mark each blank.
  content: string;
  // Included only when the teacher requests an answer key.
  answer?: string;
  // MCQ choices, if any.
  options?: string[];
  // math-vertical operands.
  num1?: string;
  num2?: string;
  // math-vertical with 3+ operands (e.g. 34 + 37 + 26). All operands in order.
  nums?: string[];
  // SVG diagram or geometric shape data URL for this item
  image?: string;
}

export interface ScannedQuestion {
  type: string; // one of SCANNABLE_TYPES (validated on map)
  title: string; // the instruction line, e.g. "Fill in the blanks:"
  marks: number;
  items: ScannedItem[];
  // Question-level SVG diagrams or figures
  images?: string[];
  // match type
  matchLeft?: string[];
  matchRight?: string[];
  matchLeftHeader?: string;
  matchRightHeader?: string;
  // comprehension type
  passage?: string;
  passageTitle?: string;
  // math-vertical
  operation?: "+" | "-" | "×" | "÷";
  mathQuotientRemainder?: boolean;
  // composition: fill-in sentences
  compositionSentences?: string[];
  writingLines?: number;
  boxHeight?: number;
  // table: row-major grid of cells ("" = blank/fillable cell)
  tableRows?: string[][];
  tableCaption?: string;
  tableHeaderRow?: boolean;
  tableHeaderCol?: boolean;
  tableColWidths?: string[];
  hideItemNumbering?: boolean;
  tfFormat?: "bracket" | "box";
  hints?: string;
  answerNote?: string;
}

export interface ScannedSettings {
  schoolName?: string;
  assessmentTitle?: string;
  subject?: string;
  className?: string;
  totalMarks?: number;
  language?: PaperLanguage;
  answerKey?: boolean;
  instructions?: string[];
}

export interface ScannedPaper {
  settings: ScannedSettings;
  questions: ScannedQuestion[];
}

// JSON Schema handed to the model via output_config.format. Structured outputs
// require additionalProperties:false on every object and no recursion — this
// shape satisfies both.
export const SCAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    settings: {
      type: "object",
      additionalProperties: false,
        properties: {
          schoolName: { type: "string" },
          assessmentTitle: { type: "string" },
          subject: { type: "string" },
          className: { type: "string" },
          totalMarks: { type: "number" },
          language: { type: "string", enum: PAPER_LANGUAGES },
          answerKey: { type: "boolean" },
          instructions: {
            type: "array",
            items: { type: "string" },
            description: "General instructions list for the question paper",
          },
        },
      required: [],
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: {
            type: "string",
            enum: SCANNABLE_TYPES,
            description:
              "Best-matching question type. Use short-answer if unsure.",
          },
          title: {
            type: "string",
            description: "The instruction line for the question.",
          },
          marks: { type: "number" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                content: { type: "string" },
                answer: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                num1: { type: "string" },
                num2: { type: "string" },
                nums: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "All operands in order when a vertical sum has 3 or more numbers (e.g. [\"34\",\"37\",\"26\"]).",
                },
                image: {
                  type: "string",
                  description:
                    "Vector SVG diagram as data URL (e.g. 'data:image/svg+xml,...') for a geometric shape, figure, clock face, angle, or diagram for this item.",
                },
              },
              required: ["content"],
            },
          },
          images: {
            type: "array",
            items: { type: "string" },
            description:
              "Vector SVG diagrams as data URLs (e.g. 'data:image/svg+xml,...') for geometric figures, shapes, angles, or diagrams in this question.",
          },
          matchLeft: { type: "array", items: { type: "string" } },
          matchRight: { type: "array", items: { type: "string" } },
          matchLeftHeader: {
            type: "string",
            description: "Header for Column A (e.g. 'Group A', 'Column A', 'अ गट').",
          },
          matchRightHeader: {
            type: "string",
            description: "Header for Column B (e.g. 'Group B', 'Column B', 'ब गट').",
          },
          passage: { type: "string" },
          passageTitle: { type: "string" },
          operation: { type: "string", enum: ["+", "-", "×", "÷"] },
          compositionSentences: { type: "array", items: { type: "string" } },
          tableRows: {
            type: "array",
            description:
              "Table as a row-major grid. Each inner array is one row of cell strings. Use an empty string \"\" for a blank cell the student must fill.",
            items: { type: "array", items: { type: "string" } },
          },
          tableCaption: { type: "string" },
          tableHeaderRow: { type: "boolean" },
          tableHeaderCol: { type: "boolean" },
          hideItemNumbering: {
            type: "boolean",
            description:
              "Set to true if sub-items should NOT have a), b), c) numbering (e.g. lines of a poem / stanza in fill-in-the-blanks).",
          },
          tfFormat: {
            type: "string",
            enum: ["bracket", "box"],
            description:
              "For true-false: 'box' for square tick/cross box [ ], 'bracket' for ( _____ ).",
          },
          hints: {
            type: "string",
            description:
              "Optional word bank, bracket clues, or help-box words (e.g. '(sweets, diyas, lights)'). Keep separate from the question title.",
          },
          writingLines: {
            type: "number",
            description: "Number of ruled writing rows for composition or drawing/writing questions.",
          },
          boxHeight: {
            type: "number",
            description: "Height in pt for drawing box (e.g. 90 to 140 pt).",
          },
          answerNote: { type: "string" },
        },
        required: ["type", "title", "marks", "items"],
      },
    },
  },
  required: ["settings", "questions"],
} as const;

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

// Strip ONE leading question/sub-part enumerator the teacher wrote on the paper
// (e.g. "Q.1)", "1.", "a)", "(iv)", "Q. 2") so it isn't duplicated by the
// builder's own auto-numbering — the double "Q.1) Q. 1", "a) a)" problem.
//
// Conservative on purpose: only strips a recognised label token that ends in
// ) . or : . A bare number with no trailing punctuation is left alone, so
// genuine content like "101 + 6 =" or "7 × 8 = ___" is never touched.
const LEADING_LABEL_RE = new RegExp(
  "^\\s*(?:" +
    "Q\\s*\\.?\\s*\\d+\\s*[).:]?" + //  Q1  Q.1  Q. 2  Q.1)
    "|\\(?\\s*\\d{1,3}\\s*[).:]" + //   1.  1)  (1)  12:
    "|\\(?\\s*[A-Za-z]\\s*[).:]" + //   a)  a.  (a)  A:
    "|\\(?\\s*[ivxlcdmIVXLCDM]{1,4}\\s*[).:]" + // i)  (iv)  II.
    ")\\s*"
);

export function stripLeadingLabel(s: string | undefined): string {
  if (!s) return s ?? "";
  const out = s.replace(LEADING_LABEL_RE, "");
  // Never blank out a cell that was nothing but a label-like token.
  return out.trim().length ? out.trimStart() : s;
}

export function normalizeSvgDataUrl(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  if (trimmed.startsWith("<svg") || trimmed.includes("<svg")) {
    const svgContent = trimmed.replace(/^```(?:svg|xml)?/i, "").replace(/```$/, "").trim();
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
  }
  return trimmed;
}

function toSubItem(it: ScannedItem): SubItem {
  return {
    id: newId(),
    content: stripLeadingLabel(it.content),
    answer: it.answer?.trim() || undefined,
    options: it.options?.map(stripLeadingLabel),
    num1: it.num1,
    num2: it.num2,
    nums:
      Array.isArray(it.nums) && it.nums.length >= 2 ? it.nums : undefined,
    lines: 1,
    image: normalizeSvgDataUrl(it.image),
  };
}

// Map one scanned question to a full builder Question, applying type-specific
// defaults so the editors and PrintPreview render it correctly.
export function scannedToQuestion(sq: ScannedQuestion): Question {
  const type: QuestionType = SCANNABLE_TYPES.includes(sq.type as QuestionType)
    ? (sq.type as QuestionType)
    : "short-answer";

  const rawTitle = stripLeadingLabel(sq.title).trim() || DEFAULT_TITLES[type];
  const { title: cleanTitle, hints: splitHints } = splitTitleAndHints(rawTitle);
  const title = sq.hints ? rawTitle : cleanTitle;
  const hints = sq.hints?.trim() || splitHints;

  const q: Question = {
    id: newId(),
    type,
    title,
    marks: Number.isFinite(sq.marks) ? sq.marks : 5,
    items: (sq.items ?? []).map(toSubItem),
    columnsPerRow: type === "math-vertical" ? 4 : type === "mcq" ? 2 : 1,
    hints: hints || undefined,
  };
  if (Array.isArray(sq.images) && sq.images.length > 0) {
    q.images = sq.images.map(normalizeSvgDataUrl).filter(Boolean) as string[];
  }
  if (sq.matchLeftHeader) q.matchLeftHeader = sq.matchLeftHeader.trim();
  if (sq.matchRightHeader) q.matchRightHeader = sq.matchRightHeader.trim();
  if (typeof (sq as ScannedQuestion & { answerNote?: string }).answerNote === "string") {
    q.answerNote = (sq as ScannedQuestion & { answerNote?: string }).answerNote?.trim() || undefined;
  }

  if (sq.hideItemNumbering !== undefined) {
    q.hideItemNumbering = sq.hideItemNumbering;
  }

  const titleLower = q.title.toLowerCase();
  const isTickCrossOrTrueFalse =
    titleLower.includes("(✓)") ||
    titleLower.includes("(✔)") ||
    titleLower.includes("(✗)") ||
    titleLower.includes("(x)") ||
    titleLower.includes("put (✓") ||
    titleLower.includes("put (✔") ||
    titleLower.includes("put (x") ||
    titleLower.includes("tick (✓") ||
    titleLower.includes("tick (✔") ||
    titleLower.includes("tick the") ||
    titleLower.includes("tick (") ||
    titleLower.includes("true or false") ||
    titleLower.includes("true/false") ||
    titleLower.includes("state whether true") ||
    titleLower.includes("right or wrong") ||
    titleLower.includes("yes or no");

  let effectiveType = type;
  if (effectiveType === "short-answer" && isTickCrossOrTrueFalse) {
    effectiveType = "true-false";
    q.type = "true-false";
  } else if (
    effectiveType === "short-answer" &&
    (titleLower.includes("चित्र काढ") ||
      titleLower.includes("चित्र बनवा") ||
      titleLower.includes("draw a picture") ||
      titleLower.includes("draw the picture") ||
      titleLower.includes("draw and colour") ||
      titleLower.includes("draw and write"))
  ) {
    effectiveType = "draw";
    q.type = "draw";
  }

  switch (effectiveType) {
    case "true-false": {
      const isBox =
        sq.tfFormat === "box" ||
        titleLower.includes("(✓)") ||
        titleLower.includes("(✔)") ||
        titleLower.includes("(✗)") ||
        titleLower.includes("(x)") ||
        titleLower.includes("tick") ||
        titleLower.includes("put (✓") ||
        titleLower.includes("put (✔") ||
        titleLower.includes("box");
      q.tfFormat = isBox ? "box" : (sq.tfFormat ?? "bracket");
      q.tfAnswerPosition = "inline";
      if (q.items.length >= 4 && (!q.columnsPerRow || q.columnsPerRow === 1)) {
        const maxLen = Math.max(...q.items.map((it) => it.content.length), 0);
        if (maxLen <= 25) {
          q.columnsPerRow = 2;
        }
      }
      break;
    }
    case "fill-blanks": {
      if (sq.hideItemNumbering !== undefined) {
        q.hideItemNumbering = sq.hideItemNumbering;
      } else if (
        titleLower.includes("poem") ||
        titleLower.includes("stanza") ||
        titleLower.includes("lines of the poem")
      ) {
        q.hideItemNumbering = true;
      }
      break;
    }
    case "short-answer": {
      const titleLower = q.title.toLowerCase();
      // Auto-detect if this is a division sum with Quotient and Remainder
      const isDivQR =
        (titleLower.includes("divide") && (titleLower.includes("quotient") || titleLower.includes("remainder"))) ||
        (q.items && q.items.length > 0 && q.items.some((it) => /÷|\//.test(it.content || "") && /q\s*=/i.test(it.content || "")));

      if (isDivQR) {
        q.type = "math-vertical";
        q.operation = "÷";
        q.mathQuotientRemainder = true;
        q.mathAnswerSpace = 50;
        q.columnsPerRow = 2;
        q.items = q.items.map((it) => {
          const m = (it.content || "").match(/(\d+)\s*(?:÷|\/)\s*(\d+)/);
          if (m) {
            return { ...it, num1: m[1], num2: m[2] };
          }
          return it;
        });
        break;
      }

      let defaultLines = 1;
      if (
        titleLower.includes("2/3 sentence") ||
        titleLower.includes("2 to 3 sentence") ||
        titleLower.includes("two or three sentence") ||
        titleLower.includes("3/4 sentence") ||
        titleLower.includes("short answer") ||
        titleLower.includes("brief") ||
        titleLower.includes("20-30 word") ||
        titleLower.includes("30-40 word")
      ) {
        defaultLines = 3;
      }
      q.items = q.items.map((it) => ({
        ...it,
        lines: it.lines && it.lines > 1 ? it.lines : defaultLines,
      }));
      break;
    }
    case "long-answer":
      q.items = q.items.map((it) => ({ ...it, lines: 4 }));
      break;
    case "match": {
      const left = (sq.matchLeft ?? []).map(stripLeadingLabel);
      const right = (sq.matchRight ?? []).map(stripLeadingLabel);
      // Pad Column A if Column B has extra distractor choices (e.g. 5 choices vs 4 questions to confuse students)
      while (left.length < right.length) {
        left.push("");
      }
      q.matchLeft = left;
      q.matchRight = right;
      q.items = [];
      q.matchRightLabel = "letters";
      if (q.marks <= 0) {
        const pairCount = Math.max(left.filter(Boolean).length, right.filter(Boolean).length);
        q.marks = Math.max(1, Math.round(pairCount / 2));
      }
      break;
    }
    case "comprehension":
      q.passage = sq.passage ?? "";
      if (sq.passageTitle) q.passageTitle = sq.passageTitle.trim();
      q.items = q.items.map((it) => {
        const isBlank =
          it.content.includes("___") ||
          /fill in the blank|complete the/i.test(it.content);
        return {
          ...it,
          lines: isBlank ? 0 : (it.lines ?? 1),
        };
      });
      break;
    case "math-vertical":
      q.operation = sq.operation ?? "+";
      if (q.operation === "÷") {
        q.mathQuotientRemainder = sq.mathQuotientRemainder ?? /quotient/i.test(sq.title || "");
        q.mathAnswerSpace = 50;
        q.columnsPerRow = 2;
      }
      break;
    case "word-problem":
      q.wpOperationBox = true;
      q.wpBoxPosition = "right";
      q.wpBoxWidth = 150;
      q.wpBoxHeight = 70;
      q.items = q.items.map((it) => ({ ...it, lines: 2 }));
      break;
    case "composition":
      q.compositionSentences = (
        sq.compositionSentences ?? q.items.map((it) => it.content)
      ).map(stripLeadingLabel);
      q.writingLines = sq.writingLines || 12;
      q.items = [];
      break;
    case "picture-composition":
      q.writingLines = sq.writingLines || 8;
      break;
    case "draw": {
      q.boxHeight = sq.boxHeight || 100;
      // Extract number of writing lines if mentioned in question title (e.g. "चार-पाच वाक्ये", "दोन ओळी", "5 lines", "4 sentences")
      if (sq.writingLines) {
        q.writingLines = sq.writingLines;
      } else {
        const tLower = q.title.toLowerCase();
        const mLines =
          tLower.match(/(?:दोन|२|2)\s*(?:ओळी|वाक्य|line|sentence)/) ? 2 :
          tLower.match(/(?:तीन|३|3)\s*(?:ओळी|वाक्य|line|sentence)/) ? 3 :
          tLower.match(/(?:चार|४|4)\s*(?:ओळी|वाक्य|line|sentence)/) ? 4 :
          tLower.match(/(?:चार-पाच|४-५|4-5|पाच|५|5)\s*(?:ओळी|वाक्य|line|sentence)/) ? 5 :
          tLower.match(/(\d+)\s*(?:ओळी|वाक्य|lines?|sentences?)/i) ? parseInt(RegExp.$1, 10) :
          0;
        if (mLines > 0) {
          q.writingLines = mLines;
        }
      }
      break;
    }
    case "table":
      q.tableRows =
        Array.isArray(sq.tableRows) && sq.tableRows.length
          ? sq.tableRows.map((r) => (Array.isArray(r) ? r.map((c) => c ?? "") : []))
          : [
              ["", ""],
              ["", ""],
            ];
      q.tableCaption = sq.tableCaption ?? "";
      q.tableHeaderRow = sq.tableHeaderRow ?? true;
      q.tableHeaderCol = sq.tableHeaderCol ?? false;
      q.tableCellMinHeight = 22;
      // Any sub-questions stay in items[] (rendered below the table).
      break;
  }

  // Ensure real questions with items/content never get set to 0 marks unless explicitly a section header
  if (q.marks <= 0 && (q.items.length > 0 || (q.matchLeft && q.matchLeft.length > 0) || (q.tableRows && q.tableRows.length > 0))) {
    const isSection = /^(Section|विभाग|Part|खण्ड|भाग|Instructions?|सूचना)\s+[A-Za-z0-9०-९]/i.test(q.title.trim());
    if (!isSection) {
      q.marks = q.items.length > 0 ? Math.max(1, q.items.length) : 2;
    }
  }

  return q;
}

export function scannedToQuestions(qs: ScannedQuestion[]): Question[] {
  return (qs ?? []).map(scannedToQuestion);
}

// Merge scanned header fields into existing settings.
//
// `firstScan` is what makes this safe in both directions, and it has to be
// passed rather than inferred:
//
// On the first scan the photograph is the best evidence there is. A new paper
// arrives pre-seeded from the teacher's previous one (see seedSettings), so its
// header says Maths / Class II while she is photographing Science / Class V —
// guesses from another paper must lose to what is actually on the page.
//
// On a later scan she has had the chance to correct things, so only fields she
// has left blank may be filled. Otherwise "scan page 1 → correct the class
// II→V → scan page 2" silently puts II back, page 2 being photographed from the
// same header.
export function mergeScannedSettings(
  base: PaperSettings,
  s: ScannedSettings,
  firstScan: boolean
): PaperSettings {
  // Blank counts as undecided too — the seeded defaults are empty strings.
  const undecided = (key: keyof PaperSettings) =>
    firstScan || !base[key] || base[key] === DEFAULT_SETTINGS[key];

  const text = (
    key: "schoolName" | "assessmentTitle" | "subject" | "className"
  ) => {
    const scanned = s[key]?.trim();
    return scanned && undecided(key) ? scanned : base[key];
  };

  return {
    ...base,
    schoolName: text("schoolName"),
    assessmentTitle: text("assessmentTitle"),
    subject: text("subject"),
    className: text("className"),
    language:
      s.language && undecided("language") ? s.language : base.language,
    totalMarks:
      typeof s.totalMarks === "number" &&
      s.totalMarks > 0 &&
      undecided("totalMarks")
        ? s.totalMarks
        : base.totalMarks,
    instructions:
      Array.isArray(s.instructions) && s.instructions.length > 0 && (firstScan || !base.instructions?.length)
        ? s.instructions
        : base.instructions,
  };
}

// ===== Client helper =====

export interface ScanResponse {
  paper?: ScannedPaper;
  error?: string;
}

/** Thrown when the caller gave up on a scan — cancel button or timeout. */
export class ScanAborted extends Error {
  constructor() {
    super("Scan cancelled.");
    this.name = "ScanAborted";
  }
}

// Give up waiting the moment the signal fires. postJson owns the fetch and
// takes no signal, so the upload itself is not recalled — but the teacher gets
// her photos and her modal back immediately, which today costs her the app.
function untilAborted<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new ScanAborted());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new ScanAborted());
    signal.addEventListener("abort", onAbort, { once: true });
    work
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}

// POST base64 data-URL images to the scan endpoint. paperId (the paper being
// built) is passed through so the scan's credit-ledger row refs the paper —
// which is how the admin view tells a scanned paper from a typed one.
export async function scanImages(
  images: string[],
  paperId?: string,
  signal?: AbortSignal
): Promise<ScannedPaper> {
  const request = postJson<ScanResponse>("/api/scan", { images, paperId });
  const data = signal ? await untilAborted(request, signal) : await request;
  if (!data.paper) {
    throw new Error(data.error || "Scan failed. Please try again.");
  }
  return data.paper;
}
