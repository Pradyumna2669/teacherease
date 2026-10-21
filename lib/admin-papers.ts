import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaperSettings, Question } from "@/lib/types";

// Admin access to teachers' papers.
//
// This exists so a rendering or scan bug can be reproduced from the paper that
// actually hit it, rather than from a guess. It reads other people's work, so
// every open is written to admin_audit — see 0011_admin_audit.sql — and the
// privacy policy says plainly that this can happen.

export interface AdminPaperRow {
  id: string;
  title: string;
  subject: string | null;
  class_name: string | null;
  email: string;
  created_at: string;
  updated_at: string | null;
  questionCount: number;
  /** Question types used, so a bug report maps to a renderer at a glance. */
  types: string[];
  language: string;
  /** Creation method (typed, scanned, ai_generated, ai_textbook). */
  method: "typed" | "scanned" | "ai_generated" | "ai_textbook";
  /** Whether any question carries an image — the scan-quality cases. */
  hasImages: boolean;
}

export interface AdminPaperDetail {
  id: string;
  title: string;
  email: string;
  created_at: string;
  settings: PaperSettings;
  questions: Question[];
}

async function emailsById(): Promise<Map<string, string>> {
  const admin = createAdminClient();
  const map = new Map<string, string>();
  // auth.users is paginated; a single page covers this scale comfortably, and
  // the loop keeps it correct as the userbase grows.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) if (u.email) map.set(u.id, u.email);
    if (data.users.length < 200) break;
  }
  return map;
}

/** Newest papers across all teachers, with enough shape to triage a bug. */
export async function listAllPapers(limit = 100): Promise<AdminPaperRow[]> {
  const admin = createAdminClient();
  const [{ data }, emails] = await Promise.all([
    admin
      .from("papers")
      .select("id, user_id, title, subject, class_name, settings, questions, method, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    emailsById(),
  ]);

  return (data ?? []).map((p) => {
    const questions = (p.questions ?? []) as Question[];
    const settings = (p.settings ?? {}) as Partial<PaperSettings>;
    const rawMethod = (p as { method?: string }).method;
    const method: "typed" | "scanned" | "ai_generated" | "ai_textbook" =
      rawMethod && ["typed", "scanned", "ai_generated", "ai_textbook"].includes(rawMethod)
        ? (rawMethod as "typed" | "scanned" | "ai_generated" | "ai_textbook")
        : "typed";

    return {
      id: String(p.id),
      title: String(p.title ?? "Untitled"),
      subject: p.subject ?? null,
      class_name: p.class_name ?? null,
      email: emails.get(String(p.user_id)) ?? "unknown",
      created_at: String(p.created_at),
      updated_at: p.updated_at ? String(p.updated_at) : null,
      questionCount: questions.length,
      types: Array.from(new Set(questions.map((q) => q.type))),
      language: settings.language ?? "english",
      method,
      hasImages: questions.some(
        (q) => (q.images?.length ?? 0) > 0 || q.items?.some((i) => !!i.image)
      ),
    };
  });
}

/**
 * One paper, in full, for rendering in the admin viewer.
 *
 * Writes an audit row before returning. If the audit insert fails the read
 * still proceeds — blocking a bug investigation on a logging hiccup would be
 * worse — but the failure is left in the server log.
 */
export async function getPaperForAdmin(
  paperId: string,
  adminEmail: string
): Promise<AdminPaperDetail | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("papers")
    .select("id, user_id, title, settings, questions, created_at")
    .eq("id", paperId)
    .maybeSingle();
  if (!data) return null;

  try {
    await admin.from("admin_audit").insert({
      admin_email: adminEmail,
      action: "view_paper",
      paper_id: String(data.id),
      owner_id: String(data.user_id),
    });
  } catch (err) {
    console.error("[admin-audit] could not record paper view", err);
  }

  const emails = await emailsById();
  return {
    id: String(data.id),
    title: String(data.title ?? "Untitled"),
    email: emails.get(String(data.user_id)) ?? "unknown",
    created_at: String(data.created_at),
    settings: data.settings as PaperSettings,
    questions: (data.questions ?? []) as Question[],
  };
}

export interface AuditRow {
  admin_email: string;
  action: string;
  paper_id: string | null;
  created_at: string;
}

/** Recent admin views, shown on the admin papers list. */
export async function recentAudit(limit = 20): Promise<AuditRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_audit")
    .select("admin_email, action, paper_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    admin_email: String(r.admin_email),
    action: String(r.action),
    paper_id: r.paper_id ? String(r.paper_id) : null,
    created_at: String(r.created_at),
  }));
}
