import type { BoardId } from "./types";

// Chapters for Classes 9-12, where the textbook is prescribed.
//
// This is the one place the product leans on textbook chapters, and it is
// justified: NCERT is mandated for CBSE and Balbharati for Maharashtra at these
// classes, so a chapter name is finally a stable index rather than a publisher's
// invention. Below Class 9 the skill graph does this job instead.
//
// NCERT rationalised its syllabus in 2023 and chapters were dropped and
// renumbered. These lists are a starting point, not gospel — a teacher can add
// or remove chapters for her class, and the bank is keyed on the chapter STRING
// so an edit costs nothing.

export interface ChapterSet {
  board: BoardId;
  class: number;
  subject: string;
  /** Textbook these chapters come from, shown to the teacher for confidence. */
  book: string;
  chapters: string[];
}

export const CHAPTERS: ChapterSet[] = [
  {
    board: "cbse", class: 9, subject: "maths", book: "NCERT Mathematics",
    chapters: [
      "Number Systems",
      "Polynomials",
      "Coordinate Geometry",
      "Linear Equations in Two Variables",
      "Introduction to Euclid's Geometry",
      "Lines and Angles",
      "Triangles",
      "Quadrilaterals",
      "Circles",
      "Heron's Formula",
      "Surface Areas and Volumes",
      "Statistics",
    ],
  },
  {
    board: "cbse", class: 10, subject: "maths", book: "NCERT Mathematics",
    chapters: [
      "Real Numbers",
      "Polynomials",
      "Pair of Linear Equations in Two Variables",
      "Quadratic Equations",
      "Arithmetic Progressions",
      "Triangles",
      "Coordinate Geometry",
      "Introduction to Trigonometry",
      "Some Applications of Trigonometry",
      "Circles",
      "Areas Related to Circles",
      "Surface Areas and Volumes",
      "Statistics",
      "Probability",
    ],
  },
  {
    board: "cbse", class: 11, subject: "maths", book: "NCERT Mathematics",
    chapters: [
      "Sets",
      "Relations and Functions",
      "Trigonometric Functions",
      "Complex Numbers and Quadratic Equations",
      "Linear Inequalities",
      "Permutations and Combinations",
      "Binomial Theorem",
      "Sequences and Series",
      "Straight Lines",
      "Conic Sections",
      "Introduction to Three Dimensional Geometry",
      "Limits and Derivatives",
      "Statistics",
      "Probability",
    ],
  },
  {
    board: "cbse", class: 12, subject: "maths", book: "NCERT Mathematics",
    chapters: [
      "Relations and Functions",
      "Inverse Trigonometric Functions",
      "Matrices",
      "Determinants",
      "Continuity and Differentiability",
      "Application of Derivatives",
      "Integrals",
      "Application of Integrals",
      "Differential Equations",
      "Vector Algebra",
      "Three Dimensional Geometry",
      "Linear Programming",
      "Probability",
    ],
  },
  {
    board: "cbse", class: 9, subject: "science", book: "NCERT Science",
    chapters: [
      "Matter in Our Surroundings",
      "Is Matter Around Us Pure",
      "Atoms and Molecules",
      "Structure of the Atom",
      "The Fundamental Unit of Life",
      "Tissues",
      "Motion",
      "Force and Laws of Motion",
      "Gravitation",
      "Work and Energy",
      "Sound",
      "Improvement in Food Resources",
    ],
  },
  {
    board: "cbse", class: 10, subject: "science", book: "NCERT Science",
    chapters: [
      "Chemical Reactions and Equations",
      "Acids, Bases and Salts",
      "Metals and Non-metals",
      "Carbon and its Compounds",
      "Life Processes",
      "Control and Coordination",
      "How do Organisms Reproduce",
      "Heredity",
      "Light - Reflection and Refraction",
      "The Human Eye and the Colourful World",
      "Electricity",
      "Magnetic Effects of Electric Current",
      "Our Environment",
    ],
  },
  {
    board: "maharashtra", class: 9, subject: "maths", book: "Balbharati Mathematics Part 1 & 2",
    chapters: [
      "Sets",
      "Real Numbers",
      "Polynomials",
      "Ratio and Proportion",
      "Linear Equations in Two Variables",
      "Financial Planning",
      "Statistics",
      "Basic Concepts in Geometry",
      "Parallel Lines",
      "Triangles",
      "Quadrilaterals",
      "Circle",
      "Coordinate Geometry",
      "Trigonometry",
      "Surface Area and Volume",
    ],
  },
  {
    board: "maharashtra", class: 10, subject: "maths", book: "Balbharati Mathematics Part 1 & 2",
    chapters: [
      "Linear Equations in Two Variables",
      "Quadratic Equations",
      "Arithmetic Progression",
      "Financial Planning",
      "Probability",
      "Statistics",
      "Similarity",
      "Pythagoras Theorem",
      "Circle",
      "Geometric Constructions",
      "Coordinate Geometry",
      "Trigonometry",
      "Mensuration",
    ],
  },
  {
    board: "maharashtra", class: 9, subject: "science", book: "Balbharati Science and Technology",
    chapters: [
      "Laws of Motion",
      "Work and Energy",
      "Current Electricity",
      "Measurement of Matter",
      "Acids, Bases and Salts",
      "Classification of Plants",
      "Energy Flow in an Ecosystem",
      "Useful and Harmful Microbes",
      "Environmental Management",
      "Information Communication Technology",
      "Reflection of Light",
      "Study of Sound",
      "Carbon: An Important Element",
      "Substances in Common Use",
      "Life Processes in Living Organisms",
      "Heredity and Variation",
    ],
  },
  {
    board: "maharashtra", class: 10, subject: "science", book: "Balbharati Science and Technology Part 1 & 2",
    chapters: [
      "Gravitation",
      "Periodic Classification of Elements",
      "Chemical Reactions and Equations",
      "Effects of Electric Current",
      "Heat",
      "Refraction of Light",
      "Lenses",
      "Metallurgy",
      "Carbon Compounds",
      "Space Missions",
      "Life Processes in Living Organisms",
      "Heredity and Evolution",
      "Introduction to Microbiology",
      "Cell Biology and Biotechnology",
      "Social Health",
      "Disaster Management",
    ],
  },
];

/** Classes served by the chapter-anchored bank rather than the skill graph. */
export const BANK_CLASSES = [9, 10, 11, 12];

export function chaptersFor(
  board: BoardId,
  cls: number,
  subject: string
): string[] {
  return (
    CHAPTERS.find(
      (c) => c.board === board && c.class === cls && c.subject === subject
    )?.chapters ?? []
  );
}

export function bookFor(
  board: BoardId,
  cls: number,
  subject: string
): string | null {
  return (
    CHAPTERS.find(
      (c) => c.board === board && c.class === cls && c.subject === subject
    )?.book ?? null
  );
}

/** Every (board, class, subject) the bank knows chapters for. */
export const CHAPTER_SETS = CHAPTERS.map((c) => ({
  board: c.board,
  class: c.class,
  subject: c.subject,
  book: c.book,
  count: c.chapters.length,
}));
