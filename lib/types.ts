import {
  PAPER_LANGUAGES,
  SCRIPT_FONT,
  scriptOf,
  localizeNumber,
  type PaperLanguage,
} from "./languages";

// Language data now lives in one registry (lib/languages.ts). Re-exported here
// so existing `@/lib/types` imports keep working.
export type { PaperLanguage };
export {
  PAPER_LANGUAGE_LABELS,
  DEFAULT_TITLES,
  PAPER_LANGUAGES,
  titlesFor,
  copyFor,
  itcOf,
  dirOf,
  localizeNumber,
  answerPrefixFor,
} from "./languages";

export type HeaderStyle =
  | "clean"
  | "boxed"
  | "double-border"
  | "formal"
  | "rounded"
  | "banner";

export const HEADER_STYLE_LABELS: Record<HeaderStyle, string> = {
  clean: "Clean",
  boxed: "Boxed",
  "double-border": "Double Border",
  formal: "Formal",
  rounded: "Rounded",
  banner: "Banner",
};

// ===== Header layout =====
// The student-info block used to be hardcoded as two fixed rows. Schools order
// these differently — some want Roll No first, some need Section or Time, some
// want Marks on its own line — so the rows are data now. Each row is a list of
// slots laid out left-to-right and spaced apart.
export type HeaderField =
  | "name"
  | "rollNo"
  | "className"
  | "section"
  | "subject"
  | "date"
  | "marks"
  | "time"
  | "blank";

export const HEADER_FIELD_LABELS: Record<HeaderField, string> = {
  name: "Name",
  rollNo: "Roll No",
  className: "Class",
  section: "Section / Div",
  subject: "Subject",
  date: "Date",
  marks: "Total marks",
  time: "Time allowed",
  blank: "— empty —",
};

// Fields that print a blank rule for the student to fill in, rather than a
// value the teacher set.
export const HEADER_WRITE_IN: HeaderField[] = ["name", "rollNo", "date"];

export const MAX_HEADER_ROWS = 4;
export const MAX_HEADER_SLOTS = 4;

export const DEFAULT_HEADER_ROWS: HeaderField[][] = [
  ["name", "rollNo", "marks"],
  ["subject", "className", "date"],
];

// ===== Match the following =====
// Column A has always been numbered 1) 2) 3). Teachers asked to label Column B
// too — usually a) b) c) so a student can write "1-c" — so both columns are
// configurable, and either can be turned off.
export type MatchLabel = "none" | "numbers" | "letters";

// Horizontal alignment shared by table cells and question images.
export type CellAlign = "left" | "center" | "right";

export const CELL_ALIGN_OPTIONS: { value: CellAlign; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
];

export const MATCH_LABEL_OPTIONS: { value: MatchLabel; label: string }[] = [
  { value: "none", label: "No labels" },
  { value: "numbers", label: "1) 2) 3)" },
  { value: "letters", label: "a) b) c)" },
];

