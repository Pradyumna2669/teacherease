import { normalizeHeader, parseQuestionFile, validateImportedQuestionRows } from './lib/questionImport';

test('parses CSV files and preserves commas inside quoted question text', async () => {
  const csv = [
    'Unit,Marks,Difficulty,CO,Bloom Level,Question Text',
    '1,2,easy,1,1,"Compare Wi-Fi, Bluetooth, and Zigbee."',
  ].join('\n');
  const bytes = Uint8Array.from(Buffer.from(csv, 'utf8'));
  const file = {
    name: 'questions.csv',
    arrayBuffer: async () => bytes.buffer,
  };

  const rows = await parseQuestionFile(file);
  const result = validateImportedQuestionRows(rows);

  expect(result.validRows).toHaveLength(1);
  expect(result.validRows[0].text).toBe('Compare Wi-Fi, Bluetooth, and Zigbee.');
});

test('normalizes common spreadsheet headers to the app question fields', () => {
  expect(normalizeHeader('Question Text')).toBe('question text');
  expect(normalizeHeader('Bloom Level')).toBe('bloom level');
  expect(normalizeHeader('CO')).toBe('co');
  expect(normalizeHeader('unit_number')).toBe('unit number');
});

test('validates imported question rows and preserves valid records for insertion', () => {
  const result = validateImportedQuestionRows([
    {
      'Question Text': 'What is 2 + 2?',
      Unit: 1,
      Marks: 2,
      Difficulty: 'easy',
      CO: 1,
      'Bloom Level': 3,
    },
    {
      'Question Text': '',
      Unit: 2,
      Marks: 'bad',
      Difficulty: 'impossible',
    },
  ]);

  expect(result.validRows).toHaveLength(1);
  expect(result.validRows[0]).toMatchObject({
    text: 'What is 2 + 2?',
    unit_no: 1,
    marks: 2,
    difficulty: 'easy',
    co_no: 1,
    bt_level: 3,
  });
  expect(result.invalidRows).toHaveLength(1);
  expect(result.invalidRows[0].errors).toEqual(
    expect.arrayContaining([
      'Question text is empty.',
      'Marks must be a positive number.',
      'Difficulty "impossible" is not supported.',
    ])
  );
});

test('reports missing required spreadsheet columns before import', () => {
  const result = validateImportedQuestionRows([
    {
      'Some other column': 'abc',
      'Another field': 2,
    },
  ]);

  expect(result.validRows).toHaveLength(0);
  expect(result.invalidRows[0].errors).toEqual(
    expect.arrayContaining([
      'Missing required column(s): question text, unit, marks, difficulty.',
    ])
  );
});
