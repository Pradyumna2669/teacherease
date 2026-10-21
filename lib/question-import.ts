import * as XLSX from "xlsx";
import type { BankItem } from "./question-bank";

export const SUPPORTED_DIFFICULTY = new Set(["easy", "medium", "hard"]);

export function normalizeHeader(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value == null || `${value}`.trim() === "") return null;

  const text = String(value).trim().replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);

  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function findRawValue(rawRow: Record<string, unknown>, aliases: string[]): unknown {
  for (const [key, value] of Object.entries(rawRow)) {
    if (aliases.includes(normalizeHeader(key))) {
      return value;
    }
  }

  const normalizedRow = Object.fromEntries(
    Object.entries(rawRow).map(([key, value]) => [normalizeHeader(key), value])
  );

  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(normalizedRow, alias)) {
      return normalizedRow[alias];
    }
  }

  return undefined;
}

export interface ParsedImportRow {
  text: string;
  unit_no: number;
  marks: number;
  difficulty: "easy" | "medium" | "hard";
  co_no?: number | null;
  bt_level?: number | null;
  type?: string;
}

export interface ImportValidationResult {
  validRows: ParsedImportRow[];
  invalidRows: { rowNumber: number; source: Record<string, unknown>; errors: string[] }[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    hasErrors: boolean;
  };
}

export function parseAndValidateSpreadsheet(
  data: ArrayBuffer
): ImportValidationResult {
  const workbook = XLSX.read(data, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Spreadsheet contains no sheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });

  const validRows: ParsedImportRow[] = [];
  const invalidRows: { rowNumber: number; source: Record<string, unknown>; errors: string[] }[] = [];

  rawRows.forEach((row, index) => {
    const textVal = findRawValue(row, [
      "question text",
      "question",
      "questiontext",
      "statement",
      "problem",
      "text",
      "question description",
    ]);

    const unitVal = findRawValue(row, [
      "unit",
      "unit no",
      "unit number",
      "unitno",
      "chapter",
      "unit_number",
    ]);

    const marksVal = findRawValue(row, ["marks", "mark", "mark value", "score"]);
    const diffVal = findRawValue(row, ["difficulty", "difficulty level", "level"]);
    const coVal = findRawValue(row, ["co", "co no", "course outcome", "co_no"]);
    const btVal = findRawValue(row, ["bloom level", "bloom", "bt level", "btlevel", "bt_level"]);
    const typeVal = findRawValue(row, ["type", "question type", "qtype"]);

    const text = typeof textVal === "string" ? textVal.trim() : String(textVal ?? "").trim();
    const unitNo = coerceNumber(unitVal) ?? 1;
    const marks = coerceNumber(marksVal) ?? (typeVal === "mcq" ? 1 : 2);
    let diff = typeof diffVal === "string" ? diffVal.trim().toLowerCase() : "medium";
    if (!SUPPORTED_DIFFICULTY.has(diff)) diff = "medium";
    const coNo = coerceNumber(coVal);
    const btLevel = coerceNumber(btVal);
    const qType = typeof typeVal === "string" && typeVal ? typeVal.trim().toLowerCase() : (marks <= 2 ? "short-answer" : "long-answer");

    const errors: string[] = [];
    if (!text) errors.push("Question text is empty.");
    if (unitNo < 1) errors.push("Unit/Chapter must be 1 or higher.");
    if (marks < 1) errors.push("Marks must be at least 1.");
    if (btLevel != null && (btLevel < 1 || btLevel > 6)) {
      errors.push("Bloom Level must be between 1 and 6.");
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber: index + 2,
        source: row,
        errors,
      });
    } else {
      validRows.push({
        text,
        unit_no: Math.round(unitNo),
        marks: Math.round(marks),
        difficulty: diff as "easy" | "medium" | "hard",
        co_no: coNo != null ? Math.round(coNo) : null,
        bt_level: btLevel != null ? Math.round(btLevel) : null,
        type: qType,
      });
    }
  });

  return {
    validRows,
    invalidRows,
    summary: {
      total: rawRows.length,
      valid: validRows.length,
      invalid: invalidRows.length,
      hasErrors: invalidRows.length > 0,
    },
  };
}

/** Download pre-formatted Excel template for easy question authoring. */
export function downloadQuestionImportTemplate(mode: "school" | "college" = "college") {
  let header: string[];
  let sample: (string | number)[][];

  if (mode === "college") {
    header = ["unit_no", "marks", "difficulty", "co_no", "bt_level", "question_text"];
    sample = [
      [1, 2, "easy", 1, 1, 'Define the term "algorithm" and state its key properties.'],
      [1, 4, "medium", 1, 3, "Explain the working of Binary Search with a neat example and trace table."],
      [2, 10, "hard", 2, 5, "Design an optimal dynamic programming solution for the 0/1 Knapsack problem with complexity analysis."],
    ];
  } else {
    header = ["unit_or_chapter", "marks", "difficulty", "question_type", "question_text"];
    sample = [
      [1, 1, "easy", "fill-blanks", "Plants make their food through the process of ______."],
      [1, 2, "medium", "short-answer", "Name three major parts of a flowering plant and their functions."],
      [2, 5, "hard", "long-answer", "Describe the water cycle with the help of a neat diagram."],
    ];
  }

  const ws = XLSX.utils.aoa_to_sheet([header, ...sample]);
  ws["!cols"] = [
    { wch: 16 }, // Unit
    { wch: 8 },  // Marks
    { wch: 12 }, // Difficulty
    ...(mode === "college" ? [{ wch: 8 }, { wch: 10 }] : [{ wch: 15 }]),
    { wch: 80 }, // Question Text
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Question_Template");
  const filename = mode === "college" ? "college_question_template.xlsx" : "school_question_template.xlsx";
  XLSX.writeFile(wb, filename);
}

/** One-click export of an entire question bank to Excel */
export function exportBankToExcel(subjectName: string, items: BankItem[]) {
  if (!items || items.length === 0) {
    alert("No questions available to export.");
    return;
  }

  const header = [
    "unit_no",
    "marks",
    "difficulty",
    "co_no",
    "bt_level",
    "type",
    "question_text",
    "status",
  ];

  const rows = items.map((q) => [
    q.unit_no ?? (q.payload?.unit_no ?? ""),
    q.marks ?? (q.payload?.marks ?? 1),
    q.difficulty ?? (q.payload?.difficulty ?? "medium"),
    q.co_no ?? (q.payload?.co_no ?? ""),
    q.bt_level ?? (q.payload?.bt_level ?? ""),
    q.type,
    q.title || q.payload?.title || "",
    q.enabled ? "active" : "inactive",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 8 },
    { wch: 10 },
    { wch: 14 },
    { wch: 80 },
    { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "QuestionBank");
  const safeName = (subjectName || "Subject").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeName}_Question_Bank_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