export function matchLabelFor(kind: MatchLabel, index: number, language?: PaperLanguage): string {
  if (kind === "numbers") {
    const n = index + 1;
    return `${language ? localizeNumber(n, language) : n}) `;
  }
  if (kind === "letters") {
    // Past 26 items, continue aa) ab) rather than running out.
    let n = index;
    let out = "";
    do {
      out = String.fromCharCode(97 + (n % 26)) + out;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return `${out}) `;
  }
  return "";
}

// Writing-line ruling for answer rows.
// "single"   = one plain underline per line (default).
// "four-line" = English handwriting ruling (red/blue/blue/red) for class 1, 2, etc.
export type LineStyle = "single" | "four-line";

export const LINE_STYLE_LABELS: Record<LineStyle, string> = {
  single: "Single Line",
  "four-line": "Four Line",
};

// ===== Layout & density (page-efficiency controls) =====

// Master spacing preset. Crunches gaps/line-height/answer-row height in one click.
export type Density = "comfortable" | "compact" | "ultra";
// Whole-paper column flow. 2 columns packs short items and saves pages.
export type PageColumns = 1 | 2;
// Page margins — narrower margins = more content per page.
export type PageMargin = "narrow" | "normal" | "wide";
export type FontFamily = "serif" | "sans";

export const DENSITY_LABELS: Record<Density, string> = {
  comfortable: "Comfortable",
  compact: "Compact",
  ultra: "Ultra Compact",
};

export const MARGIN_LABELS: Record<PageMargin, string> = {
  narrow: "Narrow",
  normal: "Normal",
  wide: "Wide",
};

export const FONT_FAMILY_LABELS: Record<FontFamily, string> = {
  serif: "Serif (Times)",
  sans: "Sans (Arial)",
};

// Spacing metrics derived from a density preset. Values are pt unless noted.
export interface DensityMetrics {
  qGap: number; // gap above each question
  itemGap: number; // gap between sub-items / answer rows
  ansHeight: number; // answer-line row height
  titleGap: number; // gap below question title
  lineHeight: number; // unitless line-height
}

export const DENSITY_METRICS: Record<Density, DensityMetrics> = {
  comfortable: { qGap: 12, itemGap: 6, ansHeight: 18, titleGap: 4, lineHeight: 1.5 },
  compact: { qGap: 8, itemGap: 4, ansHeight: 15, titleGap: 3, lineHeight: 1.3 },
  ultra: { qGap: 5, itemGap: 2, ansHeight: 12, titleGap: 2, lineHeight: 1.15 },
};

export const FONT_FAMILY_STACK: Record<FontFamily, string> = {
  serif: 'var(--font-display), Georgia, "Times New Roman", serif',
  sans: 'var(--font-sans), Arial, "Helvetica Neue", sans-serif',
};

// Build a print-safe font-family stack for one language + serif/sans slot. A
// var() with an inline fallback means the SAME string works both in the live app
// (next/font defines the variable → real Noto webfont for preview + PDF) and in
// the print pop-up window (variable undefined → OS fonts like Nirmala UI /
// Kohinoor render the script instead of tofu).
function buildLanguageStack(lang: PaperLanguage, family: FontFamily): string {
  const script = scriptOf(lang);
  if (script === "latin") return FONT_FAMILY_STACK[family];
  const sf = SCRIPT_FONT[script];
  const quote = (f: string) => (/\s/.test(f) ? `"${f}"` : f);
  const os = sf.os.map(quote);
  const varName =
    family === "serif" ? sf.serifVar ?? sf.sansVar : sf.sansVar ?? sf.serifVar;
  const primary = varName ? `var(${varName}, ${os[0] ?? "sans-serif"})` : null;
  const tail =
    family === "serif"
      ? ["Georgia", '"Times New Roman"', "serif"]
      : ["Arial", '"Helvetica Neue"', "sans-serif"];
  return [primary, ...os, ...tail].filter(Boolean).join(", ");
}

export const PAPER_LANGUAGE_FONT_STACK = Object.fromEntries(
  PAPER_LANGUAGES.map((l) => [
    l,
    { serif: buildLanguageStack(l, "serif"), sans: buildLanguageStack(l, "sans") },
  ])
) as Record<PaperLanguage, Record<FontFamily, string>>;

// Page margins in mm (for @page / PDF) and equivalent preview padding in pt.
export const MARGIN_VALUES: Record<
  PageMargin,
  { print: string; pdf: [number, number, number, number]; preview: string }
> = {
  narrow: { print: "1cm 1.2cm", pdf: [8, 10, 8, 10], preview: "18pt 20pt" },
  normal: { print: "1.5cm 1.8cm", pdf: [10, 12, 10, 12], preview: "28pt 32pt" },
  wide: { print: "2cm 2.5cm", pdf: [16, 20, 16, 20], preview: "40pt 48pt" },
};

export interface PaperSettings {
  language: PaperLanguage;
  schoolName: string;
  assessmentTitle: string;
  academicYear: string;
  subject: string;
  className: string;
  totalMarks: number;
  headerStyle: HeaderStyle;
  /** Student-info rows printed under the title. See HeaderField. */
  headerRows: HeaderField[][];
  /** Shown when a header row includes "time" (e.g. "1 hr 30 min"). */
  timeAllowed: string;
  /** Shown when a header row includes "section". */
  section: string;
  lineStyle: LineStyle;
  /** Print student writing space under answerable questions. */
  showAnswerSpace: boolean;
  // Layout & density
  density: Density;
  pageColumns: PageColumns;
  margin: PageMargin;
  fontFamily: FontFamily;
  fontSize: number; // base font size in pt
  /** Print an answer key after the paper. Off unless the teacher turns it on —
   *  most papers are handed to students, and a key on those is a disaster. */
  answerKey: boolean;
  /** General instructions printed between the header and the first question.
   *  Each string is one numbered instruction line. */
  instructions?: string[];
  /** Show answer-marking boxes next to MCQ options (default true). When the
   *  options already carry (a) (b) (c) labels, some teachers prefer them off. */
  mcqOptionBox?: boolean;
  /** School emblem or logo image URL/data URI */
  logoUrl?: string;
  /** School affiliation, motto, or branch line (e.g. CBSE Affiliation No. 12345) */
  schoolSubtitle?: string;
  // Higher-Ed / College Mode extensions
  institutionType?: "school" | "college" | "university";
  layoutMode?: "standard" | "college_table";
  variant?: "normal" | "backlog" | "set_a" | "set_b";
  cycleId?: string;
  cycleName?: string;
  program?: string;
  courseCode?: string;
  semester?: number;
  department?: string;
}

export type PaperStatus = "draft" | "in_review" | "approved" | "changes_requested";

export interface SchoolBranding {
  schoolId: string;
  name: string;
  logoUrl?: string;
  address?: string;
  affiliation?: string;
  defaultHeader?: Partial<PaperSettings>;
}

export interface SchoolTemplate {
  id: string;
  school_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  class_name?: string | null;
  settings: Partial<PaperSettings>;
  sections: Question[];
  created_at: string;
}

export interface SchoolReviewItem {
  id: string;
  title: string;
  subject: string | null;
  class_name: string | null;
  status: PaperStatus;
  review_feedback?: string | null;
  user_id: string;
  author_email?: string;
  question_count: number;
  total_marks: number;
  updated_at: string;
  reviewed_at?: string | null;
}

// Every field that names a school, a class or an exam starts empty. These used
// to be seeded with one real school's details, so a teacher who overlooked a
// field printed her exam under a stranger's name — and PrintPreview already
// shows "School Name" / "Subject" for a blank, which reads as fill-me-in. From
// her second paper on, seedSettings() fills them from her own last paper.
export const DEFAULT_SETTINGS: PaperSettings = {
  language: "english",
  schoolName: "",
  assessmentTitle: "",
  academicYear: "",
  subject: "",
  className: "",
  totalMarks: 40,
  headerStyle: "boxed",
  headerRows: DEFAULT_HEADER_ROWS.map((r) => [...r]),
  timeAllowed: "1 hr",
  section: "",
  lineStyle: "single",
  showAnswerSpace: true,
  density: "comfortable",
  pageColumns: 1,
  margin: "normal",
  fontFamily: "serif",
  fontSize: 12,
  answerKey: false,
  mcqOptionBox: false,
  instructions: [],
  logoUrl: "",
  schoolSubtitle: "",
  institutionType: "school",
  layoutMode: "standard",
  variant: "normal",
};

// Settings a new paper may inherit from the teacher's previous one. Nothing in
// PaperSettings is question content, so this is the whole interface today —
// listed key by key rather than spread wholesale, so a field added later has to
// be considered before it travels between papers.
// `answerKey` is deliberately absent: it must not carry over from the last
// paper. Forgetting a toggle that is on is how a class gets handed the answers.
export const INHERITED_SETTING_KEYS: (keyof PaperSettings)[] = [
  "language",
  "schoolName",
  "schoolSubtitle",
  "institutionType",
  "layoutMode",
  "courseCode",
  "program",
  "department",
  "semester",
  "logoUrl",
  "academicYear",
  "className",
  "totalMarks",
  "headerStyle",
  "headerRows",
  "timeAllowed",
  "section",
  "lineStyle",
  "showAnswerSpace",
  "density",
  "pageColumns",
  "margin",
  "fontFamily",
  "fontSize",
  "mcqOptionBox",
  "instructions",
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// Both sources are untyped — one is jsonb read back from the database, the
// other is a request body — so a value is only taken when it has the shape of
// the default it would replace.
function usableSetting(key: keyof PaperSettings, value: unknown): boolean {
  const fallback = DEFAULT_SETTINGS[key];
  if (Array.isArray(fallback)) return Array.isArray(value);
  if (typeof fallback === "number")
    return typeof value === "number" && Number.isFinite(value);
  return typeof value === typeof fallback;
}

function isDefaultSetting(key: keyof PaperSettings, value: unknown): boolean {
  const fallback = DEFAULT_SETTINGS[key];
  if (Array.isArray(fallback)) return JSON.stringify(value) === JSON.stringify(fallback);
  return value === fallback;
}

/**
 * Header settings for a brand-new paper: the teacher's own most recent paper
 * fills in what the caller did not choose, and the defaults fill in the rest.
 *
 * The choice is made once for the whole object, not field by field. A caller
 * that posts the bare defaults — the dashboard's New Paper button, the scan
 * shortcut — chose nothing and gets the previous paper's header. A caller that
 * posts anything else chose all of it: duplicating last term's paper must copy
 * its header exactly, and a field of it that happens to match a default is
 * still that paper's, not a newer one's.
 */
export function seedSettings(previous?: unknown, incoming?: unknown): PaperSettings {
  // headerRows on the default is a live array — a server process seeding every
  // teacher's paper must not hand out the same one.
  const seeded: PaperSettings = {
    ...DEFAULT_SETTINGS,
    headerRows: DEFAULT_SETTINGS.headerRows.map((r) => [...r]),
  };
  const sent = asRecord(incoming);
  const chosen = INHERITED_SETTING_KEYS.some(
    (key) => usableSetting(key, sent[key]) && !isDefaultSetting(key, sent[key])
  );
  const source = chosen ? sent : asRecord(previous);
  const take = <K extends keyof PaperSettings>(key: K, value: unknown) => {
    if (usableSetting(key, value)) seeded[key] = value as PaperSettings[K];
  };
  for (const key of INHERITED_SETTING_KEYS) take(key, source[key]);
  return seeded;
}

export type QuestionType =
  | "fill-blanks"
  | "short-answer"
  | "long-answer"
  | "mcq"
  | "match"
  | "true-false"
  | "math-vertical"
  | "comprehension"
  | "word-problem"
  | "composition"
  // Image / handwriting / early-grade types
  | "picture-composition"
  | "handwriting"
  | "dictation"
  | "draw"
  | "label-image"
  // Data table / grid (e.g. pictograph data, fill-in tables).
  | "table"
  // Reasoning / source-based types used from upper primary upwards.
  | "assertion-reason"
  | "case-study"
  | "diagram-label"
  | "odd-one-out"
  | "rearrange"
  | "word-search"
  // Freeform: mix text, blanks, boxes and ruled lines in any order.
  | "custom";

// Per-question spacing overrides. Any field left undefined falls back to the
// paper-wide density preset, so a question takes only the space it needs.
export interface QuestionSpacing {
  qGap?: number; // gap above this question (pt)
  itemGap?: number; // gap between sub-items / rows (pt)
  ansHeight?: number; // answer-line row height (pt)
}

// One block inside a "custom" freeform question.
export type CustomBlockKind = "text" | "lines" | "box" | "spacer";
export interface CustomBlock {
  id: string;
  kind: CustomBlockKind;
  text?: string; // text/heading content (supports ___ blanks)
  bold?: boolean; // render text block bold
  lines?: number; // number of ruled rows (kind="lines")
  ruling?: "single" | "four-line"; // ruling style for lines
  height?: number; // box / spacer height in pt
}

// Per-question ruling for writing space. "inline" keeps just the ___ blank.
export type BlankLineStyle = "inline" | "single" | "four-line";

export interface SubItem {
  id: string;
  content: string;
  /** Printed in the answer key, never on the question paper itself. Optional
   *  everywhere: a teacher who does not want a key never sees the field. */
  answer?: string;
  /** Second line of a two-part item — the Reason in an assertion-reason pair. */
  secondary?: string;
  options?: string[];
  num1?: string;
  num2?: string;
  // math-vertical: 3+ operands (e.g. 34 + 37 + 26). When present this wins over
  // num1/num2. Kept separate so old two-operand sums still work.
  nums?: string[];
  lines?: number;
  /** Optional marks for sub-questions (e.g. comprehension/case-study sub-items). */
  marks?: number | string;
  // Image attached to this sub-item (base64 data URL)
  image?: string;
  imageWidth?: number; // width in pt for print (default 80)
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  marks: number;
  /** Optional word bank, bracket clues, or hints printed below the question heading in normal weight and smaller font. */
  hints?: string;
  /** Answer for a question that is not a list of items — the pairing for a
   *  match, the filled table, a worked solution. Also printed only in the key. */
  answerNote?: string;
  items: SubItem[];
  // Match type
  matchLeft?: string[];
  matchRight?: string[];
  matchLeftHeader?: string;
  matchRightHeader?: string;
  /** Label style for Column A. Defaults to numbers. */
  matchLeftLabel?: MatchLabel;
  /** Label style for Column B. Defaults to none (off). */
  matchRightLabel?: MatchLabel;
  /** Vertical rule between Column A and Column B. */
  matchDivider?: boolean;
  // Comprehension type
  passage?: string;
  passageTitle?: string;
  /** Number of columns for reading passage / poem: 1 (default) or 2 */
  passageColumns?: number;
  /** Boxed border around passage / poem (default false or auto if 2 columns) */
  passageBorder?: boolean;
  // Math type
  operation?: "+" | "-" | "×" | "÷";
  // ===== True / False / Tick & Cross =====
  // The answer marker used to sit hard right, far from the statement it belongs
  // to. "inline" puts a wide blank straight after the text instead.
  tfAnswerPosition?: "inline" | "right"; // default "inline"
  tfBlankWidth?: number; // pt, default 70
  /** Answer marker format: "bracket" ( ( _____ ) ) or "box" (square checkbox [ ] for tick/cross). Default "bracket" */
  tfFormat?: "bracket" | "box";

  // Composition type
  compositionSentences?: string[];
  // Outcome-Based Education (OBE) & Higher-Ed fields
  unit_no?: number;
  co_no?: number;
  bt_level?: number;
  difficulty?: string;
  image_url?: string;
  part?: "A" | "B";
  q_no?: number;
  sub_no?: number;
  /** Number the composition prompts 1) 2) 3). Default true. */
  compositionNumbered?: boolean;
  /** Hide item numbering (e.g. for poem stanzas / continuous lines). Default false. */
  hideItemNumbering?: boolean;

  // ===== Question images =====
  // Both default to true only when there is more than one image: a single
  // picture-composition image needs no "1)" label and no caption rule under it.
  imageNumbers?: boolean;
  imageCaptionLine?: boolean;
  /** Where a picture sits on the page. Default "center". */
  imageAlign?: CellAlign;
  /** Printed height cap in pt. Default 100 — small for a full-page picture. */
  imageMaxHeight?: number;

  // ===== Table / data grid =====
  // ===== Assertion & Reason =====
  /** The four standard choices. Defaults to AR_DEFAULT_OPTIONS. */
  arOptions?: string[];

  // ===== Case study =====
  /** Heading printed above the source text. */
  caseSourceLabel?: string;
  /** Number sub-questions (i) (ii) (iii) instead of 1) 2) 3). */
  caseRomanNumerals?: boolean;

  // ===== Word search =====
  /** Letter grid, row-major. Generated in the editor and stored, so the printed
      sheet always matches the preview the teacher approved. */
  puzzleGrid?: string[][];

  /** Per-column text alignment. Missing entries fall back to tableAlignDefault. */
  tableAlign?: CellAlign[];
  /** Alignment for columns with no explicit entry. Default "center". */
  tableAlignDefault?: CellAlign;
  // Layout
  columnsPerRow?: number;
  /** Answer line placement for short-answer: "inline" (line in front / same line) or "below". */
  answerLinePlacement?: "inline" | "below";
  // Question-level images (base64 data URLs) — shown before sub-items
  images?: string[];
  imageColumns?: number; // how many images per row (default 2)
  // Fill-in-the-blanks: ruling for the writing space under each item
  blankLineStyle?: BlankLineStyle; // default "inline"
  blankLines?: number; // rows per item when ruled (default 1)
  // Picture composition / dictation: number of writing rows
  writingLines?: number;
  // Draw / colour box height in pt (default 120)
  boxHeight?: number;
  /** Writing lines placement for draw questions: "below" (default: box first, then lines) or "above" (lines first, then box). */
  drawLinesPosition?: "below" | "above";
  drawOrder?: "box-first" | "lines-first";

  // ===== Word-problem layout =====
  // Show a bordered working/"operation" box next to each problem.
  wpOperationBox?: boolean; // default true
  wpBoxPosition?: "right" | "below"; // where the box sits (default "right")
  wpBoxWidth?: number; // box width in pt when position="right" (default 150)
  wpBoxHeight?: number; // box height in pt (default 70)
  /** Print the faint "Working" caption inside the box. Default true. */
  wpBoxLabel?: boolean;
  /**
   * Force this question to stay on one page. Unset means the type decides —
   * see SPLITTABLE_TYPES. Set true for a question whose parts must be read
   * together, false to let a long one flow on and fill the page.
   */
  keepTogether?: boolean;
  /** Force a page break before this question so it starts at the top of a new page. */
  pageBreakBefore?: boolean;
  /** Rule the working box into squares so digits line up by place value. */
  wpBoxGrid?: boolean;
  wpBoxRows?: number; // default 4
  wpBoxCols?: number; // default 5
  /** When true, display pre-printed operands/numbers inside the working box (e.g. for Class 1-2 story sums where students write the operator and calculate). */
  wpBoxShowNumbers?: boolean;
  /** Optional operator pre-printed or blank for students to write (e.g. "" or "+" or "-"). Defaults to "" (blank for student to write) when wpBoxShowNumbers is enabled. */
  wpBoxOperation?: string;

  // ===== Math-vertical layout =====
  mathAutoFit?: boolean; // size columns to content instead of stretching (default true)
  mathGap?: number; // gap between problems in pt (default 12)
  mathProblemWidth?: number; // fixed problem width in pt when not auto-fitting (default 90)
  mathAnswerSpace?: number; // blank answer space below the line in pt (default 0)
  mathBorder?: boolean; // draw a border box around each problem (default false)
  mathDigitSpacing?: number; // gap between digits of each number in pt (default 4)
  mathIndexGap?: number; // gap between problem index (1), 2)) and the numbers in pt (default 6)
  mathQuotientRemainder?: boolean; // when operation is division, show "Q = ___  R = ___" row below each problem

  // ===== Per-question spacing overrides =====
  spacing?: QuestionSpacing;

  // ===== Custom freeform block =====
  customBlocks?: CustomBlock[];

  // ===== Table / grid =====
  // Row-major grid of cells. An empty string renders as a blank (fillable) cell.
  tableRows?: string[][];
  tableCaption?: string; // optional caption shown above the table
  tableHeaderRow?: boolean; // style the first row as a header (default true)
  tableHeaderCol?: boolean; // style the first column as a header (default false)
  tableCellMinHeight?: number; // min row height in pt — give blank cells room (default 22)
  tableHideBorders?: boolean; // hide table cell grid borders (default false)
  tableBlankLine?: boolean; // render an underscore / writing line in blank cells (default false)
  tableColWidths?: string[]; // column widths (e.g. ["25%", "75%"])
}

export function isStructuralQuestion(q: Question): boolean {
  return (
    q.marks <= 0 &&
    !!q.title.trim() &&
    (!q.items || q.items.length === 0) &&
    (!q.images || q.images.length === 0) &&
    !q.passage &&
    (!q.tableRows || q.tableRows.length === 0) &&
    (!q.matchLeft || q.matchLeft.length === 0) &&
    (!q.matchRight || q.matchRight.length === 0) &&
    q.type !== "match"
  );
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  "fill-blanks": "Fill in the Blanks",
  "short-answer": "Short Answer",
  "long-answer": "Long Answer / Word Problem",
  mcq: "Multiple Choice (MCQ)",
  match: "Match the Following",
  "true-false": "True or False",
  "math-vertical": "Math Operations (Add/Sub/Mul/Div)",
  comprehension: "Reading Comprehension",
  "word-problem": "Word Problems",
  composition: "Essay / Composition",
  "picture-composition": "Picture Composition",
  handwriting: "Handwriting / Copy Practice",
  dictation: "Dictation Lines",
  draw: "Draw / Colour Box",
  "label-image": "Label the Picture",
  table: "Table / Data Grid",
  "assertion-reason": "Assertion & Reason",
  "case-study": "Case Study / Source-Based",
  "diagram-label": "Diagram with Legend",
  "odd-one-out": "Odd One Out",
  rearrange: "Rearrange the Words",
  "word-search": "Word Search Grid",
  custom: "Custom Block (Freeform)",
};

export const QUESTION_TYPE_ICONS: Record<QuestionType, string> = {
  "fill-blanks": "PenLine",
  "short-answer": "MessageSquare",
  mcq: "CheckSquare",
  match: "ArrowLeftRight",
  "true-false": "ToggleLeft",
  "math-vertical": "Calculator",
  comprehension: "BookOpen",
  "word-problem": "Lightbulb",
  "long-answer": "FileText",
  composition: "Edit3",
  "picture-composition": "Image",
  handwriting: "PenTool",
  dictation: "Volume2",
  draw: "Palette",
  "label-image": "Tag",
  table: "Table",
  "assertion-reason": "Scale",
  "case-study": "FileSearch",
  "diagram-label": "Workflow",
  "odd-one-out": "Filter",
  rearrange: "Shuffle",
  "word-search": "Grid3x3",
  custom: "LayoutGrid",
};

// The four options every assertion-reason question uses — standard CBSE wording.
export const AR_DEFAULT_OPTIONS = [
  "Both A and R are true, and R is the correct explanation of A.",
  "Both A and R are true, but R is not the correct explanation of A.",
  "A is true but R is false.",
  "A is false but R is true.",
];

/** Lowercase roman numeral for case-study sub-questions: (i) (ii) (iii). */
export function romanNumeral(n: number): string {
  const map: [number, string][] = [
    [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let out = "";
  let v = Math.max(1, n);
  for (const [val, sym] of map) {
    while (v >= val) {
      out += sym;
      v -= val;
    }
  }
  return out;
}

// Question types that may break across a page between their items.
//
// Everything used to be atomic, so a five-part "Answer these questions" that
// did not fit was pushed whole to the next page and left half a sheet blank —
// paper a school pays for. A printed exam splits a list like that between two
// items without a second thought; what it never does is cut one item in half,
// or separate a diagram, grid or passage from the questions about it.
export const SPLITTABLE_TYPES: QuestionType[] = [
  "fill-blanks",
  "short-answer",
  "long-answer",
  "mcq",
  "true-false",
  "word-problem",
  "handwriting",
  "dictation",
  "rearrange",
  "odd-one-out",
  "assertion-reason",
  "comprehension",
  "composition",
];

/** Whether a question must be kept whole on one page. */
export function keepsTogether(q: {
  type: QuestionType;
  keepTogether?: boolean;
}): boolean {
  if (q.keepTogether != null) return q.keepTogether;
  return !SPLITTABLE_TYPES.includes(q.type);
}
