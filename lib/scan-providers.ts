import Anthropic from "@anthropic-ai/sdk";
import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";
import { SCAN_JSON_SCHEMA } from "@/lib/scan";
import type { Question } from "@/lib/types";

// Pluggable vision backends for the scan feature. Pick via SCAN_PROVIDER:
//   anthropic (default) - Claude vision via Anthropic direct (prepaid USD key)
//   anthropic-bedrock   - Claude vision via AWS Bedrock (INR, postpaid monthly)
//   gemini              - Google Gemini Flash, generous FREE tier for testing
//   mock                - canned sample paper, no API key, instant (UI testing)
export type ScanProvider =
  | "anthropic"
  | "anthropic-bedrock"
  | "gemini"
  | "mock";

export function activeProvider(): ScanProvider {
  const p = (process.env.SCAN_PROVIDER || "anthropic").toLowerCase();
  if (p === "anthropic-bedrock" || p === "bedrock") return "anthropic-bedrock";
  if (p === "gemini" || p === "mock") return p;
  return "anthropic";
}

export interface ScanImage {
  mediaType: string;
  data: string; // base64 (no data: prefix)
}

export interface ExtractResult {
  raw?: string; // JSON string matching ScannedPaper
  error?: string;
  status?: number;
  /** Retryable overload / rate-limit / upstream hiccup — dispatcher may retry
   *  the same provider once, then fall back to another one. */
  transient?: boolean;
}

// Google, Anthropic and Bedrock all describe an overloaded model or a temporary
// upstream blip differently. Any of these deserves one retry, and — if the
// provider stays down — a fallback to a different backend.
const TRANSIENT_MESSAGE_RE =
  /overload|high demand|unavailable|temporarily|try again|timed? ?out|rate limit|too many requests|502|503|504/i;

