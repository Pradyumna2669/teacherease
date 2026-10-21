// SEO content articles. Real, useful guides targeting long-tail searches Indian
// teachers actually make — each funnels to the product. Rendered by
// app/guides/[slug]/page.tsx; listed in sitemap + the /guides hub.

export type Block =
  | { h: string }
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { table: { caption?: string; head: string[]; rows: string[][] } };

export interface Article {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  updated: string;
  published: string;
  readMins: number;
  intro: string;
  category: "Formats & Templates" | "Question Types" | "Scanning & Digitising" | "Classroom Examples";
  blocks: Block[];
}

export const ARTICLE_CATEGORIES: Array<Article["category"]> = [
  "Formats & Templates",
  "Question Types",
  "Scanning & Digitising",
  "Classroom Examples",
];

export const ARTICLES: Article[] = [
  {
    slug: "question-paper-format",
    title: "Question Paper Format: A Simple Guide for School Teachers",
    description:
      "A clear, practical guide to laying out a school exam question paper — header, sections, marks, and the common question types — with a ready format you can reuse.",
    keywords: [
      "question paper format",
      "exam paper format",
      "question paper structure",
      "how to make a question paper",
    ],
    updated: "2026-08-01",
    published: "2026-06-26",
    readMins: 9,
    intro:
      "A good question paper is easy to read, fairly weighted, and quick to mark. This is the format Indian school papers actually follow — header, instructions, sections, marks split — with the numbers filled in, the mistakes that cost marks in moderation, and a template you can reuse every term.",
    category: "Formats & Templates",
    blocks: [
      {
        p: "Almost every school in India uses a version of the same question paper format. It is not written down anywhere as a rule, but a Class 5 unit test in Nagpur and a Class 8 half-yearly in Lucknow will look recognisably alike: a header block, a short instructions box, two to four labelled sections, marks in the right margin, and ruled space to write in. Once you know the pattern, setting a paper stops being a design problem and becomes a five-minute job of dropping in questions.",
      },
      {
        p: "This guide walks through each part in the order it appears on the page, gives you a marks split that works, and lists the things that most often get a paper sent back by a coordinator.",
      },

      { h: "1. The header" },
      {
        p: "The header does two jobs: it identifies the assessment, and it gives the student somewhere to write their details so you are not marking anonymous scripts. Keep it to four or five lines. A header that runs to a third of the first page is stealing space from questions.",
      },
      {
        ul: [
          "School name, centred, in the largest type on the page",
          "Assessment title — Unit Test 1, Half-Yearly Examination, Annual Examination, Formative Assessment 2",
          "Subject, class and section, and the academic year",
          "Student fields: Name, Roll No., Date — as ruled blanks, not just labels",
          "Time allowed and total marks, conventionally in the top-right corner",
        ],
      },
      {
        p: "Two details separate a tidy header from a messy one. First, put time and marks on the same line, right-aligned — students and invigilators look for them in the same place every time. Second, make the student-detail blanks long enough to actually write in. A 2 cm line for a full name is the single most common complaint from primary teachers marking a stack of papers.",
      },

      { h: "2. General instructions" },
      {
        p: "The instructions block sits directly under the header, usually boxed or ruled off. Its purpose is to answer, before a student reads Question 1, every procedural question they might raise mid-exam. Three to six lines is right. Longer than that and nobody reads it.",
      },
      {
        ul: [
          "How many sections the paper has, and whether all are compulsory",
          "Whether internal choice is offered, and where",
          "How marks are indicated (usually: figures to the right of the question)",
          "Any subject-specific rule — show your working, draw diagrams in pencil, answer in complete sentences",
          "Reading time, if your school allots it separately",
        ],
      },
      {
        p: "Write instructions as short imperative lines, not a paragraph. A Class 4 student reading a dense block of prose before an exam will skip it, and then ask you about it in the hall.",
      },

      { h: "3. Sections and the marks split" },
      {
        p: "Sections exist so the paper moves from recall to reasoning. The convention across CBSE, state boards and most private schools is to run objective questions first and long answers last, so a student who is slow to settle still banks marks early.",
      },
      {
        p: "Here is a marks split that works for a 40-mark primary paper and scales cleanly to 50 and 80. The proportions matter more than the exact numbers — roughly a quarter objective, a third short answer, and the rest long-form.",
      },
      {
        table: {
          caption: "Marks split by paper total",
          head: ["Section", "Question type", "40 marks", "50 marks", "80 marks"],
          rows: [
            ["A", "Objective — fill in the blanks, MCQ, true/false, match", "10", "12", "20"],
            ["B", "Very short answer — one word or one line", "8", "10", "16"],
            ["C", "Short answer — two to three lines", "12", "16", "24"],
            ["D", "Long answer, comprehension, word problems", "10", "12", "20"],
          ],
        },
      },
      {
        p: "A few rules of thumb when you adapt this. Keep every section a round number so the total is easy to verify. Do not let any single question carry more than about an eighth of the paper — one bad question then decides the result. And if you offer internal choice, offer it only in Section D, where the marks are large enough for the choice to be meaningful.",
      },

      { h: "4. Question types, and how many of each" },
      {
        p: "A paper that uses one question type all the way through is quick to set and terrible to sit. Mixing types tests different things: recall, recognition, application, and expression. It also keeps a young student engaged past the halfway mark.",
      },
      {
        table: {
          caption: "Typical usage by question type",
          head: ["Type", "Marks each", "Best used for", "Watch out for"],
          rows: [
            ["Fill in the blanks", "1", "Vocabulary, facts, definitions", "Blanks with more than one correct answer"],
            ["Multiple choice", "1", "Quick coverage of a wide syllabus", "Options of obviously different lengths"],
            ["True or false", "1", "Common misconceptions", "Statements with a hidden double negative"],
            ["Match the following", "1 per pair", "Terms and their meanings", "Equal column lengths make guessing easy"],
            ["Very short answer", "1–2", "Single facts, units, names", "Questions that invite a paragraph"],
            ["Short answer", "2–3", "Explanation in two or three lines", "Not enough ruled space provided"],
            ["Long answer", "4–5", "Reasoning, description, opinion", "Too many in one paper for the time given"],
            ["Comprehension", "5–10", "Reading and inference", "Passage longer than the answers it supports"],
            ["Word problems", "2–4", "Applying a method to a situation", "Unfamiliar context masking a simple sum"],
            ["Vertical sums", "1–2", "Computation accuracy", "Digits not aligned in the printed column"],
          ],
        },
      },
      {
        p: "One more type worth using deliberately: the match-the-following with an extra option in the right column. It removes the last-pair giveaway, where a student who knows three of four pairs gets the fourth for free.",
      },

      { h: "5. Answer space, and why it decides your marking speed" },
      {
        p: "Answer space is the part teachers most often get wrong, and it costs time twice — students write across the margin, and you decipher it while marking. Size the space to the answer you expect, not to what fits on the page.",
      },
      {
        ul: [
          "One-word answers: a single ruled blank on the same line as the question",
          "Two- to three-line answers: three ruled lines, spaced at least 8 mm apart for primary classes",
          "Long answers: six to ten ruled lines, or a note saying to use the answer sheet",
          "Vertical maths sums: a boxed area, full width, with nothing printed alongside",
          "Diagrams: an empty box with a caption line under it, never open page space",
        ],
      },
      {
        p: "For Classes 1 to 3, use wider line spacing than feels necessary. Young children write large, and a cramped paper produces answers that run into the next question — which then reads as a wrong answer.",
      },

      { h: "6. Printing and photocopying" },
      {
        p: "A paper that looks right on screen can still photocopy badly. Most school copiers lose a few millimetres at the edge and flatten light greys.",
      },
      {
        ul: [
          "Print A4 with margins of at least 15 mm on all sides, 20 mm at the bottom",
          "Avoid grey fills and light rules — they wash out or turn muddy after two copy generations",
          "Keep a question and its answer space on the same page; a split question causes queries in the hall",
          "Number pages and print the total, so a missing sheet is caught before the exam and not during it",
          "Print one copy first and read it on paper — errors that hide on screen jump out in print",
        ],
      },

      { h: "7. The checklist before you send it for copying" },
      {
        ol: [
          "Do the section marks add up to the stated total? Check by adding the right margin, not by trusting the plan.",
          "Is every question numbered, in sequence, with no repeats after an edit?",
          "Does each question have marks shown, right-aligned and consistent?",
          "Is the time allowed realistic — roughly one mark per minute for primary, a little less for long-answer-heavy papers?",
          "Does the syllabus coverage match what you actually taught this term?",
          "Are the instructions accurate after your last edit? Changing the section count and forgetting the instruction line is the most common slip.",
          "Have you read the whole paper aloud once? Ambiguity is easier to hear than to see.",
        ],
      },

      { h: "A reusable template" },
      {
        p: "The real time saving is not in setting one good paper. It is in never setting the format again. Build the header, instructions and section skeleton once per subject, save it, and each term you replace only the questions. Over a year that is the difference between forty minutes a paper and five.",
      },
      {
        p: "That is the workflow PaperGen is built around. Pick a header style, add questions of any of the types above, set the marks, and the live A4 preview is exactly what prints — including the ruled answer space and the right-aligned marks column. If you already write your papers by hand, photograph them instead of retyping: the handwritten paper comes back as an editable, formatted one you can adjust and export as a PDF.",
      },
    ],
  },
  {
    slug: "exam-paper-format-for-teachers",
    title: "Exam Paper Format for Teachers: A Reusable School Template",
    description:
      "Use this reusable exam paper format for school tests and term exams: clean sections, marks split, instructions, and a practical template teachers can copy.",
    keywords: [
      "exam paper format for teachers",
      "school exam paper format",
      "exam paper template",
      "teacher exam format",
    ],
    updated: "2026-08-01",
    published: "2026-06-30",
    readMins: 8,
    intro:
      "Most exam papers do not need a fancy design. They need clarity, fairness, and a format you can repeat every month without rebuilding from zero. This is a template you can copy — with the marks split by subject, a per-class time guide, and the format errors that get a paper returned by a coordinator.",
    category: "Formats & Templates",
    blocks: [
      {
        p: "A school year has a lot of assessments in it. Two or three unit tests a term, a half-yearly, an annual, plus formative work — for a teacher handling three sections, that is easily twenty papers to set. Almost none of that work needs to be original. The format should be settled once, at the start of the year, and reused. Only the questions change.",
      },
      {
        p: "What follows is a template built from what Indian school papers actually look like, adapted per subject, with the parts that vary marked out.",
      },

      { h: "The five parts of the template" },
      {
        p: "Every paper you set for the rest of the year is these five parts in this order. Fix them once.",
      },
      {
        ol: [
          "Header — school, assessment title, subject, class and section, academic year, and the student's name, roll number and date. Time allowed and total marks go top-right.",
          "Instructions — three to six short imperative lines covering sections, compulsory questions, internal choice, and how marks are shown.",
          "Sections — labelled A, B, C, D, running from objective to long answer, each with its section total stated in the heading.",
          "Questions — numbered continuously across sections, marks right-aligned, answer space sized to the expected answer.",
          "Footer — page number and total, plus a short line marking the end of the paper.",
        ],
      },
      {
        p: "That last item is worth keeping. A printed \"*** End of paper ***\" line stops a student spending the last ten minutes looking for a page that does not exist.",
      },

      { h: "A practical 50-mark layout" },
      {
        table: {
          caption: "50-mark paper, 90 minutes",
          head: ["Section", "Contents", "Questions", "Marks", "Suggested time"],
          rows: [
            ["A", "Objective — fill in the blanks, MCQ, true/false, match", "10–12", "10", "15 min"],
            ["B", "Very short answer — one word or one line", "6–8", "12", "20 min"],
            ["C", "Short answer — two to three lines", "5–6", "15", "30 min"],
            ["D", "Long answer or application", "3", "13", "25 min"],
          ],
        },
      },
      {
        p: "Scale this by keeping the proportions. For a 25-mark class test, halve everything and drop Section D to a single question. For an 80-mark annual, keep four sections but lengthen Section C rather than adding a fifth — more sections make a paper harder to navigate, not more thorough.",
      },

      { h: "How the split changes by subject" },
      {
        p: "The skeleton stays the same. What shifts is the weight, because subjects test different things.",
      },
      {
        table: {
          caption: "Weighting by subject, as a share of total marks",
          head: ["Subject", "Objective", "Short answer", "Long answer", "Notes"],
          rows: [
            ["Maths", "20%", "30%", "50%", "Section D is word problems; leave generous working space"],
            ["Science / EVS", "25%", "40%", "35%", "Reserve marks for one labelled diagram"],
            ["English", "20%", "30%", "50%", "Comprehension passage plus a writing task carry Section D"],
            ["Social studies", "25%", "35%", "40%", "Map or timeline work fits Section C well"],
            ["Regional language", "20%", "30%", "50%", "Grammar in A and B, passage and essay in C and D"],
          ],
        },
      },

      { h: "Time allowed, by class" },
      {
        p: "The usual rule is one mark per minute plus reading time, but that overestimates what a primary child can sustain. Younger students need more time per mark and a shorter paper overall.",
      },
      {
        table: {
          caption: "Sensible paper length by class",
          head: ["Class", "Typical total", "Time", "Longest single question"],
          rows: [
            ["1–2", "20–25 marks", "45 min", "2 marks"],
            ["3–5", "40–50 marks", "60–90 min", "5 marks"],
            ["6–8", "50–80 marks", "2 hours", "5–6 marks"],
            ["9–10", "80 marks", "3 hours", "8 marks"],
          ],
        },
      },
      {
        p: "If your paper regularly runs long, the fix is usually not more time. It is fewer long-answer questions — three well-chosen five-markers test more than five rushed ones.",
      },

      { h: "Where the format usually goes wrong" },
      {
        p: "These are the errors that get a paper handed back by an exam coordinator, in rough order of how often they happen.",
      },
      {
        ul: [
          "Section marks do not add up to the stated total — almost always the result of a late edit",
          "Marks missing on some questions, or shown inconsistently (5 marks in one place, [5] in another)",
          "Question numbering restarting at each section while the instructions say it runs continuously",
          "A question split across a page break, with its answer space on the next sheet",
          "Answer space sized by what fitted rather than by the answer expected",
          "Instructions that no longer match the paper — three sections described, four printed",
          "Internal choice offered in a one-mark question, where it means nothing",
          "Too many question types crammed in, so the paper reads as a list of formats rather than an assessment",
          "Grey shading or light rules that vanish in photocopying",
        ],
      },

      { h: "The moderation pass" },
      {
        p: "Before the paper goes for copying, read it once as a student would, in order, with a watch running. This catches three things nothing else does: questions that are ambiguous when read cold, a total time that is unrealistic, and two questions that unintentionally test the same thing.",
      },
      {
        ol: [
          "Read the paper start to finish without stopping to edit.",
          "Note anywhere you hesitated over what was being asked — that is where students will too.",
          "Check syllabus coverage against what you actually taught, not against the textbook contents page.",
          "Add the marks in the right margin. Compare with the header total.",
          "Fix everything you noted, then re-check the total. Edits break totals.",
        ],
      },

      { h: "Build once, reuse all term" },
      {
        p: "The efficient approach is a saved template per subject, not a fresh document per test. Set the header, instructions and section skeleton in August and spend the rest of the year swapping questions in and out.",
      },
      {
        p: "PaperGen is built for exactly that loop: reusable headers, the question types above ready to drop in, marks aligned automatically, a live A4 preview that is the printed page, and one-click PDF export. Saved papers stay editable, so next term's test starts from last term's rather than from a blank page — and editing a saved paper costs nothing.",
      },
    ],
  },
  {
    slug: "maths-question-paper-template",
    title: "Maths Question Paper Template for School Teachers",
    description:
      "A simple maths question paper template with sections for sums, word problems, and short answers — designed for clean A4 printing and quick marking.",
    keywords: [
      "maths question paper template",
      "math question paper format",
      "school maths test template",
      "maths exam paper layout",
    ],
    updated: "2026-08-01",
    published: "2026-06-30",
    readMins: 8,
    intro:
      "Maths papers fail when the layout is cramped. Students need clean digit columns, visible working space, and a flow from basic facts to applied problems. Here is a template that works from Class 1 to Class 8, with per-class marks splits and the layout rules that keep a printed sum readable.",
    category: "Formats & Templates",
    blocks: [
      {
        p: "A maths paper is the hardest school paper to lay out, and it is the one most often laid out badly. The reason is simple: everything else on a question paper is text, and text flows. A vertical sum does not flow. It occupies a fixed block of space with digits that must line up by place value, and if that block gets squeezed to fit a page, the question becomes unanswerable.",
      },
      {
        p: "This guide covers the maths-specific layout rules first, then gives a template and marks split you can copy per class.",
      },

      { h: "What makes a maths paper readable" },
      {
        ul: [
          "Digit columns that align by place value — units under units, tens under tens, all the way up",
          "Working space attached to each question, not a single rough-work page at the end",
          "One sum per block, with clear white space between blocks",
          "Instructions short enough to read in five seconds",
          "Objective and written work in clearly separate sections",
          "Consistent notation — pick ÷ or /, pick × or *, and never mix them in one paper",
        ],
      },
      {
        p: "The alignment point matters more than teachers expect. When a printed vertical sum has its digits even slightly out of column, a Class 3 student copying it into their answer will inherit the misalignment and get the carry wrong. That is a layout error scoring as a maths error.",
      },

      { h: "The template" },
      {
        p: "Four sections, running from recall to application. It scales from a 20-mark Class 2 test to an 80-mark Class 8 annual by changing the marks, not the structure.",
      },
      {
        table: {
          caption: "Section structure for a maths paper",
          head: ["Section", "Contents", "Question types", "Space needed"],
          rows: [
            ["A", "Basic facts — tables, number names, place value, mental maths", "Fill in the blanks, MCQ, true/false", "One line per question"],
            ["B", "Direct computation", "Vertical addition, subtraction, multiplication, division", "Full-width block per sum"],
            ["C", "Word problems and application", "Word problems, two-step problems", "Six to eight ruled lines each"],
            ["D", "Reasoning, shapes, data", "Data interpretation, geometry, pattern questions", "Boxed area with a diagram"],
          ],
        },
      },

      { h: "Marks split by class" },
      {
        p: "The shift as classes go up is away from computation and towards application. A Class 2 paper is mostly Section B; a Class 8 paper is mostly Sections C and D.",
      },
      {
        table: {
          caption: "Suggested marks by class",
          head: ["Class", "Total", "A — facts", "B — computation", "C — word problems", "D — reasoning"],
          rows: [
            ["1–2", "20", "6", "10", "4", "—"],
            ["3", "40", "8", "14", "12", "6"],
            ["4–5", "50", "10", "14", "16", "10"],
            ["6–8", "80", "12", "18", "30", "20"],
          ],
        },
      },

      { h: "A worked example — Class 4, 50 marks" },
      {
        ol: [
          "Q1 Fill in the blanks — place value and number names — 5 marks",
          "Q2 Multiple choice — units, time, and money — 5 marks",
          "Q3 Vertical addition and subtraction, four sums — 8 marks",
          "Q4 Multiplication and long division, three sums — 6 marks",
          "Q5 Word problems, four questions — 12 marks",
          "Q6 A two-step word problem — 4 marks",
          "Q7 Read a bar graph and answer three questions — 6 marks",
          "Q8 Draw and label a shape, or measure and record — 4 marks",
        ],
      },
      {
        p: "Note what this does with time. Sections A and B take a strong student ten minutes and a weak student twenty-five. That gap is deliberate: it means nobody sits staring at Question 1, and the harder marks in Q5 to Q8 are what separate the paper.",
      },

      { h: "Laying out vertical sums" },
      {
        p: "This is where most maths papers are lost. A few concrete rules:",
      },
      {
        ul: [
          "Give each sum the full column width. Two sums side by side saves paper and costs alignment.",
          "Leave at least three blank lines beneath each sum — that is where the carrying and the working goes.",
          "Use a monospaced or tabular-figure font so every digit occupies the same width. A proportional font puts a 1 in less space than an 8 and the column stops being a column.",
          "Print the operator once, on the left of the second row, in the position students are taught to write it.",
          "For long division, box the whole question. An unboxed long division sprawls into the next question's space.",
          "Never let a sum break across a page. If it does not fit, move the whole block.",
        ],
      },

      { h: "Word problems that test maths, not reading" },
      {
        p: "A word problem should be hard because the mathematics is hard, not because the sentence is. For primary classes especially, keep the language plain and the context familiar.",
      },
      {
        ul: [
          "One or two sentences. If it needs three, it is testing comprehension.",
          "Use names and objects children in your class actually know",
          "Put the numbers in the order the operation needs them, unless reordering is the point of the question",
          "State the units in the question and expect them in the answer",
          "Avoid unfamiliar contexts — a question about a metro card fails in a village school for reasons that have nothing to do with division",
        ],
      },

      { h: "Printing a maths paper" },
      {
        ul: [
          "Full-width blocks for every vertical sum, no exceptions",
          "Do not push four word problems into the bottom of a page — they need the ruled space more than the earlier questions do",
          "Bottom margin of at least 20 mm; photocopiers clip the bottom edge first",
          "Larger line height for Classes 1 to 3 — young children write big, and a cramped answer looks like a wrong one",
          "If a graph or diagram is printed, check it survives one photocopy generation before running 40 copies",
        ],
      },

      { h: "Why Word is slow for this" },
      {
        p: "Word is fine for text and poor for maths layout. Aligning a vertical sum means fighting tab stops or building a borderless table per question; keeping the marks column straight means another table; adding a question in the middle re-flows everything below it. Teachers end up drawing answer lines with underscores, which shift the moment anything above changes.",
      },
      {
        p: "A purpose-built paper maker treats a vertical sum as a question type rather than as formatting. PaperGen has vertical maths, word problems and data questions as first-class types — the digit alignment, the working space and the marks column are handled, and the live A4 preview is exactly what prints. Add a question in the middle and nothing below it breaks. If you already have last year's maths paper on paper, photograph it and get it back editable rather than retyping every sum.",
      },
    ],
  },
  {
    slug: "scan-handwritten-paper-to-pdf",
    title: "How to Turn a Handwritten Question Paper into a Printable PDF",
    description:
      "Have a handwritten question paper? Learn how to scan it into a clean, editable, print-ready PDF in minutes — no retyping, no typist.",
    keywords: [
      "scan handwritten paper to pdf",
      "handwritten question paper to digital",
      "convert handwritten paper to pdf",
      "handwriting to text question paper",
    ],
    updated: "2026-08-01",
    published: "2026-06-26",
    readMins: 8,
    intro:
      "Most teachers still write papers by hand, then pay a typist to make them printable. There is a faster way: photograph the handwritten paper and get a clean, editable, print-ready PDF in minutes. Here is how to do it, how to get a scan that reads accurately, and what to check before you print.",
    category: "Scanning & Digitising",
    blocks: [
      {
        p: "Ask a teacher how long a question paper takes and the honest answer splits in two. Writing it takes twenty minutes, because you know your syllabus and your class. Getting it printable takes a day, because it goes to a typist, comes back with three mistakes in the Hindi, goes back, and returns the following afternoon.",
      },
      {
        p: "Scanning removes that second half. You photograph the paper you already wrote, it is read into editable text laid out in a proper format, you correct anything misread, and you export a PDF. The whole loop is minutes, and it happens on your phone.",
      },

      { h: "Why retyping is the slow part" },
      {
        p: "The draft is not the bottleneck. Handwriting is genuinely the fastest way to think through a paper — you can sketch the section structure, move a question, and change your mind without touching a mouse. What costs the day is converting that draft into something a photocopier can use.",
      },
      {
        table: {
          caption: "Getting a handwritten paper to print",
          head: ["Route", "Turnaround", "Cost", "Edits later"],
          rows: [
            ["Local typist", "Half a day to two days", "Per page, every time", "Another round trip"],
            ["Retype yourself in Word", "40–60 minutes per paper", "Your evening", "Re-flows the layout"],
            ["Photocopy the handwriting", "Immediate", "Copying only", "None — rewrite from scratch"],
            ["Scan to editable", "2–5 minutes", "A few credits", "Edit and re-export free"],
          ],
        },
      },
      {
        p: "The photocopy route deserves a mention because so many schools use it. It works, but it costs you twice: a handwritten paper photocopies poorly by the second generation, and next term you have nothing to edit — you write the whole thing again.",
      },

      { h: "Scan instead of retype" },
      {
        p: "With PaperGen you photograph each page of your handwritten paper. The questions are read — fill in the blanks, MCQs, match the following, short and long answers, vertical maths sums — and rebuilt as an editable, formatted paper. You review it, fix anything that came through wrong, and download a print-ready A4 PDF.",
      },
      {
        p: "It handles regional scripts as well as English. A handwritten Hindi, Marathi, Tamil, Telugu or Bengali paper comes back as editable text in the same language, set in a proper font, which is the part a typist charges most for and gets wrong most often.",
      },

      { h: "How to get a scan that reads accurately" },
      {
        p: "Recognition quality depends almost entirely on the photo. Two minutes of care here saves ten minutes of correction afterwards.",
      },
      {
        ol: [
          "Find even light. A window during the day is ideal. Overhead tube light directly above you throws your own shadow across the page — step to the side.",
          "Flatten the page. If it has been folded in a register, press it under a book for a minute first. A curved page distorts the lines at the edges.",
          "Fill the frame. Hold the phone directly above the page, not at an angle, and get the paper edges just inside the frame. Cropping tightly is better than a small page in a large photo.",
          "Hold steady and check the preview. If the text looks soft on your phone screen, it will read badly. Retake it.",
          "One photo per page, in order. Do not photograph two pages at once, even if they are facing pages in a register.",
        ],
      },
      {
        ul: [
          "Write in pen, not pencil — faint pencil is the single most common cause of misreads",
          "Avoid ruled paper with heavy dark lines; they compete with your writing",
          "Do not photograph through a plastic file cover, which adds glare",
          "If a page has corrections struck through, they may be read as text — rewrite that line cleanly",
        ],
      },

      { h: "What reads well, and what needs a second look" },
      {
        table: {
          caption: "Recognition by content type",
          head: ["Content", "Usually fine", "Check carefully"],
          rows: [
            ["Printed-style handwriting", "Yes", "—"],
            ["Cursive English", "Mostly", "Similar letter pairs — a/o, n/u"],
            ["Devanagari, Bengali, Tamil, Telugu", "Mostly", "Matras, conjuncts, and vowel signs"],
            ["Numbers and marks", "Yes", "1 vs 7, and 0 vs 6 in a hurried hand"],
            ["Vertical maths sums", "Yes", "Digit alignment and the operator"],
            ["MCQ option labels", "Yes", "Options crowded onto one line"],
            ["Diagrams and figures", "No", "Add these after the scan"],
          ],
        },
      },
      {
        p: "The general rule: text reads well, layout is rebuilt, and drawings are not carried over. If your paper has a diagram to be labelled, plan to insert that space after scanning rather than expecting the drawing to survive.",
      },

      { h: "What you can edit afterwards" },
      {
        ul: [
          "Correct any recognised text, in English or in the regional script",
          "Change marks and reorder sections",
          "Add or remove questions entirely",
          "Choose the header style and fill in school, class, subject and date",
          "Adjust answer-line spacing before export — usually worth increasing for primary classes",
          "Save the paper and reuse it next term with new numbers",
        ],
      },

      { h: "Check this before you print 40 copies" },
      {
        ol: [
          "Read every question against the original page. Recognition is good, not perfect, and one misread number in a maths question invalidates it.",
          "Confirm question numbering is sequential and nothing was dropped between pages.",
          "Add the marks in the right column and check they match the header total.",
          "Look specifically at regional-script words — matras and conjuncts are where misreads cluster.",
          "Check MCQ options are all present, in order, with the right labels.",
          "Print one copy and read it on paper before running the batch.",
        ],
      },

      { h: "From photo to PDF" },
      {
        p: "Sign in, open the scan tool, add your photos in page order, and let it read the paper. Within a minute you have an editable version. Correct what needs correcting, set the header, and one click exports a clean A4 PDF you can print, share on WhatsApp, or store for next term.",
      },
      {
        p: "New accounts start with 60 free credits, which is enough to scan and export your first paper without paying anything. Editing a saved paper afterwards is free — so the second term's version of the same test costs nothing at all.",
      },
    ],
  },
  {
    slug: "handwritten-question-paper-format",
    title: "Handwritten Question Paper to Digital Format: Best Workflow for Teachers",
    description:
      "Start with a handwritten draft and turn it into a clean digital question paper without retyping everything. A practical workflow for teachers.",
    keywords: [
      "handwritten question paper format",
      "handwritten question paper to digital",
      "convert handwritten exam paper",
      "scan teacher paper to editable format",
    ],
    updated: "2026-06-30",
    published: "2026-06-30",
    readMins: 4,
    intro:
      "Many teachers draft papers fastest on paper, not on a keyboard. The issue is not writing the draft. The issue is getting from draft to a clean printable version without duplicating work.",
    category: "Scanning & Digitising",
    blocks: [
      { h: "A workflow that wastes the least time" },
      {
        ul: [
          "Draft by hand as usual",
          "Photograph each page clearly",
          "Convert to editable text and question blocks",
          "Correct only the small recognition errors",
          "Export the final paper as PDF",
        ],
      },
      { h: "Why teachers still use handwriting first" },
      {
        p: "Handwritten drafting is fast during school hours. You can scribble a structure, move sections around mentally, and finish the thinking before worrying about formatting.",
      },
      { h: "Where the digital version matters" },
      {
        ul: [
          "Printing for multiple sections",
          "Sharing with school coordinators",
          "Reusing the paper next term",
          "Editing marks or question order later",
        ],
      },
      { h: "What to check before printing" },
      {
        ul: [
          "Question numbering is preserved",
          "Marks are visible and correct",
          "Maths or MCQ formatting survived properly",
          "Header details match the assessment",
        ],
      },
      { h: "The efficient setup" },
      {
        p: "The best workflow is not handwriting or software alone. It is handwriting for drafting plus structured software for final formatting. That is exactly the gap PaperGen closes.",
      },
    ],
  },
  {
    slug: "free-question-paper-maker",
    title: "The Easiest Way to Make Question Papers Online",
    description:
      "Make professional school question papers online in minutes — free to start. Compare it to Word and the local typist, and see why teachers switch.",
    keywords: [
      "question paper maker online",
      "free question paper generator",
      "make question paper online",
      "question paper software for teachers",
    ],
    updated: "2026-08-01",
    published: "2026-06-26",
    readMins: 8,
    intro:
      "You have four options for making a question paper: a typist, Microsoft Word, a generic template you downloaded, or a purpose-built maker. Here is an honest comparison for a busy teacher — what each costs in money and time, where each breaks, and which one suits your situation.",
    category: "Formats & Templates",
    blocks: [
      {
        p: "Every teacher solves this problem somehow, and most solve it the way the staffroom next door does. That is not a bad heuristic, but it means a lot of teachers have never compared the options directly. Here they are, with the trade-offs stated plainly.",
      },
      {
        table: {
          caption: "The four routes, compared",
          head: ["", "Typist", "Microsoft Word", "Downloaded template", "Paper maker"],
          rows: [
            ["Time for the first paper", "Half a day+", "45–60 min", "30–40 min", "10–15 min"],
            ["Time for the tenth paper", "Half a day+", "30–40 min", "25–30 min", "5 min"],
            ["Cost per paper", "Per page, every time", "Free if you have it", "Free", "A few credits"],
            ["Regional script", "Depends on the typist", "Needs a keyboard set up", "Usually breaks", "Type in English letters"],
            ["Vertical maths layout", "Manual", "Painful", "Fixed, hard to change", "Built in"],
            ["Editing later", "Another round trip", "Re-flows the document", "Re-flows the document", "Edit and re-export"],
            ["Reuse next term", "Start again", "Copy the file", "Copy the file", "Open the saved paper"],
          ],
        },
      },

      { h: "The typist" },
      {
        p: "Reliable, familiar, and the default in a lot of schools — especially where papers are set in a regional language and the staffroom computer has no keyboard for it. You hand over your handwritten pages and get back a typed paper.",
      },
      {
        ul: [
          "Works — Someone else absorbs the formatting problem, and a good typist knows the school's house format",
          "Slow — Half a day at best, two days at exam time when everyone is queuing",
          "Costs per page, every single time, including for a paper you set last year",
          "Every edit is another trip. Changing one number means going back",
          "Regional-script errors are common, and you are the one who has to catch them",
        ],
      },
      {
        p: "The typist makes most sense if you set very few papers a year and none of them change. For anyone setting a paper a month, the per-page cost compounds badly.",
      },

      { h: "Microsoft Word" },
      {
        p: "Free if the school already has it, and everyone knows roughly how it works. That familiarity is genuinely worth something. But Word is a general document editor, and a question paper is a specific, awkward document.",
      },
      {
        ul: [
          "Aligning the marks column means a borderless table, or fighting tab stops",
          "Answer lines drawn with underscores shift every time anything above them changes",
          "Vertical maths sums need a table per sum, and the digits still do not line up in a proportional font",
          "Inserting a question in the middle re-flows every page after it",
          "Regional scripts need a keyboard layout installed and a font that renders conjuncts properly",
          "A paper that looks right on screen can still break across a page when printed",
        ],
      },
      {
        p: "Word is a reasonable choice for a plain text-only paper — an English comprehension test, say. It is a poor choice for anything with maths, and a frustrating one for anything in a regional script.",
      },

      { h: "A downloaded template" },
      {
        p: "The middle option people forget. Someone has already built the format, so you skip the layout work. The catch is that the template is only as good as its fit — and it is rarely built for your board, your class, or your marks split. The moment you need a fifth section or a different marks total, you are back to editing the layout by hand, only now in someone else's document with their tables and their styles.",
      },

      { h: "A purpose-built maker" },
      {
        p: "The difference is that a question paper maker treats questions as questions rather than as formatting. You pick a type, type the content, and set the marks. The alignment, the answer space, the section totals and the print layout are handled.",
      },
      {
        ul: [
          "15+ ready question types — fill in the blanks, MCQ, match, true/false, short and long answer, comprehension, word problems, vertical maths",
          "A live A4 preview that is exactly what prints, so nothing surprises you at the photocopier",
          "One-click print-ready PDF",
          "Type in English letters and get Hindi, Marathi, Tamil, Telugu, Bengali and more in proper script — no keyboard to install",
          "Photograph a handwritten paper and get it back editable, instead of retyping it",
          "Saved papers stay editable, so next term starts from last term",
          "Works in a phone browser, which is where most teachers actually have a spare ten minutes",
        ],
      },

      { h: "What it costs" },
      {
        p: "You start free with 3 free papers on signup — enough to make and export your first papers without entering a card. After that you buy paper packs and spend only when you generate or scan, so a month where you set no papers costs nothing. Editing and re-exporting a paper you already made is free, which matters more than it sounds: most papers are a variation on a previous one.",
      },
      {
        p: "Compared with a typist, the per-paper cost is a fraction, and there is no waiting. Compared with Word, you are trading a small cost for the forty minutes per paper that layout normally eats.",
      },

      { h: "Which one suits you" },
      {
        ul: [
          "You set two or three papers a year, all in English, all plain text — Word is fine, stay with it",
          "You set papers monthly, or handle several sections — the time saved is the whole argument",
          "Your papers are in a regional language — this is the clearest case; typing in English letters and getting proper script removes the typist entirely",
          "Your papers are maths-heavy — vertical sums are where general tools break down worst",
          "You already write papers by hand and just want them printable — scan them; that is a two-minute job, not a two-day one",
        ],
      },

      { h: "Try it" },
      {
        p: "Sign up, make one paper, and export the PDF. No card is needed to test the workflow, and the free credits cover a full paper end to end. If you already have a handwritten paper on your desk, start by photographing that one — it is the fastest way to see whether the output matches what your school expects.",
      },
    ],
  },
  {
    slug: "exam-paper-in-word-vs-paper-maker",
    title: "Making Exam Papers in Word vs Using a Question Paper Maker",
    description:
      "Compare Microsoft Word with a dedicated question paper maker for school exams: speed, formatting, reuse, printing, and correction workload.",
    keywords: [
      "exam paper in word",
      "question paper maker vs word",
      "make exam paper in microsoft word",
      "school paper formatting tool",
    ],
    updated: "2026-06-30",
    published: "2026-06-30",
    readMins: 4,
    intro:
      "Word is the default tool because it is available. That does not mean it is the right tool for repeated exam-paper work.",
    category: "Formats & Templates",
    blocks: [
      { h: "Where Word works fine" },
      {
        ul: [
          "Plain text notices",
          "Very short tests",
          "Simple one-page worksheets",
        ],
      },
      { h: "Where Word starts costing time" },
      {
        ul: [
          "Aligning marks on every line",
          "Creating ruled answer space",
          "Formatting MCQ option columns",
          "Building textbook-style maths sums",
          "Reusing old papers without breaking formatting",
        ],
      },
      { h: "What a dedicated paper maker changes" },
      {
        ul: [
          "Question types become structured blocks",
          "The page preview matches the printed result",
          "Edits do not break the whole layout",
          "Templates are reusable across terms",
          "Export is a single step",
        ],
      },
      { h: "Which should a teacher choose" },
      {
        p: "If you create papers rarely, Word is acceptable. If you do this every month for multiple classes, a specialised builder saves enough time to justify the switch quickly.",
      },
    ],
  },
  {
    slug: "class-3-maths-question-paper",
    title: "Class 3 Maths Question Paper: Format, Topics and Template",
    description:
      "A ready format for a Class 3 Maths question paper — sections, topics, marks split, and a sample outline you can build and print in minutes.",
    keywords: [
      "class 3 maths question paper",
      "maths question paper for class 3",
      "class 3 maths exam paper",
      "grade 3 maths test paper",
    ],
    updated: "2026-06-30",
    published: "2026-06-26",
    readMins: 5,
    intro:
      "Setting a Class 3 Maths paper means balancing recall, computation, and simple word problems. Here is a clear format and topic split you can reuse each term.",
    category: "Classroom Examples",
    blocks: [
      { h: "Suggested marks split (40 marks)" },
      {
        ul: [
          "Fill in the blanks — 5 marks",
          "Multiple choice — 4 marks",
          "Match the following — 5 marks",
          "Vertical sums — 8 marks",
          "Word problems — 8 marks",
          "Short answers — 6 marks",
          "Data or table question — 4 marks",
        ],
      },
      { h: "Topics to cover" },
      {
        ul: [
          "Numbers up to 999",
          "Addition and subtraction with and without carrying or borrowing",
          "Multiplication tables and simple division",
          "Shapes, patterns, and measurement basics",
          "Money, time, and simple data handling",
        ],
      },
      { h: "Sample structure" },
      {
        ul: [
          "Q1 Number names and place value",
          "Q2 Even or odd, bigger or smaller, simple MCQ",
          "Q3 Vertical operation sums",
          "Q4 One-step word problems",
          "Q5 Shapes, time, money, or pictograph question",
        ],
      },
      { h: "Tips for a fair paper" },
      {
        ul: [
          "Start easy and build to harder word problems",
          "Lay vertical sums in a clean grid",
          "Give a working box for word problems",
          "Keep language simple and instructions short",
        ],
      },
      { h: "Build this template in minutes" },
      {
        p: "PaperGen has every type above — including textbook-style vertical maths and word-problem working boxes that are awkward to make in Word.",
      },
    ],
  },
  {
    slug: "class-1-english-question-paper",
    title: "Class 1 English Question Paper Format with Example Sections",
    description:
      "A simple Class 1 English question paper format with sample sections for alphabet, words, matching, and picture-based questions.",
    keywords: [
      "class 1 english question paper",
      "class 1 english paper format",
      "grade 1 english test paper",
      "english worksheet exam format class 1",
    ],
    updated: "2026-06-30",
    published: "2026-06-30",
    readMins: 4,
    intro:
      "A Class 1 English paper should feel familiar to early learners: short instructions, large spacing, and question types based on letters, words, pictures, and simple reading.",
    category: "Classroom Examples",
    blocks: [
      { h: "A simple 25-mark structure" },
      {
        ul: [
          "Alphabet or missing letters — 5 marks",
          "Match words with pictures — 5 marks",
          "Fill in the blanks with simple words — 5 marks",
          "Read and choose the correct answer — 5 marks",
          "One-word answers or oral-style prompts — 5 marks",
        ],
      },
      { h: "Question types that work well" },
      {
        ul: [
          "Circle the correct letter",
          "Join word to picture",
          "Write the missing letter",
          "Unscramble a simple word",
          "Choose the correct word from two options",
        ],
      },
      { h: "Formatting tips" },
      {
        ul: [
          "Use larger line spacing",
          "Avoid long written instructions",
          "Keep each question visually separate",
          "If using pictures, print them clearly in black and white too",
        ],
      },
      { h: "Why a structured builder helps" },
      {
        p: "Early-grade papers are easy to overcomplicate in Word. A builder helps by keeping sections consistent and answer space predictable.",
      },
    ],
  },
  {
    slug: "class-5-evs-question-paper",
    title: "Class 5 EVS Question Paper Format and Sample Blueprint",
    description:
      "A practical Class 5 EVS question paper format with marks split, topic mix, and sample question sections teachers can reuse.",
    keywords: [
      "class 5 evs question paper",
      "evs question paper format class 5",
      "grade 5 evs exam paper",
      "environmental studies paper template",
    ],
    updated: "2026-06-30",
    published: "2026-06-30",
    readMins: 5,
    intro:
      "EVS papers work best when they mix recall with observation and simple explanation. The paper should not become a wall of long answers.",
    category: "Classroom Examples",
    blocks: [
      { h: "A workable 40-mark EVS split" },
      {
        ul: [
          "Objective questions — 8 marks",
          "Match the following or classify — 6 marks",
          "Short answers — 10 marks",
          "Reasoning or explain-in-two-lines — 8 marks",
          "Applied question based on daily life, table, or picture — 8 marks",
        ],
      },
      { h: "Topic mix" },
      {
        ul: [
          "Food, shelter, and habits",
          "Plants and animals",
          "Water, air, and surroundings",
          "Community helpers and transport",
          "Health and cleanliness",
        ],
      },
      { h: "Question patterns that work" },
      {
        ul: [
          "Choose the correct answer",
          "Write true or false",
          "Name two uses",
          "Give one reason",
          "Observe the picture or table and answer",
        ],
      },
      { h: "Keep the paper balanced" },
      {
        p: "Avoid making the whole paper descriptive. Mix quick recall with short explanation so students can finish on time and you can mark efficiently.",
      },
    ],
  },
  {
    slug: "mcq-question-paper-maker",
    title: "Make an MCQ Question Paper in Minutes",
    description:
      "Create a neat multiple-choice question paper online — clean option layout, answer boxes, mixed with other question types, and a print-ready PDF.",
    keywords: [
      "mcq question paper maker",
      "multiple choice question paper",
      "mcq paper generator",
      "objective question paper format",
    ],
    updated: "2026-06-30",
    published: "2026-06-26",
    readMins: 3,
    intro:
      "Multiple-choice questions are quick to attempt and quick to mark, but laying them out neatly with aligned options is fiddly by hand. Here is the efficient approach.",
    category: "Question Types",
    blocks: [
      { h: "What a good MCQ layout needs" },
      {
        ul: [
          "The question stem on its own line",
          "Options labelled (a) to (d), evenly aligned",
          "A small box or bracket to mark the answer",
          "Consistent spacing from question to question",
        ],
      },
      { h: "The hard way" },
      {
        p: "Using tables and tabs for every question works, but it becomes slow and inconsistent after edits.",
      },
      { h: "The easy way" },
      {
        p: "Choose the MCQ type, enter the question and options, and let the builder handle the alignment, answer boxes, and spacing.",
      },
      { h: "Print or scan" },
      {
        p: "Download a clean A4 PDF in one click. If you already have an MCQ paper on paper, photograph it and convert it into an editable version first.",
      },
    ],
  },
  {
    slug: "fill-in-the-blanks-question-paper",
    title: "Fill in the Blanks Question Paper Format for School Tests",
    description:
      "A practical fill-in-the-blanks question paper format with spacing, marks, and examples teachers can use in English, EVS, and basic maths tests.",
    keywords: [
      "fill in the blanks question paper",
      "fill in the blanks format",
      "blank question template for teachers",
      "school worksheet fill blanks format",
    ],
    updated: "2026-06-30",
    published: "2026-06-30",
    readMins: 4,
    intro:
      "Fill in the blanks look simple, but bad spacing turns them messy fast. The format matters if you want a clean paper and readable student answers.",
    category: "Question Types",
    blocks: [
      { h: "What to get right" },
      {
        ul: [
          "Uniform blank length where possible",
          "Enough room for student handwriting",
          "One idea per sentence",
          "Marks grouped clearly if multiple blanks belong to one question",
        ],
      },
      { h: "When these questions work best" },
      {
        ul: [
          "Vocabulary revision",
          "Definitions with one missing term",
          "Maths facts and number names",
          "EVS keywords",
        ],
      },
      { h: "A good section layout" },
      {
        ul: [
          "Q1 Fill in the blanks — 5 × 1 = 5 marks",
          "List the sentences vertically",
          "Keep punctuation outside the blank",
          "Do not place two long blanks on one line unless space allows",
        ],
      },
      { h: "Common mistakes" },
      {
        ul: [
          "Blanks too short",
          "Too many blanks in one sentence",
          "No spacing between items",
          "Mixing fill-in-the-blanks with unrelated instruction styles in the same block",
        ],
      },
    ],
  },
  {
    slug: "worksheet-maker-for-teachers",
    title: "Worksheet Maker for Teachers: When a Question Paper Tool Also Helps",
    description:
      "Teachers often need worksheets and exam papers in the same format system. Here is how a question paper maker can double as a worksheet builder.",
    keywords: [
      "worksheet maker for teachers",
      "school worksheet maker",
      "teacher worksheet builder",
      "question paper and worksheet maker",
    ],
    updated: "2026-06-30",
    published: "2026-06-30",
    readMins: 4,
    intro:
      "Worksheets and question papers are close relatives. The same question types, answer lines, and print layout often apply to both.",
    category: "Question Types",
    blocks: [
      { h: "What overlaps between worksheets and papers" },
      {
        ul: [
          "Fill in the blanks",
          "MCQ and matching",
          "Short answers",
          "Picture-based prompts",
          "Simple maths layouts",
        ],
      },
      { h: "What changes in a worksheet" },
      {
        ul: [
          "Usually fewer instructions",
          "More guided practice and repetition",
          "Less emphasis on marks and duration",
          "Often one concept per page",
        ],
      },
      { h: "Why one tool for both is useful" },
      {
        p: "If your system already handles question types and print layout well, it can usually support worksheets with minor adjustments. That makes reuse easier across classwork, revision, and exams.",
      },
      { h: "A practical use case" },
      {
        p: "Create a worksheet first, then convert the strongest questions into the exam paper later. That gives you aligned practice and assessment material with less repeated formatting work.",
      },
    ],
  },
];

// Highest-intent guides. Surfaced on the home page and on the language landing
// pages so every article sits one click from a crawled entry point instead of
// only being reachable from the /guides hub.
const FEATURED_SLUGS = [
  "free-question-paper-maker",
  "question-paper-format",
  "scan-handwritten-paper-to-pdf",
  "exam-paper-format-for-teachers",
  "maths-question-paper-template",
  "worksheet-maker-for-teachers",
];

export const FEATURED_ARTICLES: Article[] = FEATURED_SLUGS.map(
  (slug) => ARTICLES.find((article) => article.slug === slug)!,
).filter(Boolean);

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}

export function getArticlesByCategory(category: Article["category"]): Article[] {
  return ARTICLES.filter((article) => article.category === category);
}
