import { createClient } from "@/lib/supabase/client";
import type { Question, QuestionType } from "@/lib/types";

// The question bank is a syllabus tree: subject -> unit -> questions. Teachers
// set it up once, then build papers by asking for "N marks from these units"
// instead of hand-picking every question.

export type QuestionSource = "manual" | "paper" | "ai";

export interface BankSubject {
  id: string;
  name: string;
  class_name: string | null;
  code?: string | null;
  semester?: number | null;
  department?: string | null;
  school_id?: string | null;
  created_at: string;
}

export interface BankUnit {
  id: string;
  subject_id: string;
  name: string;
  unit_no?: number | null;
  book_name: string | null;
  position: number;
  created_at: string;
}

// A saved question, reusable in future papers.
export interface BankItem {
  id: string;
  title: string;
  type: string;
  subject: string | null;
  class_name: string | null;
  topic: string | null;
  subject_id: string | null;
  unit_id: string | null;
  unit_no?: number | null;
  co_no?: number | null;
  bt_level?: number | null;
  difficulty?: string | null;
  image_url?: string | null;
  marks: number;
  enabled: boolean;
  source: QuestionSource;
  times_used: number;
  last_used_at: string | null;
  payload: Question; // full Question object, ready to drop into a paper
  created_at: string;
}

export interface BankFilter {
  subject?: string;
  class_name?: string;
  type?: string;
  subject_id?: string;
  unit_id?: string;
  unit_no?: number;
  co_no?: number;
  bt_level?: number;
  difficulty?: string;
  /** Omit to get both; pass true/false to filter. */
  enabled?: boolean;
  source?: QuestionSource;
  q?: string; // free-text search over title
}

const ITEM_COLS =
  "id, title, type, subject, class_name, topic, subject_id, unit_id, unit_no, co_no, bt_level, difficulty, image_url, marks, enabled, source, times_used, last_used_at, payload, created_at";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

/* ------------------------------------------------------------- subjects */

export async function listSubjects(): Promise<BankSubject[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bank_subjects")
    .select("id, name, class_name, code, semester, department, created_at")
    .order("name");
  if (error) throw error;
  return (data ?? []) as BankSubject[];
}

export async function createSubject(
  name: string,
  className?: string | null
): Promise<BankSubject> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("bank_subjects")
    .insert({
      user_id: user.id,
      name: name.trim(),
      class_name: className?.trim() || null,
    })
    .select("id, name, class_name, created_at")
    .single();
  // 23505 = the unique index — the teacher already has this subject.
  if (error) {
    if (error.code === "23505") throw new Error("You already have that subject.");
    throw error;
  }
  return data as BankSubject;
}

export async function renameSubject(
  id: string,
  name: string,
  className?: string | null
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("bank_subjects")
    .update({ name: name.trim(), class_name: className?.trim() || null })
    .eq("id", id);
  if (error) throw error;
}

// Deleting a subject cascades its units; questions survive with a null unit_id
// and reappear under "Unfiled" rather than being destroyed.
export async function deleteSubject(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("bank_subjects").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------------------------------------------- units */

export async function listUnits(subjectId?: string): Promise<BankUnit[]> {
  const supabase = createClient();
  let query = supabase
    .from("bank_units")
    .select("id, subject_id, name, unit_no, book_name, position, created_at")
    .order("position")
    .order("name");
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BankUnit[];
}

export async function createUnit(
  subjectId: string,
  name: string,
  bookName?: string | null,
  position = 0
): Promise<BankUnit> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("bank_units")
    .insert({
      user_id: user.id,
      subject_id: subjectId,
      name: name.trim(),
      book_name: bookName?.trim() || null,
      position,
    })
    .select("id, subject_id, name, book_name, position, created_at")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("That unit already exists in this subject.");
    throw error;
  }
  return data as BankUnit;
}