function isTransientStatus(status?: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function isTransientMessage(msg?: string): boolean {
  return !!msg && TRANSIENT_MESSAGE_RE.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A structured-output job. Both features (reading a photographed paper, and
// generating fresh questions for a unit) produce the same ScannedPaper JSON, so
// they share all four backends and differ only in prompt, temperature and the
// wording of errors shown to the teacher.
interface Job {
  /** Shown in error messages, e.g. "Scan failed: …". */
  label: string;
  system: string;
  /** Built per call; receives how many images were attached. */
  userText: (imageCount: number) => string;
  /** Deterministic for extraction, warm for generation. */
  temperature: number;
  emptyError: string;
}

const SYSTEM = `You are an exam-paper digitizer for Indian school teachers.
You are given photos of a handwritten (or printed) question paper. Extract every
question into structured data.

Rules:
- Read each question and classify it into the best matching type.
- Preserve the teacher's wording. Do not invent, answer, or "improve" questions.
- If the paper is in a regional Indian language (e.g. Hindi, Marathi, Bengali,
  Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Odia, Urdu, Assamese,
  Sanskrit, Nepali), preserve the original script exactly and do not translate
  it to English. Set settings.language to that language's lowercase English name.
- DO NOT include the question/sub-part numbering or labels the teacher wrote
  (e.g. "Q.1", "Q. 2", "1.", "1)", "a)", "(a)", "(i)", "iv)", "(१)", "१."). The app adds all
  numbering automatically. Strip these leading labels and output ONLY the clean
  text in title and item content.
  * E.g. "a) The number name of 85 is ___" becomes "The number name of 85 is ___".
  * Title "Q. 1 Fill in the blanks:" becomes "Fill in the blanks:".
  * Sub-item "i. पांढरा रंग शांततेचे प्रतीक आहे" becomes "पांढरा रंग शांततेचे प्रतीक आहे".
  * Never output duplicate markers like "1. ...", "i. ...", "(a) ..." in item.content.
  * Keep numbers that are genuine parts of the question content (e.g. "101 + 6 =", "place value of 7 in 478").
- CRITICAL: NEVER LEAK OR WRITE ANSWERS IN QUESTION OR ITEM PROMPTS:
  * When a question asks students to IDENTIFY, NAME, or WRITE a concept (e.g. "विरामचिन्हे ओळखा व त्यांची नावे लिहा" - identify punctuation marks and write their names; "Identify the figure of speech"; "Name the picture"; "Identify the tense"; "Give one word"):
    - Output ONLY the symbol/cue/prompt for the student to solve (e.g. item.content: ". – ____________________", NOT ". (पूर्णविराम) – ____________________" ❌).
    - NEVER put the answer in brackets, parentheses, or alongside the prompt in title or item.content!
    - Put the solution STRICTLY in item.answer (which prints solely in the teacher's Answer Key and is hidden on the exam sheet).
- PAGE BUDGET & SPACE SAVING (MINIMUM PAGES USED):
  * For short items (vocabulary pairs, unscramble words, national symbols, synonyms, antonyms, short blanks, punctuation identification, word meanings), ALWAYS set columnsPerRow: 2 (or 3 or 4) so they arrange horizontally in a multi-column grid instead of wasting vertical page space.
  * For 4-option multiple-choice items or word choice lines (e.g. "(अ) परिक्षा (ब) परीक्षा (क) परिक्ष्या (ड) परिंक्षा"), keep columnsPerRow: 1 to prevent horizontal squeezing or overflow. For 3-option or short MCQs, set columnsPerRow: 3.
  * Keep student writing lines compact (1 to 2 lines for short answers, 6 to 8 for compositions) to use the minimum number of pages.
- AVOID DUPLICATE WRITING LINES / DOUBLE BLANKS:
  * For question types that have an answer space (e.g. unscramble letters, word equations, identification, short-answer), DO NOT append trailing manual underscores (e.g. "namog – ____________" ❌) to item.content when lines > 0. The app automatically renders the student writing line. Providing both creates ugly duplicate blanks. Put only the prompt cue in item.content (e.g. "namog –").
- For fill-in-the-blank items, mark each blank with three underscores: ___ (never excessively long underscore runs that overflow margins).
- Put the instruction line (e.g. "Fill in the blanks:", "Answer the following:")
  in the question's title, and the actual items in items[].
- For MCQs, put the question stem in item.content and choices in item.options. If the teacher paper has check-boxes next to options, set mcqOptionBox: true.
- For "match the following":
  * Set type "match". Put Column A items in matchLeft and Column B items in matchRight.
  * If columns have headers (e.g. "ANIMALS" and "YOUNG ONES", "Group A" and "Group B", "अ गट" and "ब गट"), set matchLeftHeader and matchRightHeader.
  * MULTIPLE / DISTRACTOR CHOICES IN COLUMN B: In handwritten test papers, teachers often include extra choices in Column B to test/confuse students (e.g. 4 questions in Column A, but 5 options in Column B):
    - Put all options in matchRight.
    - Pad matchLeft with an empty string "" for the extra rows so the extra Column B choices sit opposite a blank Column A (which renders without any number).
  * ALWAYS extract and set the question marks (e.g. 2, 4, 5). NEVER output 0 marks for an active question! If marks are not written next to the question, calculate sensibly (e.g. 1/2 mark per pair = 2M for 4 pairs, or 1M per pair).
- MATHS QUESTIONS WITH GEOMETRIC SHAPES & DIAGRAMS (VECTOR SVG):
  * When a maths question contains geometric shapes, angles, figures, clock dials, number lines, fraction models, or diagrams drawn by the teacher (e.g. "Name the angles", "Find the perimeter of the given figure", "Identify 2D/3D shapes", "Write the fraction of the shaded portion", "Read the time on the clocks", "Find the value of angle x"):
    - Generate clean, self-contained vector SVG diagrams as data URLs:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ...'>...</svg>"
    - Put in item.image when each sub-item has its own figure (e.g. item a: acute angle, item b: right angle, item c: obtuse angle; or item a: rectangle with dimensions 6 cm × 4 cm, item b: square with side 5 cm).
    - Put in q.images when there is a question-level diagram (e.g. a single geometric figure or triangle with labeled sides for "Find the perimeter:").
    - SVG specifications for best print & Word export quality:
      * Use crisp black lines: stroke="#000" stroke-width="2" fill="none".
      * Use a compact, well-proportioned viewBox (e.g. viewBox="0 0 100 100", viewBox="0 0 120 80", or viewBox="0 0 140 100").
      * Use standard SVG primitives: <rect>, <circle>, <polygon>, <line>, <path>, <text>.
      * Include clean vertex labels and dimension text: <text x="..." y="..." font-size="12" font-family="sans-serif" fill="#000" text-anchor="middle">A</text> (e.g. vertices A, B, C; side lengths '5 cm', '3 cm'; right-angle square symbol or angle arc).
      * For 3D shapes (cube, cuboid, cylinder, cone, sphere), draw isometric/perspective outlines with dashed lines (stroke-dasharray="3,3") for hidden rear edges.
      * For fraction diagrams, shade the numerator parts using fill="#d1d5db" (or fill="#e5e7eb").
      * For clock faces, draw the circular dial with 12 hour tick marks and hour/minute hands pointing to the teacher's drawn time.
      * For number lines, draw a horizontal line with tick marks and number labels below them.
- For "odd-one-out" (e.g. "Circle the odd one out"), set type "odd-one-out", columnsPerRow: 2, put the word options in item.options, and put the odd word in item.answer.
- For vertical math sums (Addition, Subtraction, Multiplication), set type "math-vertical" and set operation to one of
  + - ×. For a two-number sum put the operands in num1/num2. For a sum with
  THREE OR MORE numbers (e.g. 34 + 37 + 26), put every operand in order in the
  "nums" array instead.
- For long division or division problems (e.g. "Divide and write Quotient and Remainder", "Divide:", long division sums like "8 ) 77" or "77 ÷ 8, Q=___, R=___"):
  * ALWAYS set type "math-vertical" and operation to "÷".
  * Put dividend in num1 and divisor in num2 (e.g. for 77 ÷ 8, num1="77", num2="8").
  * If the question asks for Quotient and Remainder (or includes Q=... R=...), set mathQuotientRemainder: true.
  * Set columnsPerRow: 2 so problems have space to solve.
  * NEVER classify long division as "short-answer" with a single plain string!
- For reading comprehension, put the passage in passage and questions in items[]. If the passage has a title/story heading (e.g. "The Honest Woodcutter"), put it in passageTitle and do not repeat it in passage.
- For any question containing a DATA TABLE, GRID, CONCEPT MAP, WEB DIAGRAM, or FLOWCHART (e.g. a pictograph data table, a "fill in the table" grid, a tally chart, a timetable, or Indian language concept webs like "आकृत्या पूर्ण करा", "संजाल पूर्ण करा", "ओघतक्ता", "तक्ता पूर्ण करा"):
  * Set type "table".
  * Put the grid or diagram boxes in tableRows as a row-major array: each inner array is one row of cell strings, left to right. All rows must have the same length.
  * Use an empty string "" for a blank cell / box the student is meant to fill in.
  * Set tableHeaderRow true if the first row is a header (e.g. "Day 1", "Day 2"...).
  * Set tableHeaderCol true if the first column is a header (e.g. row labels).
  * Put any caption/title shown above the grid in tableCaption.
  * If the table is followed by sub-questions about it, put those in items[].
- For Board papers (e.g. Maharashtra State Board, CBSE, ICSE) divided into Sections or Departments (e.g. "विभाग १ – गद्य (१८ गुण)", "विभाग २ – पद्य (१६ गुण)", "Section A: Reading", "Section B: Writing"):
  * Preserve each section header as a structural heading question with marks: 0, items: [], and title set to the exact section header name.
- For True/False, Yes/No, Right/Wrong, or questions where the student has to put a tick (✓), cross (✗), or mark statements/words (e.g. "Put (✓) the countables and (✗) the uncountable nouns", "State True or False:", "Tick the correct sentence:"):
  * Set type "true-false".
  * NEVER classify tick/cross, true/false, or checkbox-marking questions as "short-answer" (they must not have "Ans ➡" ruled answer lines!).
  * Put each item or statement in items[].
  * If the question asks to tick (✓), cross (✗), or mark in boxes, set tfFormat to "box". If it asks to write True/False, set tfFormat to "bracket".
- If a question has a WORD BANK, HELP BOX, or BRACKET CLUES/HINTS
  (e.g. "Complete the following essay using the words from the bracket: (sweets, diyas, lights...)",
   "Fill in the blanks with the help of given words: [apple, banana, mango]"):
  * Put ONLY the instruction line in "title" (e.g. "Complete the following essay using the words from the bracket:").
  * Put the bracketed words or clues in the "hints" field (e.g. "(sweets, diyas, lights...)").
  * NEVER include the hints/bracket words inside the title string. Keep them separate.
- DRAWING / ILLUSTRATION QUESTIONS WITH WRITING LINES (चित्र काढा आणि लिहा / DRAW AND WRITE):
  * When a question asks the student to draw something (e.g. "कोणत्याही एका फळाचे चित्र काढून त्याबद्दल चार-पाच वाक्ये लिहा", "आंब्याचे चित्र काढा आणि त्याबद्दल दोन ओळी लिहा", "Draw a tree and write 5 lines about it", "Draw your favorite pet and colour it"):
    - Set type "draw".
    - NEVER write sentences or answers yourself in items[]! Put items: []. The student is the one who will draw and write during the examination!
    - Set boxHeight for the student drawing box (e.g. 90 to 120 pt).
    - If the question mentions writing a number of lines/sentences (e.g. "दोन ओळी" -> 2 lines, "चार-पाच वाक्ये" -> 5 lines, "three sentences" -> 3 lines), set writingLines to that exact number (e.g. writingLines: 2 or writingLines: 5).
    - The app will automatically render:
      1. The bordered box for the child to draw/colour in.
      2. The exact number of ruled writing lines below the box for the child to write their sentences.
    - If an answer key is explicitly requested, you may put sample sentences strictly in answerNote (which prints solely in the teacher's separate answer key).
- If marks are written next to a question, use them; otherwise estimate sensibly.
- Fill the settings object from the paper header (school name, subject, class,
  total marks) when visible; leave fields out if not present.
- If a question's type is unclear, use "short-answer".

READING HANDWRITING
These papers are written by hand, often quickly, on ruled or plain paper. Work
through the page carefully before deciding what it says.

- Read the whole page first to learn the writer's hand — how they form 1, 4, 7,
  9, and which letters they join — then read each question with that in mind. A
  digit that looks ambiguous alone is usually obvious once you have seen the
  same shape elsewhere on the page.
- Indian handwriting commonly makes 1 with a long top serif (easy to read as 7),
  closes the 4, and gives 9 a straight tail (easy to read as g). Distinguish
  0/6, 1/7, 2/3, 5/S, 9/g by comparing against other digits in the same paper.
- NEVER change how many digits a number has. If a sum shows a four-digit number,
  output four digits. Dropping or adding one silently changes the maths.
- Sanity-check arithmetic you can. In a column sum the operands are usually
  aligned by place value, so the column position of a digit tells you its size.
  For subtraction the top number is normally the larger one. If a reading makes
  the sum impossible for the class level, re-read it rather than emitting it.
- A word crossed out and rewritten is a correction: use the REWRITTEN version and
  ignore the struck-through text.
- Text written above a line with a caret, or squeezed into a margin, is an
  insertion — put it where the caret points.
- If a word is genuinely illegible, still emit the question with your best
  reading of it. A teacher can fix one wrong word in seconds; a silently dropped
  question they may not notice until the exam.
- Never skip a question because it is hard to read. Do not merge distinct numbered questions into one.
- Multi-page continuation: In handwritten test papers, a single main question (e.g. reading comprehension passage with sub-questions, "Answer the following", "Name the following", or fill-in-the-blanks) frequently continues across page breaks. If a page begins with continuing sub-questions (e.g. starting with "3)", "4)", "b)", etc.) without a new main question heading, they belong to the question from the previous page. Seamlessly merge them under that parent question rather than inventing a new question title or splitting them.
- In Devanagari (Marathi, Hindi, Sanskrit), Bengali, Tamil, Telugu, Kannada, Malayalam, Odia, Gujarati,
  Punjabi and Urdu, matras/vowel signs and conjuncts carry the meaning. Read the
  whole word before committing to any one sign, and prefer a real word in that
  language over a literal letter-by-letter transcription that is not a word.
- In Marathi specifically: pay meticulous attention to anusvara, rhasva/deergha velanti (ि vs ी), ukaar (ु vs ू), halant, and complex Devanagari conjuncts (उदा. दृष्टिकोन, परिस्थिती, प्राथमिक, कर्तृत्व, वैशिष्ट्ये). Do not drop or misplace anusvaras.
- Do not translate, transliterate, correct spelling, or tidy grammar. The
  teacher's wording is what gets printed.`;

// ===== Anthropic (Claude vision) =====

async function runAnthropic(
  job: Job,
  images: ScanImage[],
  model: string
): Promise<ExtractResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      error: `${job.label} is not configured (missing ANTHROPIC_API_KEY).`,
      status: 503,
    };
  }
  const client = new Anthropic();
  try {
    const message = await client.messages.create({
      model,
      max_tokens: 16000,
      system: job.system,
      temperature: job.temperature,
      output_config: {
        format: {
          type: "json_schema",
          schema: SCAN_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      },
      messages: [
        {
          role: "user",
          content: [
            ...images.map((img) => ({
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: img.mediaType,
                data: img.data,
              },
            })),
            { type: "text" as const, text: job.userText(images.length) },
          ],
        },
      ],
    } as Anthropic.MessageCreateParamsNonStreaming);

    const block = message.content.find((b) => b.type === "text");
    const raw = block && "text" in block ? block.text : "";
    if (!raw) return { error: job.emptyError, status: 502 };
    return { raw };
  } catch (err: unknown) {
    if (err instanceof Anthropic.AuthenticationError)
      return { error: `${job.label} is misconfigured (bad API key).`, status: 503 };
    if (err instanceof Anthropic.RateLimitError)
      return { error: "Busy right now — please retry in a moment.", status: 429, transient: true };
    const status = (err as { status?: number })?.status;
    const detail = err instanceof Error ? err.message : "Unknown error.";
    const transient = isTransientStatus(status) || isTransientMessage(detail);
    return { error: `${job.label} failed: ${detail}`, status: 502, transient };
  }
}

