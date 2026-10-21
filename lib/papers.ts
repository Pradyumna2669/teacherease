import { createClient } from "@/lib/supabase/client";
import type { PaperSettings, Question } from "@/lib/types";

// A paper row as stored in Supabase. `settings` and `questions` are JSONB.
export interface StoredPaper {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  class_name: string | null;
  settings: PaperSettings;
  questions: Question[];
  school_id?: string | null;
  status?: "draft" | "in_review" | "approved" | "changes_requested";
  method?: "typed" | "scanned" | "ai_generated" | "ai_textbook";
  review_feedback?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Lightweight row for dashboard listing (no heavy questions payload).
export type PaperSummary = Pick<
  StoredPaper,
  "id" | "title" | "subject" | "class_name" | "created_at" | "updated_at"
> & {
  status?: "draft" | "in_review" | "approved" | "changes_requested";
  review_feedback?: string | null;
  question_count?: number;
};

export async function listPapers(): Promise<PaperSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("papers")
    .select("id, title, subject, class_name, created_at, updated_at, status, review_feedback, questions")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    class_name: row.class_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
    status: row.status,
    review_feedback: row.review_feedback,
    question_count: Array.isArray(row.questions) ? row.questions.length : 0,
  })) as PaperSummary[];
}

export async function getPaper(id: string): Promise<StoredPaper | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("papers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as StoredPaper | null;
}

export async function createPaper(input: {
  title: string;
  subject?: string | null;
  class_name?: string | null;
  settings: PaperSettings;
  questions: Question[];
}): Promise<StoredPaper> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("papers")
    .insert({
      user_id: user.id,
      title: input.title,
      subject: input.subject ?? null,
      class_name: input.class_name ?? null,
      settings: input.settings,
      questions: input.questions,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as StoredPaper;
}

export async function updatePaper(
  id: string,
  patch: {
    title?: string;
    subject?: string | null;
    class_name?: string | null;
    settings?: PaperSettings;
    questions?: Question[];
    method?: "typed" | "scanned" | "ai_generated" | "ai_textbook";
  }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("papers").update(patch).eq("id", id);
  if (error) throw error;
}

/* ===== Local draft mirror ===== */

// The cloud save is debounced and needs a working connection. Teachers build
// papers on school Wi-Fi and in autos, and Android kills the TWA's WebView
// whenever it wants — so every edit is also written here, synchronously, and
// only dropped once the server has accepted it.
const DRAFT_PREFIX = "papergen:draft:";

export interface PaperDraft {
  settings: PaperSettings;
  questions: Question[];
  savedAt: number;
}

// localStorage throws in private mode and when the quota is full. Losing the
// mirror is survivable; breaking the editor is not, so nothing here rethrows.
export function writeDraft(
  id: string,
  data: { settings: PaperSettings; questions: Question[] }
): void {
  try {
    localStorage.setItem(
      DRAFT_PREFIX + id,
      JSON.stringify({ ...data, savedAt: Date.now() })
    );
  } catch {
    // Over quota (papers with photos get large) — drop the stale copy rather
    // than leave one that would later be offered as "newer".
    clearDraft(id);
  }
}

export function readDraft(id: string): PaperDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PaperDraft;
    if (!parsed?.settings || !Array.isArray(parsed.questions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(id: string): void {
  try {
    localStorage.removeItem(DRAFT_PREFIX + id);
  } catch {
    /* nothing to do — the mirror is best-effort */
  }
}

export async function deletePaper(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("papers").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicatePaper(id: string): Promise<StoredPaper> {
  const original = await getPaper(id);
  if (!original) throw new Error("Paper not found.");
  return createPaper({
    title: `${original.title} (copy)`,
    subject: original.subject,
    class_name: original.class_name,
    settings: original.settings,
    questions: original.questions,
  });
}
