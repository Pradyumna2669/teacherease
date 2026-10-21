import type { Concept, Skill, StrandId } from "./types";

// The skill graph for school maths, Classes 1-8.
//
// Deliberately board-neutral: nothing here says CBSE or Maharashtra, because
// "multiply a 2-digit number by a 1-digit number" is the same skill in both.
// boards.ts decides which board teaches what, and when.
//
// `typicalClass` calibrates difficulty. It does NOT filter — a Class 5 teacher
// revising Class 3 skills is doing something completely normal.

export const STRAND_LABELS: Record<StrandId, string> = {
  number: "Numbers and place value",
  addsub: "Addition and subtraction",
  muldiv: "Multiplication and division",
  fraction: "Fractions",
  measure: "Measurement",
  money: "Money",
  time: "Time",
  geometry: "Shapes and geometry",
  data: "Data handling",
  pattern: "Patterns",
  algebra: "Algebra",
  ratio: "Ratio, percentage and proportion",
};

export const CONCEPTS: Concept[] = [
  { id: "place-value", strand: "number", label: "Place value" },
  { id: "compare-order", strand: "number", label: "Comparing and ordering numbers" },
  { id: "rounding", strand: "number", label: "Rounding and estimation" },
  { id: "addition", strand: "addsub", label: "Addition" },
  { id: "subtraction", strand: "addsub", label: "Subtraction" },
  { id: "addsub-word", strand: "addsub", label: "Addition and subtraction word problems" },
  { id: "tables", strand: "muldiv", label: "Multiplication tables" },
  { id: "multiplication", strand: "muldiv", label: "Multiplication" },
  { id: "division", strand: "muldiv", label: "Division" },
  { id: "factors-multiples", strand: "muldiv", label: "Factors and multiples" },
  { id: "muldiv-word", strand: "muldiv", label: "Multiplication and division word problems" },
  { id: "fraction-basics", strand: "fraction", label: "Understanding fractions" },
  { id: "fraction-ops", strand: "fraction", label: "Adding and subtracting fractions" },
  { id: "decimals", strand: "fraction", label: "Decimals" },
  { id: "length", strand: "measure", label: "Length" },
  { id: "weight-capacity", strand: "measure", label: "Weight and capacity" },
  { id: "perimeter-area", strand: "measure", label: "Perimeter and area" },
  { id: "money-basics", strand: "money", label: "Money" },
  { id: "time-read", strand: "time", label: "Reading time" },
  { id: "calendar", strand: "time", label: "Calendar" },
  { id: "shapes-2d", strand: "geometry", label: "2D shapes" },
  { id: "shapes-3d", strand: "geometry", label: "3D shapes" },
  { id: "symmetry", strand: "geometry", label: "Symmetry" },
  { id: "pictograph", strand: "data", label: "Pictographs and tables" },
  { id: "bar-graph", strand: "data", label: "Bar graphs" },
  { id: "patterns", strand: "pattern", label: "Patterns" },
  { id: "counting", strand: "number", label: "Counting and number names" },
  { id: "integers", strand: "number", label: "Integers" },
  { id: "rational", strand: "number", label: "Rational numbers" },
  { id: "exponents", strand: "number", label: "Exponents and powers" },
  { id: "squares-cubes", strand: "number", label: "Squares, cubes and roots" },
  { id: "ratio-proportion", strand: "ratio", label: "Ratio and proportion" },
  { id: "percentage", strand: "ratio", label: "Percentage" },
  { id: "profit-loss", strand: "ratio", label: "Profit, loss and simple interest" },
  { id: "proportionality", strand: "ratio", label: "Direct and inverse proportion" },
  { id: "expressions", strand: "algebra", label: "Algebraic expressions" },
  { id: "linear-equations", strand: "algebra", label: "Linear equations" },
  { id: "factorisation", strand: "algebra", label: "Factorisation" },
  { id: "lines-angles", strand: "geometry", label: "Lines and angles" },
  { id: "triangles", strand: "geometry", label: "Triangles" },
  { id: "quadrilaterals", strand: "geometry", label: "Quadrilaterals" },
  { id: "circles", strand: "geometry", label: "Circles" },
  { id: "mensuration", strand: "measure", label: "Area, surface area and volume" },
  { id: "averages", strand: "data", label: "Mean, median and mode" },
  { id: "pie-chart", strand: "data", label: "Pie charts" },
  { id: "probability", strand: "data", label: "Chance and probability" },
];

