import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

interface ParsedQuestion {
  unit_no: number;
  marks: number;
  difficulty: string;
  bt_level: number;
  co_no: number;
  text: string;
  image_url?: string | null;
}

function parseAppMath2(): ParsedQuestion[] {
  const filePath = "U:\\CEP\\teacherease\\seed_appmath2.sql";
  const content = fs.readFileSync(filePath, "utf8");
  const regex = /\(\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*'((?:[^']|'')*)'\s*\)/g;
  const questions: ParsedQuestion[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const unit_no = parseInt(match[1], 10);
    const marks = parseInt(match[2], 10);
    const difficulty = match[3];
    const bt_level = parseInt(match[4], 10);
    const text = match[5].replace(/''/g, "'").trim();
    questions.push({
      unit_no,
      marks,
      difficulty,
      bt_level,
      co_no: unit_no, // CO matches Unit
      text,
      image_url: null,
    });
  }
  return questions;
}

function parseDataStructures(): ParsedQuestion[] {
  const filePath = "U:\\CEP\\teacherease\\seed_ds_images.sql";
  const content = fs.readFileSync(filePath, "utf8");
  const questions: ParsedQuestion[] = [];

  // 1. Image questions with fixed UUIDs
  // ('a4e10001-...', 4, 4, 'medium', 3, 'For the binary tree...')
  const imgRegex = /\(\s*'([a-f0-9-]+)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*'((?:[^']|'')*)'\s*\)/g;
  let m1;
  while ((m1 = imgRegex.exec(content)) !== null) {
    const id = m1[1];
    const unit_no = parseInt(m1[2], 10);
    const marks = parseInt(m1[3], 10);
    const difficulty = m1[4];
    const bt_level = parseInt(m1[5], 10);
    const text = m1[6].replace(/''/g, "'").trim();
    questions.push({
      unit_no,
      marks,
      difficulty,
      bt_level,
      co_no: unit_no,
      text,
      image_url: `/question-images/${id}.png`,
    });
  }

  // 2. Text questions in Data Structures
  // (4, 1, 'easy', 1, 'Define Binary Tree.'),
  const textRegex = /\(\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*'((?:[^']|'')*)'\s*\)/g;
  let m2;
  // skip the first part of the file which is image questions
  const textSection = content.slice(content.indexOf("text-only questions"));
  while ((m2 = textRegex.exec(textSection)) !== null) {
    const unit_no = parseInt(m2[1], 10);
    const marks = parseInt(m2[2], 10);
    const difficulty = m2[3];
    const bt_level = parseInt(m2[4], 10);
    const text = m2[5].replace(/''/g, "'").trim();
    questions.push({
      unit_no,
      marks,
      difficulty,
      bt_level,
      co_no: unit_no,
      text,
      image_url: null,
    });
  }

  return questions;
}

function parseIotCsv(): ParsedQuestion[] {
  const filePath = "U:\\CEP\\teacherease\\iot_import_sample.csv";
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  const questions: ParsedQuestion[] = [];
  // Unit,Marks,Difficulty,CO,Bloom Level,Question Text
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(",");
    if (parts.length >= 6) {
      const unit_no = parseInt(parts[0].trim(), 10) || 1;
      const marks = parseInt(parts[1].trim(), 10) || 1;
      const difficulty = parts[2].trim() || "medium";
      const co_no = parseInt(parts[3].trim(), 10) || 1;
      const bt_level = parseInt(parts[4].trim(), 10) || 1;
      const text = parts.slice(5).join(",").replace(/^"|"$/g, "").trim();
      questions.push({
        unit_no,
        marks,
        difficulty,
        bt_level,
        co_no,
        text,
        image_url: null,
      });
    }
  }
  return questions;
}

async function migrateSubject(
  client: Client,
  code: string,
  name: string,
  semester: number,
  department: string,
  questions: ParsedQuestion[]
) {
  console.log(`\n--- Migrating ${code}: ${name} (${questions.length} questions) ---`);

  // 1. Create or get bank_subject
  const subjRes = await client.query(
    `INSERT INTO public.bank_subjects (name, code, semester, department, class_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [name, code, semester, department, `Sem ${semester}`]
  );

  let subjectId: string;
  if (subjRes.rows.length > 0) {
    subjectId = subjRes.rows[0].id;
  } else {
    const existing = await client.query(
      `SELECT id FROM public.bank_subjects WHERE code = $1`,
      [code]
    );
    subjectId = existing.rows[0].id;
  }

  // 2. Create Units 1 to 6
  const unitMap = new Map<number, string>();
  for (let u = 1; u <= 6; u++) {
    const uRes = await client.query(
      `INSERT INTO public.bank_units (subject_id, name, position, unit_no)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (subject_id, lower(name)) DO UPDATE
       SET unit_no = EXCLUDED.unit_no
       RETURNING id`,
      [subjectId, `Unit ${u}`, u, u]
    );
    unitMap.set(u, uRes.rows[0]?.id || "");
    if (!unitMap.get(u)) {
      const ex = await client.query(
        `SELECT id FROM public.bank_units WHERE subject_id = $1 AND unit_no = $2`,
        [subjectId, u]
      );
      unitMap.set(u, ex.rows[0]?.id);
    }
  }

  // 3. Insert questions into question_bank
  let inserted = 0;
  for (const q of questions) {
    const unitId = unitMap.get(q.unit_no);
    const qType = q.marks <= 2 ? "short-answer" : "long-answer";

    const payload = {
      id: Math.random().toString(36).slice(2, 10),
      type: qType,
      marks: q.marks,
      title: q.text,
      unit_no: q.unit_no,
      co_no: q.co_no,
      bt_level: q.bt_level,
      difficulty: q.difficulty,
      image_url: q.image_url,
      items: [{ id: "item1", content: q.text }],
    };

    const qRes = await client.query(
      `INSERT INTO public.question_bank 
       (subject_id, unit_id, title, type, subject, class_name, marks, unit_no, co_no, bt_level, difficulty, image_url, enabled, source, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, 'teacherease_migration', $13)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        subjectId,
        unitId,
        q.text,
        qType,
        name,
        `Sem ${semester}`,
        q.marks,
        q.unit_no,
        q.co_no,
        q.bt_level,
        q.difficulty,
        q.image_url,
        JSON.stringify(payload),
      ]
    );

    if (qRes.rows.length > 0) inserted++;
  }

  console.log(`Successfully migrated ${code}: ${inserted} new questions inserted into PaperGen bank.`);
}

async function main() {
  const client = new Client({
    host: "db.nljchdscmopuipjaxtyx.supabase.co",
    port: 5432,
    user: "postgres",
    password: "Pradyumna@10",
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const appMath = parseAppMath2();
    await migrateSubject(
      client,
      "CS/AI/ML201BSC03",
      "Applied Mathematics-II",
      2,
      "Computer Science & Engineering",
      appMath
    );

    const ds = parseDataStructures();
    await migrateSubject(
      client,
      "CS/AI/ML302PCC03",
      "Data Structures",
      3,
      "Computer Science & Engineering",
      ds
    );

    const iot = parseIotCsv();
    if (iot.length > 0) {
      await migrateSubject(
        client,
        "CS/AI/ML401PCC01",
        "Internet of Things (IoT)",
        4,
        "Computer Science & Engineering",
        iot
      );
    }

    console.log("\nAll TeacherEase question banks migrated into PaperGen!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

main();