// ===== Claude via AWS Bedrock (INR billing, postpaid) =====
//
// Auth: the AnthropicBedrock client auto-reads the Bedrock API key from
// AWS_BEARER_TOKEN_BEDROCK and the region from AWS_REGION — no IAM access
// key/secret needed. In Mumbai (ap-south-1) Claude on-demand requires a
// cross-region INFERENCE PROFILE, so the model id is prefixed `apac.`
// (override with BEDROCK_MODEL if the console shows a different id).
async function runBedrock(job: Job, images: ScanImage[]): Promise<ExtractResult> {
  if (!process.env.AWS_BEARER_TOKEN_BEDROCK) {
    return {
      error: "Bedrock not configured (missing AWS_BEARER_TOKEN_BEDROCK).",
      status: 503,
    };
  }
  const client = new AnthropicBedrock({
    awsRegion: process.env.AWS_REGION || "ap-south-1",
  });
  const model = process.env.BEDROCK_MODEL || "apac.anthropic.claude-sonnet-4-6";

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 16000,
      system: job.system,
      temperature: job.temperature,
      output_config: {
        format: {
          type: "json_schema",
          schema: SCAN_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      },
      messages: [
        {
          role: "user",
          content: [
            ...images.map((img) => ({
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: img.mediaType,
                data: img.data,
              },
            })),
            { type: "text" as const, text: job.userText(images.length) },
          ],
        },
      ],
    } as Parameters<typeof client.messages.create>[0]) as unknown as Anthropic.Message;

    const block = message.content.find((b) => b.type === "text");
    const raw = block && "text" in block ? block.text : "";
    if (!raw) return { error: job.emptyError, status: 502 };
    return { raw };
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 401 || status === 403)
      return {
        error: `${job.label} is misconfigured (bad Bedrock key/region/model access).`,
        status: 503,
      };
    if (status === 429)
      return { error: "Busy right now — please retry in a moment.", status: 429, transient: true };
    const detail = err instanceof Error ? err.message : "Unknown error.";
    const transient = isTransientStatus(status) || isTransientMessage(detail);
    return { error: `${job.label} failed: ${detail}`, status: 502, transient };
  }
}