// Shorthand so the table below stays readable. Anything omitted is baseline 1/0.
const L = (
  steps: 1 | 2 | 3,
  regrouping: 0 | 1 | 2 = 0,
  magnitude: 1 | 2 | 3 = 1,
  reading: 1 | 2 | 3 = 1,
  transfer: 1 | 2 | 3 = 1
) => ({ steps, regrouping, magnitude, reading, transfer, distractors: 0 as const });

export const SKILLS: Skill[] = [
  // ---- Numbers and place value ------------------------------------------
  { id: "NUM.PV.3D", concept: "place-value", typicalClass: 3, baseline: L(1),
    statement: "Read, write and expand 3-digit numbers" },
  { id: "NUM.PV.4D", concept: "place-value", typicalClass: 4, requires: ["NUM.PV.3D"], baseline: L(1),
    statement: "Read, write and expand 4-digit numbers" },
  { id: "NUM.PV.5D", concept: "place-value", typicalClass: 5, requires: ["NUM.PV.4D"], baseline: L(1, 0, 2),
    statement: "Read, write and expand 5- and 6-digit numbers" },
  { id: "NUM.CMP.3D", concept: "compare-order", typicalClass: 3, requires: ["NUM.PV.3D"], baseline: L(1),
    statement: "Compare and order 3-digit numbers" },
  { id: "NUM.CMP.4D", concept: "compare-order", typicalClass: 4, requires: ["NUM.PV.4D"], baseline: L(1),
    statement: "Compare and order 4-digit numbers" },
  { id: "NUM.ROUND.10.100", concept: "rounding", typicalClass: 4, requires: ["NUM.PV.3D"], baseline: L(1),
    statement: "Round numbers to the nearest 10 and 100" },
  { id: "NUM.ODD.EVEN", concept: "place-value", typicalClass: 3, baseline: L(1),
    statement: "Identify odd and even numbers" },

  // ---- Addition ----------------------------------------------------------
  { id: "ADD.2D2D.NOREG", concept: "addition", typicalClass: 3, baseline: L(1),
    statement: "Add two 2-digit numbers without regrouping" },
  { id: "ADD.3D3D.REG", concept: "addition", typicalClass: 3, requires: ["NUM.PV.3D", "ADD.2D2D.NOREG"], baseline: L(1, 1),
    statement: "Add two 3-digit numbers with regrouping" },
  { id: "ADD.4D4D.REG", concept: "addition", typicalClass: 4, requires: ["ADD.3D3D.REG", "NUM.PV.4D"], baseline: L(1, 2),
    statement: "Add two 4-digit numbers with regrouping" },
  { id: "ADD.THREE.ADDENDS", concept: "addition", typicalClass: 4, requires: ["ADD.3D3D.REG"], baseline: L(2, 1),
    statement: "Add three numbers together" },

  // ---- Subtraction -------------------------------------------------------
  { id: "SUB.2D2D.NOBOR", concept: "subtraction", typicalClass: 3, baseline: L(1),
    statement: "Subtract 2-digit numbers without borrowing" },
  { id: "SUB.3D3D.BOR", concept: "subtraction", typicalClass: 3, requires: ["NUM.PV.3D", "SUB.2D2D.NOBOR"], baseline: L(1, 1),
    statement: "Subtract 3-digit numbers with borrowing" },
  { id: "SUB.4D4D.BOR", concept: "subtraction", typicalClass: 4, requires: ["SUB.3D3D.BOR", "NUM.PV.4D"], baseline: L(1, 2),
    statement: "Subtract 4-digit numbers with borrowing" },
  { id: "ADDSUB.WORD.1STEP", concept: "addsub-word", typicalClass: 3, requires: ["ADD.3D3D.REG", "SUB.3D3D.BOR"], baseline: L(1, 1, 1, 2, 2),
    statement: "Solve one-step word problems using addition or subtraction" },
  { id: "ADDSUB.WORD.2STEP", concept: "addsub-word", typicalClass: 4, requires: ["ADDSUB.WORD.1STEP"], baseline: L(2, 1, 1, 2, 2),
    statement: "Solve two-step word problems using addition and subtraction" },

  // ---- Tables and multiplication ----------------------------------------
  { id: "MUL.TABLES.2-10", concept: "tables", typicalClass: 3, baseline: L(1),
    statement: "Recall multiplication tables from 2 to 10" },
  { id: "MUL.TABLES.11-20", concept: "tables", typicalClass: 5, requires: ["MUL.TABLES.2-10"], baseline: L(1, 0, 2),
    statement: "Recall multiplication tables from 11 to 20" },
  { id: "MUL.REPEATED.ADD", concept: "multiplication", typicalClass: 3, baseline: L(1),
    statement: "Understand multiplication as repeated addition" },
  { id: "MUL.2D1D.NOREG", concept: "multiplication", typicalClass: 3, requires: ["MUL.TABLES.2-10"], baseline: L(1),
    statement: "Multiply a 2-digit number by a 1-digit number without regrouping" },
  { id: "MUL.2D1D.REG", concept: "multiplication", typicalClass: 3, requires: ["MUL.2D1D.NOREG"], baseline: L(1, 1),
    statement: "Multiply a 2-digit number by a 1-digit number with regrouping" },
  { id: "MUL.3D1D.REG", concept: "multiplication", typicalClass: 4, requires: ["MUL.2D1D.REG"], baseline: L(1, 2),
    statement: "Multiply a 3-digit number by a 1-digit number with regrouping" },
  { id: "MUL.2D2D", concept: "multiplication", typicalClass: 4, requires: ["MUL.2D1D.REG"], baseline: L(2, 2),
    statement: "Multiply a 2-digit number by a 2-digit number" },
  { id: "MUL.3D2D", concept: "multiplication", typicalClass: 5, requires: ["MUL.2D2D"], baseline: L(2, 2, 2),
    statement: "Multiply a 3-digit number by a 2-digit number" },

  // ---- Division ----------------------------------------------------------
  { id: "DIV.SHARING", concept: "division", typicalClass: 3, requires: ["MUL.TABLES.2-10"], baseline: L(1),
    statement: "Understand division as equal sharing and grouping" },
  { id: "DIV.2D1D.NOREM", concept: "division", typicalClass: 3, requires: ["DIV.SHARING"], baseline: L(1),
    statement: "Divide a 2-digit number by a 1-digit number with no remainder" },
  { id: "DIV.2D1D.REM", concept: "division", typicalClass: 4, requires: ["DIV.2D1D.NOREM"], baseline: L(1, 1),
    statement: "Divide a 2-digit number by a 1-digit number with a remainder" },
  { id: "DIV.3D1D.REM", concept: "division", typicalClass: 4, requires: ["DIV.2D1D.REM"], baseline: L(2, 1),
    statement: "Divide a 3-digit number by a 1-digit number with a remainder" },
  { id: "DIV.3D2D", concept: "division", typicalClass: 5, requires: ["DIV.3D1D.REM", "MUL.2D2D"], baseline: L(2, 2, 2),
    statement: "Divide a 3-digit number by a 2-digit number" },
  { id: "MULDIV.WORD.1STEP", concept: "muldiv-word", typicalClass: 3, requires: ["MUL.2D1D.REG", "DIV.2D1D.NOREM"], baseline: L(1, 1, 1, 2, 2),
    statement: "Solve one-step word problems using multiplication or division" },
  { id: "MULDIV.WORD.2STEP", concept: "muldiv-word", typicalClass: 5, requires: ["MULDIV.WORD.1STEP"], baseline: L(2, 1, 1, 3, 2),
    statement: "Solve two-step word problems mixing multiplication and division" },

  // ---- Factors and multiples --------------------------------------------
  { id: "FAC.MULTIPLES", concept: "factors-multiples", typicalClass: 4, requires: ["MUL.TABLES.2-10"], baseline: L(1),
    statement: "List multiples of a number" },
  { id: "FAC.FACTORS", concept: "factors-multiples", typicalClass: 4, requires: ["DIV.2D1D.NOREM"], baseline: L(1),
    statement: "Find all factors of a number" },
  { id: "FAC.HCF.LCM", concept: "factors-multiples", typicalClass: 5, requires: ["FAC.FACTORS", "FAC.MULTIPLES"], baseline: L(2, 0, 2),
    statement: "Find the HCF and LCM of two numbers" },

  // ---- Fractions ---------------------------------------------------------
  { id: "FRA.PART.WHOLE", concept: "fraction-basics", typicalClass: 3, baseline: L(1),
    statement: "Identify a fraction as part of a whole" },
  { id: "FRA.WRITE", concept: "fraction-basics", typicalClass: 3, requires: ["FRA.PART.WHOLE"], baseline: L(1),
    statement: "Read and write fractions in numerator-denominator form" },
  { id: "FRA.EQUIV", concept: "fraction-basics", typicalClass: 4, requires: ["FRA.WRITE", "MUL.TABLES.2-10"], baseline: L(1, 0, 2),
    statement: "Identify equivalent fractions" },
  { id: "FRA.COMPARE", concept: "fraction-basics", typicalClass: 4, requires: ["FRA.WRITE"], baseline: L(1),
    statement: "Compare fractions with the same denominator" },
  { id: "FRA.ADD.SAME", concept: "fraction-ops", typicalClass: 4, requires: ["FRA.WRITE"], baseline: L(1),
    statement: "Add fractions with the same denominator" },
  { id: "FRA.SUB.SAME", concept: "fraction-ops", typicalClass: 4, requires: ["FRA.WRITE"], baseline: L(1),
    statement: "Subtract fractions with the same denominator" },
  { id: "FRA.ADD.DIFF", concept: "fraction-ops", typicalClass: 5, requires: ["FRA.ADD.SAME", "FAC.HCF.LCM"], baseline: L(2, 0, 2),
    statement: "Add fractions with different denominators" },
  { id: "DEC.TENTHS", concept: "decimals", typicalClass: 5, requires: ["FRA.WRITE", "NUM.PV.4D"], baseline: L(1),
    statement: "Read and write decimals to one decimal place" },
  { id: "DEC.ADD.SUB", concept: "decimals", typicalClass: 5, requires: ["DEC.TENTHS", "ADD.3D3D.REG"], baseline: L(1, 1, 2),
    statement: "Add and subtract decimals to two decimal places" },

  // ---- Measurement -------------------------------------------------------
  { id: "LEN.UNITS", concept: "length", typicalClass: 3, baseline: L(1),
    statement: "Use centimetres and metres to measure length" },
  { id: "LEN.CONVERT", concept: "length", typicalClass: 4, requires: ["LEN.UNITS", "MUL.TABLES.2-10"], baseline: L(1, 0, 2),
    statement: "Convert between centimetres, metres and kilometres" },
  { id: "WGT.UNITS", concept: "weight-capacity", typicalClass: 3, baseline: L(1),
    statement: "Use grams and kilograms to measure weight" },
  { id: "WGT.CONVERT", concept: "weight-capacity", typicalClass: 4, requires: ["WGT.UNITS"], baseline: L(1, 0, 2),
    statement: "Convert between grams and kilograms" },
  { id: "CAP.UNITS", concept: "weight-capacity", typicalClass: 4, baseline: L(1),
    statement: "Use millilitres and litres to measure capacity" },
  { id: "PER.RECTANGLE", concept: "perimeter-area", typicalClass: 4, requires: ["ADD.3D3D.REG", "SHP.2D.SIDES"], baseline: L(2),
    statement: "Find the perimeter of a rectangle and a square" },
  { id: "ARE.RECTANGLE", concept: "perimeter-area", typicalClass: 5, requires: ["MUL.2D2D", "PER.RECTANGLE"], baseline: L(2, 1),
    statement: "Find the area of a rectangle and a square" },

  // ---- Money -------------------------------------------------------------
  { id: "MON.NOTES.COINS", concept: "money-basics", typicalClass: 3, baseline: L(1),
    statement: "Recognise notes and coins and make up an amount" },
  { id: "MON.ADD.SUB", concept: "money-basics", typicalClass: 3, requires: ["ADD.3D3D.REG", "MON.NOTES.COINS"], baseline: L(1, 1, 1, 2, 2),
    statement: "Add and subtract amounts of money in rupees" },
  { id: "MON.BILL", concept: "money-basics", typicalClass: 4, requires: ["MON.ADD.SUB", "MUL.2D1D.REG"], baseline: L(2, 1, 1, 3, 2),
    statement: "Work out a shopping bill and the change due" },

  // ---- Time --------------------------------------------------------------
  { id: "TIM.HOUR.HALF", concept: "time-read", typicalClass: 3, baseline: L(1),
    statement: "Read a clock to the hour and half hour" },
  { id: "TIM.FIVE.MIN", concept: "time-read", typicalClass: 3, requires: ["TIM.HOUR.HALF", "MUL.TABLES.2-10"], baseline: L(1),
    statement: "Read a clock to the nearest five minutes" },
  { id: "TIM.AM.PM", concept: "time-read", typicalClass: 4, requires: ["TIM.FIVE.MIN"], baseline: L(1),
    statement: "Use a.m. and p.m. and the 24-hour clock" },
  { id: "TIM.DURATION", concept: "time-read", typicalClass: 4, requires: ["TIM.AM.PM"], baseline: L(2, 0, 1, 2, 2),
    statement: "Work out how long something lasted" },
  { id: "CAL.MONTHS.DAYS", concept: "calendar", typicalClass: 3, baseline: L(1),
    statement: "Name the months and the number of days in each" },
  { id: "CAL.READ", concept: "calendar", typicalClass: 4, requires: ["CAL.MONTHS.DAYS"], baseline: L(1, 0, 1, 2),
    statement: "Read a calendar to answer questions about dates" },

  // ---- Geometry ----------------------------------------------------------
  { id: "SHP.2D.NAME", concept: "shapes-2d", typicalClass: 3, baseline: L(1),
    statement: "Name common 2D shapes" },
  { id: "SHP.2D.SIDES", concept: "shapes-2d", typicalClass: 3, requires: ["SHP.2D.NAME"], baseline: L(1),
    statement: "Count sides and corners of 2D shapes" },
  { id: "SHP.3D.NAME", concept: "shapes-3d", typicalClass: 4, requires: ["SHP.2D.NAME"], baseline: L(1),
    statement: "Name common 3D shapes and their faces, edges and vertices" },
  { id: "SHP.ANGLES", concept: "shapes-2d", typicalClass: 5, requires: ["SHP.2D.SIDES"], baseline: L(1),
    statement: "Identify right, acute and obtuse angles" },
  { id: "SYM.LINES", concept: "symmetry", typicalClass: 4, requires: ["SHP.2D.NAME"], baseline: L(1),
    statement: "Find lines of symmetry in a shape" },

  // ---- Data --------------------------------------------------------------
  { id: "DAT.PICTOGRAPH", concept: "pictograph", typicalClass: 3, requires: ["MUL.TABLES.2-10"], baseline: L(1, 0, 1, 2),
    statement: "Read a pictograph and answer questions about it" },
  { id: "DAT.TALLY", concept: "pictograph", typicalClass: 3, baseline: L(1),
    statement: "Record and read tally marks" },
  { id: "DAT.BAR.READ", concept: "bar-graph", typicalClass: 4, requires: ["DAT.PICTOGRAPH"], baseline: L(1, 0, 1, 2),
    statement: "Read a bar graph and answer questions about it" },
  { id: "DAT.BAR.DRAW", concept: "bar-graph", typicalClass: 5, requires: ["DAT.BAR.READ"], baseline: L(2, 0, 1, 2),
    statement: "Draw a bar graph from a table of data" },

  // ---- Patterns ----------------------------------------------------------
  { id: "PAT.NUMBER", concept: "patterns", typicalClass: 3, baseline: L(1),
    statement: "Continue a number pattern" },
  { id: "PAT.SHAPE", concept: "patterns", typicalClass: 3, baseline: L(1),
    statement: "Continue a shape pattern" },
  { id: "PAT.RULE", concept: "patterns", typicalClass: 5, requires: ["PAT.NUMBER"], baseline: L(2, 0, 2),
    statement: "Work out the rule behind a number pattern" },

  // ================= Classes 1-2 =========================================
  { id: "NUM.COUNT.20", concept: "counting", typicalClass: 1, baseline: L(1),
    statement: "Count, read and write numbers up to 20" },
  { id: "NUM.COUNT.100", concept: "counting", typicalClass: 2, requires: ["NUM.COUNT.20"], baseline: L(1),
    statement: "Count, read and write numbers up to 100" },
  { id: "NUM.BEFORE.AFTER", concept: "counting", typicalClass: 1, requires: ["NUM.COUNT.20"], baseline: L(1),
    statement: "Say which number comes before, after and between" },
  { id: "NUM.PV.2D", concept: "place-value", typicalClass: 2, requires: ["NUM.COUNT.100"], baseline: L(1),
    statement: "Split a 2-digit number into tens and ones" },
  { id: "ADD.WITHIN.20", concept: "addition", typicalClass: 1, requires: ["NUM.COUNT.20"], baseline: L(1),
    statement: "Add two numbers within 20" },
  { id: "SUB.WITHIN.20", concept: "subtraction", typicalClass: 1, requires: ["NUM.COUNT.20"], baseline: L(1),
    statement: "Subtract two numbers within 20" },
  { id: "ADD.2D1D.NOREG", concept: "addition", typicalClass: 2, requires: ["NUM.PV.2D", "ADD.WITHIN.20"], baseline: L(1),
    statement: "Add a 2-digit and a 1-digit number without regrouping" },
  { id: "SUB.2D1D.NOBOR", concept: "subtraction", typicalClass: 2, requires: ["NUM.PV.2D", "SUB.WITHIN.20"], baseline: L(1),
    statement: "Subtract a 1-digit number from a 2-digit number without borrowing" },
  { id: "SHP.2D.BASIC", concept: "shapes-2d", typicalClass: 1, baseline: L(1),
    statement: "Recognise circles, squares, triangles and rectangles" },
  { id: "MON.COINS.BASIC", concept: "money-basics", typicalClass: 2, requires: ["NUM.COUNT.100"], baseline: L(1),
    statement: "Recognise coins and notes up to 100 rupees" },
  { id: "TIM.CLOCK.HOUR", concept: "time-read", typicalClass: 2, baseline: L(1),
    statement: "Read a clock to the full hour" },
  { id: "PAT.SIMPLE", concept: "patterns", typicalClass: 1, baseline: L(1),
    statement: "Continue a simple repeating pattern" },

  // ================= Classes 6-8 =========================================
  { id: "INT.ADD.SUB", concept: "integers", typicalClass: 6, requires: ["ADD.4D4D.REG", "SUB.4D4D.BOR"], baseline: L(1, 1, 2),
    statement: "Add and subtract integers, including negatives" },
  { id: "INT.MUL.DIV", concept: "integers", typicalClass: 7, requires: ["INT.ADD.SUB", "MUL.2D2D"], baseline: L(1, 1, 2),
    statement: "Multiply and divide integers, including negatives" },
  { id: "RATN.COMPARE", concept: "rational", typicalClass: 7, requires: ["FRA.EQUIV", "INT.ADD.SUB"], baseline: L(2, 0, 2),
    statement: "Compare and order rational numbers" },
  { id: "RATN.OPS", concept: "rational", typicalClass: 8, requires: ["RATN.COMPARE", "FRA.ADD.DIFF"], baseline: L(2, 1, 2),
    statement: "Add, subtract, multiply and divide rational numbers" },
  { id: "EXP.LAWS", concept: "exponents", typicalClass: 7, requires: ["MUL.TABLES.11-20"], baseline: L(2, 0, 2),
    statement: "Use the laws of exponents with whole-number powers" },
  { id: "SQR.SQUARE.ROOT", concept: "squares-cubes", typicalClass: 8, requires: ["EXP.LAWS", "FAC.FACTORS"], baseline: L(2, 0, 2),
    statement: "Find squares and square roots of numbers" },
  { id: "CUB.CUBE.ROOT", concept: "squares-cubes", typicalClass: 8, requires: ["SQR.SQUARE.ROOT"], baseline: L(2, 0, 2),
    statement: "Find cubes and cube roots of numbers" },
  { id: "DEC.MUL.DIV", concept: "decimals", typicalClass: 6, requires: ["DEC.ADD.SUB", "MUL.2D2D"], baseline: L(2, 1, 2),
    statement: "Multiply and divide decimals" },
  { id: "FRA.MUL.DIV", concept: "fraction-ops", typicalClass: 7, requires: ["FRA.ADD.DIFF"], baseline: L(2, 0, 2),
    statement: "Multiply and divide fractions" },

  { id: "RTO.SIMPLIFY", concept: "ratio-proportion", typicalClass: 6, requires: ["FAC.HCF.LCM"], baseline: L(1, 0, 2),
    statement: "Write and simplify a ratio" },
  { id: "RTO.PROPORTION", concept: "ratio-proportion", typicalClass: 6, requires: ["RTO.SIMPLIFY"], baseline: L(2, 0, 2),
    statement: "Solve problems using proportion and the unitary method" },
  { id: "PCT.CONVERT", concept: "percentage", typicalClass: 6, requires: ["FRA.EQUIV", "DEC.TENTHS"], baseline: L(1, 0, 2),
    statement: "Convert between fractions, decimals and percentages" },
  { id: "PCT.OF.QUANTITY", concept: "percentage", typicalClass: 7, requires: ["PCT.CONVERT"], baseline: L(2, 0, 2, 2, 2),
    statement: "Find a percentage of a quantity" },
  { id: "PCT.CHANGE", concept: "percentage", typicalClass: 8, requires: ["PCT.OF.QUANTITY"], baseline: L(2, 1, 2, 2, 2),
    statement: "Find a percentage increase or decrease" },
  { id: "PL.PROFIT.LOSS", concept: "profit-loss", typicalClass: 7, requires: ["PCT.OF.QUANTITY"], baseline: L(2, 1, 2, 3, 2),
    statement: "Find profit, loss and their percentages" },
  { id: "PL.SIMPLE.INTEREST", concept: "profit-loss", typicalClass: 7, requires: ["PCT.OF.QUANTITY"], baseline: L(2, 0, 2, 3, 2),
    statement: "Find simple interest using the formula" },
  { id: "PRO.DIRECT.INVERSE", concept: "proportionality", typicalClass: 8, requires: ["RTO.PROPORTION"], baseline: L(2, 0, 2, 3, 2),
    statement: "Solve direct and inverse proportion problems" },

  { id: "ALG.TERMS", concept: "expressions", typicalClass: 6, requires: ["MUL.TABLES.2-10"], baseline: L(1, 0, 2),
    statement: "Identify terms, coefficients and like terms in an expression" },
  { id: "ALG.SIMPLIFY", concept: "expressions", typicalClass: 7, requires: ["ALG.TERMS", "INT.ADD.SUB"], baseline: L(2, 0, 2),
    statement: "Add and subtract algebraic expressions" },
  { id: "ALG.MULTIPLY", concept: "expressions", typicalClass: 8, requires: ["ALG.SIMPLIFY", "EXP.LAWS"], baseline: L(2, 1, 2),
    statement: "Multiply algebraic expressions" },
  { id: "ALG.IDENTITIES", concept: "expressions", typicalClass: 8, requires: ["ALG.MULTIPLY"], baseline: L(2, 1, 2),
    statement: "Use the standard algebraic identities" },
  { id: "EQN.ONE.STEP", concept: "linear-equations", typicalClass: 6, requires: ["ALG.TERMS"], baseline: L(1, 0, 2),
    statement: "Solve a one-step linear equation in one variable" },
  { id: "EQN.TWO.STEP", concept: "linear-equations", typicalClass: 7, requires: ["EQN.ONE.STEP", "INT.ADD.SUB"], baseline: L(2, 0, 2),
    statement: "Solve a two-step linear equation in one variable" },
  { id: "EQN.BOTH.SIDES", concept: "linear-equations", typicalClass: 8, requires: ["EQN.TWO.STEP"], baseline: L(2, 1, 2),
    statement: "Solve a linear equation with the variable on both sides" },
  { id: "EQN.WORD", concept: "linear-equations", typicalClass: 8, requires: ["EQN.BOTH.SIDES"], baseline: L(3, 1, 2, 3, 3),
    statement: "Form and solve a linear equation from a word problem" },
  { id: "FCT.COMMON", concept: "factorisation", typicalClass: 8, requires: ["ALG.MULTIPLY", "FAC.FACTORS"], baseline: L(2, 0, 2),
    statement: "Factorise an expression by taking out common factors" },
  { id: "FCT.IDENTITIES", concept: "factorisation", typicalClass: 8, requires: ["FCT.COMMON", "ALG.IDENTITIES"], baseline: L(2, 1, 2),
    statement: "Factorise using the standard identities" },

  { id: "GEO.ANGLE.TYPES", concept: "lines-angles", typicalClass: 6, requires: ["SHP.ANGLES"], baseline: L(1, 0, 2),
    statement: "Name and measure acute, right, obtuse and reflex angles" },
  { id: "GEO.ANGLE.PAIRS", concept: "lines-angles", typicalClass: 7, requires: ["GEO.ANGLE.TYPES"], baseline: L(2, 0, 2),
    statement: "Use complementary, supplementary and vertically opposite angles" },
  { id: "GEO.PARALLEL", concept: "lines-angles", typicalClass: 7, requires: ["GEO.ANGLE.PAIRS"], baseline: L(2, 0, 2),
    statement: "Find angles made by a transversal cutting parallel lines" },
  { id: "TRI.CLASSIFY", concept: "triangles", typicalClass: 6, requires: ["SHP.2D.SIDES"], baseline: L(1, 0, 2),
    statement: "Classify triangles by their sides and angles" },
  { id: "TRI.ANGLE.SUM", concept: "triangles", typicalClass: 7, requires: ["GEO.ANGLE.TYPES", "TRI.CLASSIFY"], baseline: L(2, 0, 2),
    statement: "Use the angle sum property of a triangle" },
  { id: "TRI.PYTHAGORAS", concept: "triangles", typicalClass: 8, requires: ["SQR.SQUARE.ROOT", "TRI.CLASSIFY"], baseline: L(2, 1, 2),
    statement: "Use the Pythagoras theorem in a right-angled triangle" },
  { id: "QUA.PROPERTIES", concept: "quadrilaterals", typicalClass: 8, requires: ["TRI.ANGLE.SUM"], baseline: L(2, 0, 2),
    statement: "Use the properties of parallelograms, rhombuses and trapeziums" },
  { id: "CIR.PARTS", concept: "circles", typicalClass: 6, requires: ["SHP.2D.NAME"], baseline: L(1, 0, 2),
    statement: "Name the radius, diameter, chord and circumference of a circle" },
  { id: "CIR.CIRCUMFERENCE", concept: "circles", typicalClass: 7, requires: ["CIR.PARTS", "DEC.MUL.DIV"], baseline: L(2, 1, 2),
    statement: "Find the circumference and area of a circle" },

  { id: "MEN.TRIANGLE.AREA", concept: "mensuration", typicalClass: 7, requires: ["ARE.RECTANGLE", "TRI.CLASSIFY"], baseline: L(2, 0, 2),
    statement: "Find the area of a triangle and a parallelogram" },
  { id: "MEN.CUBOID.VOLUME", concept: "mensuration", typicalClass: 8, requires: ["ARE.RECTANGLE", "MUL.3D2D"], baseline: L(2, 1, 2),
    statement: "Find the volume and surface area of a cube and cuboid" },
  { id: "MEN.CYLINDER", concept: "mensuration", typicalClass: 8, requires: ["CIR.CIRCUMFERENCE", "MEN.CUBOID.VOLUME"], baseline: L(3, 1, 2),
    statement: "Find the volume and surface area of a cylinder" },

  { id: "AVG.MEAN", concept: "averages", typicalClass: 6, requires: ["DIV.3D1D.REM"], baseline: L(2, 0, 2),
    statement: "Find the mean of a set of numbers" },
  { id: "AVG.MEDIAN.MODE", concept: "averages", typicalClass: 7, requires: ["AVG.MEAN"], baseline: L(2, 0, 2),
    statement: "Find the median and mode of a set of numbers" },
  { id: "DAT.PIE.READ", concept: "pie-chart", typicalClass: 8, requires: ["PCT.OF.QUANTITY", "DAT.BAR.READ"], baseline: L(2, 0, 2, 2),
    statement: "Read a pie chart and answer questions about it" },
  { id: "PRB.SIMPLE", concept: "probability", typicalClass: 8, requires: ["FRA.WRITE"], baseline: L(2, 0, 2, 2),
    statement: "Find the probability of a simple event" },
];

// ---- lookups ------------------------------------------------------------

export const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));
export const CONCEPT_BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));

export function skillsOfConcept(conceptId: string): Skill[] {
  return SKILLS.filter((s) => s.concept === conceptId);
}

/**
 * Every skill this one leans on, walked transitively. The board-alignment
 * guard uses it to reject a question that quietly needs something the board
 * has not introduced yet.
 */
export function prerequisiteClosure(skillId: string, seen = new Set<string>()): Set<string> {
  const skill = SKILL_BY_ID.get(skillId);
  if (!skill?.requires) return seen;
  for (const req of skill.requires) {
    if (seen.has(req)) continue;
    seen.add(req);
    prerequisiteClosure(req, seen);
  }
  return seen;
}