export async function updateUnit(
  id: string,
  patch: { name?: string; book_name?: string | null; position?: number }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("bank_units").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteUnit(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("bank_units").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------ questions */

export interface NewBankQuestion {
  title: string;
  type: string;
  subject?: string | null;
  class_name?: string | null;
  topic?: string | null;
  subject_id?: string | null;
  unit_id?: string | null;
  marks?: number;
  source?: QuestionSource;
  payload: Question;
}

// Save a batch of questions — from a built paper, a manual add, or an AI run.
export async function saveQuestionsToBank(rows: NewBankQuestion[]): Promise<number> {
  if (!rows.length) return 0;
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("question_bank").insert(
    rows.map((r) => ({
      user_id: user.id,
      title: r.title || "",
      type: r.type,
      subject: r.subject ?? null,
      class_name: r.class_name ?? null,
      topic: r.topic ?? null,
      subject_id: r.subject_id ?? null,
      unit_id: r.unit_id ?? null,
      // Trust the question's own marks when the caller didn't override.
      marks: r.marks ?? r.payload.marks ?? 1,
      source: r.source ?? "manual",
      payload: r.payload,
    }))
  );
  if (error) throw error;
  return rows.length;
}

// List the teacher's saved questions, newest first, with optional filters.
export async function listBank(filter: BankFilter = {}): Promise<BankItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("question_bank")
    .select(ITEM_COLS)
    .order("created_at", { ascending: false });

  if (filter.subject) query = query.eq("subject", filter.subject);
  if (filter.class_name) query = query.eq("class_name", filter.class_name);
  if (filter.type) query = query.eq("type", filter.type);
  if (filter.subject_id) query = query.eq("subject_id", filter.subject_id);
  if (filter.unit_id) query = query.eq("unit_id", filter.unit_id);
  if (filter.unit_no !== undefined) query = query.eq("unit_no", filter.unit_no);
  if (filter.co_no !== undefined) query = query.eq("co_no", filter.co_no);
  if (filter.bt_level !== undefined) query = query.eq("bt_level", filter.bt_level);
  if (filter.difficulty) query = query.eq("difficulty", filter.difficulty);
  if (filter.source) query = query.eq("source", filter.source);
  if (filter.enabled !== undefined) query = query.eq("enabled", filter.enabled);
  if (filter.q) query = query.ilike("title", `%${filter.q}%`);

  const { data, error } = await query.limit(1000);
  if (error) throw error;
  return (data ?? []) as unknown as BankItem[];
}

// Distinct subjects/classes the teacher has saved — for the filter dropdowns.
export async function bankFacets(): Promise<{
  subjects: string[];
  classes: string[];
}> {
  const supabase = createClient();
  const { data } = await supabase
    .from("question_bank")
    .select("subject, class_name")
    .limit(1000);
  const subjects = new Set<string>();
  const classes = new Set<string>();
  (data ?? []).forEach((r: { subject: string | null; class_name: string | null }) => {
    if (r.subject) subjects.add(r.subject);
    if (r.class_name) classes.add(r.class_name);
  });
  return {
    subjects: Array.from(subjects).sort(),
    classes: Array.from(classes).sort(),
  };
}

export async function updateBankItem(
  id: string,
  patch: {
    title?: string;
    marks?: number;
    enabled?: boolean;
    unit_id?: string | null;
    subject_id?: string | null;
    topic?: string | null;
    payload?: Question;
  }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("question_bank").update(patch).eq("id", id);
  if (error) throw error;
}

export async function setBankItemEnabled(id: string, enabled: boolean): Promise<void> {
  return updateBankItem(id, { enabled });
}

export async function deleteBankItem(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("question_bank").delete().eq("id", id);
  if (error) throw error;
}

// Move a batch of questions into a unit (used by the bank UI's bulk "file into").
export async function assignToUnit(
  ids: string[],
  unitId: string | null,
  subjectId: string | null
): Promise<void> {
  if (!ids.length) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("question_bank")
    .update({ unit_id: unitId, subject_id: subjectId })
    .in("id", ids);
  if (error) throw error;
}

/* ------------------------------------------------- selection & rotation */

export interface PickOptions {
  /** Units to draw from. Empty = the whole bank. */
  unitIds?: string[];
  /** Stop once the selected questions add up to this many marks. */
  targetMarks: number;
  /** Restrict to these question types. Empty/omitted = any type. */
  types?: QuestionType[];
  /** Cap on how many questions to return regardless of marks. */
  maxQuestions?: number;
  /** Never pick these (e.g. already in the paper). */
  excludeIds?: string[];
}

export interface PickResult {
  items: BankItem[];
  marks: number;
  /** True when the bank could not cover targetMarks. */
  short: boolean;
}

// Fisher-Yates, so ties within a usage tier come out in a different order every
// time and two papers from the same unit don't look identical.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Fair-rotation pick.
 *
 * Questions are bucketed by how many times they have been used, least-used
 * first, and each bucket is shuffled independently. So a fresh question always
 * beats a stale one, but two papers built back-to-back from the same unit still
 * differ. Within the final bucket we fill greedily toward targetMarks,
 * preferring a question that fits the remaining marks exactly.
 */
export function pickQuestions(pool: BankItem[], opts: PickOptions): PickResult {
  const { targetMarks, types, maxQuestions, excludeIds = [], unitIds = [] } = opts;
  const exclude = new Set(excludeIds);
  const units = new Set(unitIds);

  const eligible = pool.filter(
    (q) =>
      q.enabled &&
      !exclude.has(q.id) &&
      (units.size === 0 || (q.unit_id != null && units.has(q.unit_id))) &&
      (!types?.length || types.includes(q.type as QuestionType))
  );

  // Bucket by usage count, then shuffle inside each bucket.
  const buckets = new Map<number, BankItem[]>();
  for (const q of eligible) {
    const list = buckets.get(q.times_used) ?? [];
    list.push(q);
    buckets.set(q.times_used, list);
  }
  const ordered = Array.from(buckets.keys())
    .sort((a, b) => a - b)
    .flatMap((n) => shuffle(buckets.get(n)!));

  const picked: BankItem[] = [];
  const takenOrSkipped = new Set<string>();
  let marks = 0;
  for (const q of ordered) {
    if (marks >= targetMarks) break;
    if (maxQuestions && picked.length >= maxQuestions) break;
    // Don't overshoot: skip a 10-mark question when only 2 marks are left and
    // something smaller is still available further down the list.
    const remaining = targetMarks - marks;
    if (
      q.marks > remaining &&
      ordered.some((o) => !takenOrSkipped.has(o.id) && o.id !== q.id && o.marks <= remaining)
    ) {
      continue;
    }
    picked.push(q);
    takenOrSkipped.add(q.id);
    marks += q.marks;
  }

  return { items: picked, marks, short: marks < targetMarks };
}

/** Fetch the pool for the given units and run the rotation pick in one call. */
export async function pickFromBank(opts: PickOptions): Promise<PickResult> {
  const pool = await listBank({ enabled: true });
  return pickQuestions(pool, opts);
}

// Record that these questions went into a paper, so the next pick prefers
// others. Failure here must never break paper creation — it only degrades
// rotation quality.
export async function markQuestionsUsed(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const supabase = createClient();
  await supabase.rpc("bump_bank_usage", { p_ids: ids });
}

/** Per-unit counts for the bank UI sidebar. */
export function unitStats(items: BankItem[]) {
  const map = new Map<string, { total: number; enabled: number; marks: number }>();
  for (const q of items) {
    const key = q.unit_id ?? "__unfiled__";
    const s = map.get(key) ?? { total: 0, enabled: 0, marks: 0 };
    s.total += 1;
    if (q.enabled) {
      s.enabled += 1;
      s.marks += q.marks;
    }
    map.set(key, s);
  }
  return map;
}
