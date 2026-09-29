import * as XLSX from 'xlsx';

export const SUPPORTED_DIFFICULTY = new Set(['easy', 'medium', 'hard']);

export function normalizeHeader(value) {
  if (value == null) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function coerceNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || `${value}`.trim() === '') return null;

  const text = String(value).trim().replace(/,/g, '');
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);

  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function findRawValue(rawRow, aliases) {
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

function mapQuestionRow(rawRow) {
  const row = rawRow || {};
  const textValue = findRawValue(row, [
    'question text',
    'question',
    'questiontext',
    'question text question',
    'statement',
    'problem',
    'question description',
    'text',
  ]);

  const unitValue = findRawValue(row, ['unit', 'unit no', 'unit number', 'unit number no', 'unitno', 'unit no.', 'unit_number']);
  const marksValue = findRawValue(row, ['marks', 'mark', 'marks awarded', 'mark value']);
  const difficultyValue = findRawValue(row, ['difficulty', 'difficulty level', 'difficultylevel']);
  const coValue = findRawValue(row, ['co', 'co no', 'co number', 'co no.', 'course outcome', 'course outcome no', 'co_no']);
  const btValue = findRawValue(row, ['bloom level', 'bloom', 'bt level', 'btlevel', 'bloom taxonomylevel', 'bloomtaxonomy', 'bt_level']);

  const text = typeof textValue === 'string' ? textValue.trim() : textValue != null ? String(textValue).trim() : '';
  const unitNo = coerceNumber(unitValue);
  const marks = coerceNumber(marksValue);
  const difficulty = typeof difficultyValue === 'string' ? difficultyValue.trim().toLowerCase() : difficultyValue != null ? String(difficultyValue).trim().toLowerCase() : '';
  const coNo = coerceNumber(coValue);
  const btLevel = coerceNumber(btValue);

  return {
    text,
    unit_no: unitNo != null ? Math.round(unitNo) : null,
    marks: marks != null ? Math.round(marks) : null,
    difficulty,
    co_no: coNo != null ? Math.round(coNo) : null,
    bt_level: btLevel != null ? Math.round(btLevel) : null,
  };
}

export function validateImportedQuestionRows(rows) {
  const validRows = [];
  const invalidRows = [];

  const requiredFields = ['question text', 'unit', 'marks', 'difficulty'];
  const allKeys = rows.flatMap((row) => Object.keys(row || {})).map((key) => normalizeHeader(key));
  const missingColumns = requiredFields.filter((field) => !allKeys.some((key) => key === field || key.includes(field)));

  rows.forEach((row, index) => {
    const mapped = mapQuestionRow(row);
    const errors = [];

    if (missingColumns.length > 0) {
      errors.push(`Missing required column(s): ${missingColumns.join(', ')}.`);
    }

    if (!mapped.text) {
      errors.push('Question text is empty.');
    }

    if (mapped.unit_no == null || !Number.isInteger(mapped.unit_no) || mapped.unit_no < 1) {
      errors.push('Unit must be a positive integer.');
    }

    if (mapped.marks == null || !Number.isInteger(mapped.marks) || mapped.marks < 1) {
      errors.push('Marks must be a positive number.');
    }

    if (!mapped.difficulty) {
      errors.push('Difficulty is missing.');
    } else if (!SUPPORTED_DIFFICULTY.has(mapped.difficulty)) {
      errors.push(`Difficulty "${mapped.difficulty}" is not supported.`);
    }

    if (mapped.co_no != null && (!Number.isInteger(mapped.co_no) || mapped.co_no < 1)) {
      errors.push('CO must be a positive integer.');
    }

    if (mapped.bt_level != null && (!Number.isInteger(mapped.bt_level) || mapped.bt_level < 1 || mapped.bt_level > 6)) {
      errors.push('Bloom level must be a number from 1 to 6.');
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber: index + 2,
        source: row,
        errors,
      });
      return;
    }

    validRows.push({
      text: mapped.text,
      unit_no: mapped.unit_no,
      marks: mapped.marks,
      difficulty: mapped.difficulty,
      co_no: mapped.co_no,
      bt_level: mapped.bt_level,
    });
  });

  return {
    validRows,
    invalidRows,
    summary: {
      total: rows.length,
      valid: validRows.length,
      invalid: invalidRows.length,
    },
  };
}

export function normalizeQuestionRow(row) {
  return mapQuestionRow(row);
}

export async function parseQuestionFile(file) {
  if (!file) {
    throw new Error('Select a CSV or Excel file to import.');
  }

  const name = String(file.name || '').toLowerCase();
  const extension = name.includes('.') ? name.split('.').pop() : '';
  if (!['csv', 'xlsx', 'xls'].includes(extension)) {
    throw new Error('Unsupported file type. Please upload a CSV, XLSX, or XLS file.');
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    raw: false,
    cellDates: true,
  });

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) {
    throw new Error('The spreadsheet is empty or unreadable.');
  }

  const rows = XLSX.utils.sheet_to_json(firstSheet, {
    defval: '',
    raw: false,
    blankrows: false,
  });

  if (!rows.length) {
    throw new Error('No question rows were found in the uploaded file.');
  }

  return rows;
}

export function formatImportSummary(summary) {
  return `Detected ${summary.total} row(s): ${summary.valid} valid, ${summary.invalid} invalid.`;
}