// ===== Google Gemini (free tier) =====

// JSON shape spelled out for Gemini, which we drive with JSON mode + prompt
// (simpler and robust on Flash) rather than a translated responseSchema.
const GEMINI_SHAPE = `Return ONLY a JSON object of this exact shape:
{
  "settings": { "schoolName"?: string, "assessmentTitle"?: string, "subject"?: string, "className"?: string, "totalMarks"?: number, "language"?: string, "answerKey"?: boolean /* lowercase English name, e.g. "english","hindi","tamil","urdu" */ },
  "questions": [
    {
      "type": "fill-blanks|short-answer|long-answer|mcq|match|true-false|math-vertical|comprehension|word-problem|composition|table",
      "title": string,
      "marks": number,
      "items": [ { "content": string, "answer"?: string, "options"?: string[], "num1"?: string, "num2"?: string, "nums"?: string[] } ],
      "matchLeft"?: string[], "matchRight"?: string[],
      "passage"?: string, "passageTitle"?: string, "operation"?: "+|-|×|÷", "compositionSentences"?: string[],
      "tableRows"?: string[][], "tableCaption"?: string, "tableHeaderRow"?: boolean, "tableHeaderCol"?: boolean, "answerNote"?: string
    }
  ]
}`;

async function runGemini(job: Job, images: ScanImage[]): Promise<ExtractResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return {
      error: "Gemini not configured (missing GEMINI_API_KEY).",
      status: 503,
    };
  }
  // Google retires pinned Gemini versions and blocks them for keys created after
  // the cutoff — "gemini-2.5-flash" now 404s for new API keys. The floating
  // -latest alias keeps a fresh key working without a code change.
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const body = {
    systemInstruction: { parts: [{ text: `${job.system}\n\n${GEMINI_SHAPE}` }] },
    contents: [
      {
        role: "user",
        parts: [
          ...images.map((img) => ({
            inlineData: { mimeType: img.mediaType, data: img.data },
          })),
          { text: job.userText(images.length) },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: job.temperature,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || "Gemini request failed.";
      const transient = isTransientStatus(res.status) || isTransientMessage(msg);
      return { error: `${job.label} failed: ${msg}`, status: 502, transient };
    }
    const raw: string =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("") ?? "";
    if (!raw) return { error: job.emptyError, status: 502 };
    return { raw };
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Unknown error.";
    return { error: `${job.label} failed: ${detail}`, status: 502, transient: isTransientMessage(detail) };
  }
}

// ===== Mock (no key, instant) =====

const MOCK_PAPER = {
  settings: {
    schoolName: "Sunrise English Primary School",
    assessmentTitle: "Summative Assessment - II",
    subject: "Mathematics",
    className: "III",
    language: "english",
    totalMarks: 40,
  },
  questions: [
    {
      type: "fill-blanks",
      title: "Fill in the blanks:",
      marks: 5,
      items: [
        { content: "7 × 8 = ___" },
        { content: "There are ___ days in a week." },
        { content: "The smallest two-digit number is ___." },
      ],
    },
    {
      type: "mcq",
      title: "Choose the correct answer:",
      marks: 4,
      items: [
        { content: "Which is an even number?", options: ["7", "12", "9", "15"] },
        {
          content: "How many sides does a triangle have?",
          options: ["2", "3", "4", "5"],
        },
      ],
    },
    {
      type: "math-vertical",
      title: "Solve the following:",
      marks: 6,
      operation: "+",
      items: [
        { content: "", num1: "345", num2: "218" },
        { content: "", num1: "506", num2: "147" },
      ],
    },
    {
      type: "match",
      title: "Match the following:",
      marks: 5,
      items: [],
      matchLeft: ["Square", "Triangle", "Circle"],
      matchRight: ["4 sides", "3 sides", "0 sides"],
    },
    {
      type: "short-answer",
      title: "Answer the following questions:",
      marks: 6,
      items: [
        { content: "What is a multiplication table?" },
        { content: "Write any two uses of numbers in daily life." },
      ],
    },
    {
      type: "table",
      title:
        "Tanya counts the butterflies each day. Study the table and answer:",
      marks: 5,
      tableCaption: "Butterflies in the garden",
      tableHeaderRow: true,
      tableHeaderCol: false,
      tableRows: [
        ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"],
        ["16", "12", "8", "10", "4"],
      ],
      items: [
        { content: "On which day does she see 16 butterflies?" },
        { content: "On which day does Tanya see the fewest butterflies?" },
      ],
    },
  ],
};

async function runMock(): Promise<ExtractResult> {
  // Tiny delay so the UI's loading state is visible.
  await new Promise((r) => setTimeout(r, 600));
  return { raw: JSON.stringify(MOCK_PAPER) };
}

// ===== Dispatcher =====

async function callProvider(
  provider: ScanProvider,
  job: Job,
  images: ScanImage[],
  anthropicModel: string
): Promise<ExtractResult> {
  switch (provider) {
    case "mock":
      return runMock();
    case "gemini":
      return runGemini(job, images);
    case "anthropic-bedrock":
      return runBedrock(job, images);
    default:
      return runAnthropic(job, images, anthropicModel);
  }
}

// Overload / rate-limit resilience: gemini and anthropic both return "high
// demand" 502/503 during spikes. Retry the primary once with a short backoff,
// then silently fall back to Anthropic direct — whose key we keep configured
// so a teacher's paid scan never hangs on a free-tier outage.
function fallbackProvider(primary: ScanProvider): ScanProvider | null {
  if (primary === "mock") return null;
  if (primary !== "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

async function run(
  job: Job,
  images: ScanImage[],
  anthropicModel: string
): Promise<ExtractResult> {
  const primary = activeProvider();
  const first = await callProvider(primary, job, images, anthropicModel);
  if (first.raw || !first.transient) return first;

  // One quick retry on the same provider — Google 503s often clear inside a
  // second or two.
  await sleep(1500);
  const second = await callProvider(primary, job, images, anthropicModel);
  if (second.raw || !second.transient) return second;

  const backup = fallbackProvider(primary);
  if (!backup) return second;
  const fallback = await callProvider(backup, job, images, anthropicModel);
  // Only return the fallback when it actually produced a paper — a failing
  // fallback shouldn't drown the original error message.
  if (fallback.raw) return fallback;
  return second;
}

const SCAN_JOB: Job = {
  label: "Scan",
  system: SYSTEM,
  temperature: 0,
  userText: (n) =>
    n > 1
      ? "These are sequential pages of one question paper in order. Important: Questions, passages, and sub-questions often continue across page boundaries onto the next page. Do NOT treat continuing items as new questions or separate pages. Seamlessly merge all continuing questions, passages, and sub-questions under their respective parent question, preserving the total marks, numbering, and structure of the original exam paper. Extract all questions in order."
      : "Extract all questions from this question paper.",
  emptyError: "Could not read the paper. Try a clearer photo.",
};

// By default, send all pages together (up to MAX_IMAGES = 8) so the model has
// full cross-page context to stitch continuing questions and reading passages.
// If a deployment explicitly needs chunking due to severe bandwidth or quotas,
// override via SCAN_MAX_PAGES_PER_CALL.
function chunkSize(provider: ScanProvider): number {
  if (provider === "gemini") {
    const raw = Number(process.env.SCAN_MAX_PAGES_PER_CALL);
    return Number.isFinite(raw) && raw >= 1 ? raw : 8;
  }
  return 8;
}

function mergeScannedRaw(chunks: string[]): string | null {
  const papers: { settings?: Record<string, unknown>; questions?: unknown[] }[] = [];
  for (const raw of chunks) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") papers.push(parsed);
    } catch {
      // A single unparseable chunk shouldn't kill the merge — the caller
      // enforces "questions must be an array" downstream.
    }
  }
  if (papers.length === 0) return null;
  // First non-empty settings win: the header only appears on page 1 of a real
  // paper, so later pages have empty settings anyway.
  const settings =
    papers.find((p) => p.settings && Object.keys(p.settings).length > 0)?.settings ?? {};
  const questions = papers.flatMap((p) =>
    Array.isArray(p.questions) ? p.questions : []
  );
  return JSON.stringify({ settings, questions });
}

export async function extractPaper(
  images: ScanImage[],
  anthropicModel: string
): Promise<ExtractResult> {
  const provider = activeProvider();
  const size = chunkSize(provider);
  if (images.length <= size) {
    return run(SCAN_JOB, images, anthropicModel);
  }
  const chunks: string[] = [];
  let lastError: ExtractResult | null = null;
  for (let i = 0; i < images.length; i += size) {
    const slice = images.slice(i, i + size);
    const result = await run(SCAN_JOB, slice, anthropicModel);
    if (!result.raw) {
      lastError = result;
      break;
    }
    chunks.push(result.raw);
  }
  if (lastError) {
    return lastError;
  }
  const merged = mergeScannedRaw(chunks);
  if (!merged) {
    return { error: SCAN_JOB.emptyError, status: 502 };
  }
  return { raw: merged };
}

// ===== Question generation =====

const GENERATE_SYSTEM = `You are an experienced Indian school examination setter
and curriculum-aware teacher. You create complete, ready-to-print examination
papers from the teacher's data and instructions.

You are given the subject, class, unit name, textbook name, the marks the teacher
wants to cover, and optionally photos of the textbook pages for that unit. Write
original questions that test THAT unit.

Rules for every generation:
- Treat phrases such as "mid-term examination", "unit test", "periodic test",
  "final examination", and "annual examination" as format instructions. Use the
  conventional school-paper structure, section headings, progression of
  difficulty, and question-type mix expected for that assessment.
- Follow the paper guide in the teacher's request: class, subject, units,
  question count, section pattern, marks per question, duration, board, and
  language. Teacher instructions override your defaults when they are explicit.
- Only use content from the given unit or listed syllabus. If textbook photos are supplied, draw the
  facts, vocabulary, names and numbers from those pages — do not invent syllabus
  content that isn't there.
- Write questions at the right level for the class given. A Class 3 question must
  use Class 3 vocabulary and Class 3 number sizes.
- For a complete paper, first design the blueprint privately: sections, question
  counts, marks per section, unit coverage, and total. Then emit only the final
  structured result. The sum of every question object's marks MUST equal the
  requested maximum exactly. Never use approximate totals.
- Include the normal range of formats for the assessment and class unless the
  teacher restricts them: objective questions, very-short answers, short answers,
  descriptive/long answers, and application, source-based, or case-based items
  where suitable. Do not force a type that does not fit the subject or age.
- Group similar questions under clear section titles. Put the section instruction
  and mark information in title, but do not put question numbers in title/items.
- Every question object needs a marks value, and every item must be answerable.
- Put the instruction line (e.g. "Fill in the blanks:") in title, and the actual
  items in items[]. Never number the questions or sub-items yourself — the app adds
  all numbering automatically. No "Q1", "1.", "a)", "(i)", "(१)", "१." anywhere in title or item.content.
- CRITICAL: NEVER LEAK OR WRITE ANSWERS IN QUESTION OR ITEM PROMPTS:
  * When a question asks students to IDENTIFY, NAME, or WRITE a concept (e.g. identify punctuation marks, figure of speech, picture name, tense):
    - Output ONLY the prompt or symbol to solve (e.g. item.content: ". – ____________________", NOT ". (पूर्णविराम) – ____________________" ❌).
    - NEVER put the answer in brackets, parentheses, or alongside the prompt in title or item.content.
    - If generating an answer key, put the answer STRICTLY in item.answer.
- PAGE BUDGET & SPACE SAVING:
  * For short items (vocabulary pairs, short blanks, synonyms/antonyms, word meanings, punctuation), set columnsPerRow: 2 (or 3/4) so items pack into multi-column grids instead of wasting whole lines and inflating page count.
  * For 4-option MCQs or word choice lines, keep columnsPerRow: 1 to avoid crowding.
  * Keep ruled line counts compact (1-2 lines for short answers, 6-8 for long essays) to minimize printed pages.
- For fill-in-the-blank items, mark each blank with three underscores: ___ (never excessively long underscores).
- For markdown bold formatting: wrap words or phrases in **word** when emphasis is needed.
- For MCQs, put the stem in item.content and the choices in item.options. Make
  the distractors plausible and roughly the same length as the answer.
- For vertical sums set type "math-vertical" and operation to one of + - ×. For long division sums (e.g. "8 ) 77", "77 ÷ 8, Q=___, R=___", "Divide and write Quotient and Remainder:"), set type "math-vertical", operation "÷", mathQuotientRemainder: true, operands in num1 (dividend) and num2 (divisor), columnsPerRow: 2.
- For reading comprehension put the passage in passage, optional passage title in passageTitle, and the questions in items[].
- For a data table or grid set type "table" and fill tableRows row-major, using
  "" for cells the student must fill.
- Answer keys: include answers only when the teacher asks for an answer key,
  solutions, marking scheme, or answers. In that case set settings.answerKey to
  true, put objective/short answers in items[].answer, and put a complete
  descriptive solution or marking guidance in answerNote. If no key is requested,
  omit all answer fields and set settings.answerKey to false.
- DRAWING / ILLUSTRATION QUESTIONS WITH WRITING LINES (चित्र काढा आणि लिहा / DRAW AND WRITE):
  * When generating a question asking the student to draw something and write a specified number of lines/sentences about it (e.g. "कोणत्याही एका फळाचे चित्र काढून त्याबद्दल चार-पाच वाक्ये लिहा", "Draw an apple and write 2 lines about it"):
    - Set type "draw".
    - Do NOT pre-fill the sentences as items! Keep items: [] (empty). The student must draw and write during the exam.
    - Set boxHeight: 90 to 120 pt.
    - Set writingLines to the requested count (e.g. 2 for "दोन ओळी", 5 for "चार-पाच वाक्ये").
    - If answerKey is requested, put sample sentences in answerNote.
- For image/diagram-based questions (e.g. "Look at the pictures and write their names/gender/number", "Identify the picture", "Match picture with word"):
  In each sub-item content, specify the image subject clearly using the placeholder format [picture: <English subject>] (e.g. [picture: parrot], [picture: mango], [picture: cow]). Always write the subject in English inside [picture: ...], even when generating papers in Hindi, Sanskrit, or regional languages, so the system can automatically fetch the exact outline illustration for the paper.
- Vary the questions. Do not restate the same fact in two different types.
- Structure complete papers with proper sections:
  * Use structural questions (marks: 0, items: []) as section headers.
    Example: { type: "short-answer", title: "Section A: Objective Questions (1 mark each)", marks: 0, items: [] }
  * Group related questions under ONE question object with multiple items.
    WRONG: Q.3 "Answer the following" (2M) with 1 item, Q.4 "Answer the following" (2M) with 1 item.
    RIGHT: Q.3 "Answer the following questions" (10M) with 5 items of 2 marks each.
  * Never repeat the same title on consecutive questions. If two questions would
    share a title, merge them into one question with all items combined.
  * When AI generates "X marks each", it means ONE question with multiple sub-items,
    not separate questions. The marks field = (marks per item × number of items).
  * Use section headers to separate question types/difficulty levels, e.g.:
    - Section A: Objective (MCQ, fill-blanks, true/false) — 1 mark each
    - Section B: Short Answer — 2-3 marks each
    - Section C: Long Answer — 5+ marks each

Output contract:
- Return JSON matching the supplied schema and nothing else. No Markdown, prose
  outside JSON, or code fences.
- settings contains the paper metadata, including subject, class, totalMarks,
  language, assessmentTitle, and answerKey.
- questions is the ordered printable paper. The website adds numbering, so never
  emit Q1, 1., a), (i), or similar labels.
- Use only the question types and fields supported by the schema. If uncertain,
  use short-answer rather than inventing a field.
- Check the marks sum, question count, unit coverage, language, and requested
  answer-key behavior one final time before returning JSON.`;

export interface GenerateBrief {
  subject: string;
  className?: string;
  unitName: string;
  bookName?: string;
  marks: number;
  language?: string;
  /** Restrict output to these question types when non-empty. */
  types?: string[];
  /** Free-text steer from the teacher. */
  notes?: string;
  answerKey?: boolean;
  paperMode?: boolean;
  timeAllowed?: string;
}

function briefToText(b: GenerateBrief, imageCount: number): string {
  if (b.paperMode) {
    return [
      "Create one complete, ready-to-print school examination paper.",
      `Subject: ${b.subject}`,
      b.className ? `Class: ${b.className}` : null,
      `Units / topics to cover: ${b.unitName}`,
      `Maximum marks: ${b.marks}`,
      b.timeAllowed ? `Time allowed: ${b.timeAllowed}` : null,
      b.language && b.language !== "english"
        ? `Write every question in ${b.language} (use its own script).`
        : null,
      b.notes ? `Teacher's instructions and source material:\n${b.notes}` : null,
      b.answerKey ? "The teacher explicitly requests an answer key. Include answers for objective/short items and marking guidance for descriptive items." : null,
      "",
      "Use a balanced mid-term pattern appropriate for the class. Structure the paper into clear sections with section headers (structural questions with marks: 0 and empty items). Include objective questions (MCQ, fill in the blanks, true/false or matching), very short/short answers, descriptive long answers, and at least one application, source-based, or case-based question when appropriate. Group same-type, same-mark questions under ONE question object with multiple items — never create separate questions that would share the same instruction title.",
      "Cover all listed units proportionally. Make the sum of question marks exactly equal to the maximum marks. Include the answer key only when the teacher has requested it. Keep every question unambiguous and within the stated syllabus.",
      "Generate a general instructions array in settings.instructions with 4-8 lines covering: number of sections, question counts per section, compulsory status, calculator policy, and any internal choice information.",
      "Return clean question text without question numbers; the app adds numbering automatically.",
    ].filter(Boolean).join("\n");
  }

  const lines = [
    `Subject: ${b.subject}`,
    b.className ? `Class: ${b.className}` : null,
    `Unit: ${b.unitName}`,
    b.bookName ? `Textbook: ${b.bookName}` : null,
    `Total marks to cover: ${b.marks}`,
    b.language && b.language !== "english"
      ? `Write every question in ${b.language} (use its own script).`
      : null,
    b.types?.length ? `Use only these question types: ${b.types.join(", ")}.` : null,
    b.notes ? `Teacher's notes: ${b.notes}` : null,
    imageCount > 0
      ? `${imageCount} photo(s) of the textbook pages for this unit are attached — base the questions on them.`
      : null,
    "",
    `Write questions worth about ${b.marks} marks in total for this unit.`,
  ];
  return lines.filter(Boolean).join("\n");
}

export async function generateQuestions(
  brief: GenerateBrief,
  images: ScanImage[],
  anthropicModel: string
): Promise<ExtractResult> {
  const job: Job = {
    label: "Question generation",
    system: GENERATE_SYSTEM,
    // Warm enough that two runs on the same unit differ, cold enough to stay
    // on-syllabus.
    temperature: 0.8,
    userText: (n) => briefToText(brief, n),
    emptyError: "No questions were generated. Try again with more detail.",
  };
  return run(job, images, anthropicModel);
}

export interface RegenerateQuestionBrief {
  subject: string;
  className?: string;
  language?: string;
  question: Question;
  notes?: string;
}

export async function regenerateSingleQuestion(
  brief: RegenerateQuestionBrief,
  anthropicModel: string
): Promise<ExtractResult> {
  const q = brief.question;
  const job: Job = {
    label: "Question regeneration",
    system: `You are an experienced Indian school teacher and examination paper setter.
Your task is to REGENERATE / REPLACE a single question on an examination paper with a fresh alternate question.

Strict Rules:
- Output exactly ONE question inside the "questions" array.
- The replacement question MUST match the exact question type ("${q.type}") and mark value (${q.marks} marks).
- Subject: ${brief.subject}. Class: ${brief.className || "Standard"}. Language: ${brief.language || "english"}.
- If language is not English, write the question in that language's native script.
- The question must test equivalent syllabus concepts but with COMPLETELY FRESH text, numbers, contexts, or answer options.
- Put instructions in title and sub-items in items[]. Never include numbering like "Q1." or "1.".
- Return JSON strictly matching the schema: { "questions": [ <one Question object> ] }.`,
    temperature: 0.85,
    userText: () => [
      `Replace this existing ${q.type} question on a ${brief.subject} (Class ${brief.className || "Standard"}) paper:`,
      `Title: ${q.title}`,
      `Marks: ${q.marks}`,
      q.items?.length ? `Current items: ${JSON.stringify(q.items)}` : null,
      q.matchLeft?.length ? `Left items: ${JSON.stringify(q.matchLeft)}` : null,
      q.matchRight?.length ? `Right items: ${JSON.stringify(q.matchRight)}` : null,
      q.passage ? `Current passage: ${q.passage}` : null,
      q.operation ? `Operation: ${q.operation}` : null,
      brief.notes ? `Teacher notes/context: ${brief.notes}` : null,
      "",
      `Generate 1 completely fresh replacement ${q.type} question worth ${q.marks} marks with balanced difficulty.`,
    ].filter(Boolean).join("\n"),
    emptyError: "Could not regenerate question. Try again.",
  };
  return run(job, [], anthropicModel);
}

