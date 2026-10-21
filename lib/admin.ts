import { createAdminClient } from "@/lib/supabase/admin";
import {
  TOPUP_PACKS,
  CREDIT_PLANS,
  schoolCreditCostInr,
} from "@/lib/credit-packs";

// Admin gate. Set ADMIN_EMAILS (comma-separated) in the environment to the
// owner's email(s). Secure default: if unset, nobody is admin.
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

// INR actually received for a single ledger GRANT row. Credits are only granted
// on a *paid* Razorpay event (order.paid / subscription.charged), and each grant
// amount maps uniquely to a product price — so summing these is real revenue,
// no Razorpay API call needed.
// Comprehensive mapping of all packs (current + legacy + plans) to INR price:
const KNOWN_PACK_INR: Record<number, number> = {
  // New paper packs:
  100: 29,  // Starter Trial
  300: 79,  // Monthly Pack
  500: 99,  // Teacher Monthly subscription
  700: 149, // Exam Season Pack
  2000: 499, // Annual Teacher Pro
  3000: 499, // Teacher Annual subscription
  // Legacy packs & plans:
  60: 59,
  180: 159,
  200: 99,
  400: 329,
  1000: 749,
  2600: 799,
};

function grantInr(row: {
  reason: string;
  delta: number;
  school_id: string | null;
}): number {
  if (row.delta <= 0) return 0;
  if (row.school_id) return schoolCreditCostInr(row.delta);
  if (KNOWN_PACK_INR[row.delta]) return KNOWN_PACK_INR[row.delta];

  if (row.reason === "topup") {
    return TOPUP_PACKS.find((p) => p.credits === row.delta)?.amountInr ?? 0;
  }
  if (row.reason === "monthly_refill") {
    return CREDIT_PLANS.find((p) => p.credits === row.delta)?.amountInr ?? 0;
  }
  return 0;
}

export interface TeacherFeedbackItem {
  id: string;
  userId?: string | null;
  email: string;
  paperId?: string | null;
  rating: number | null;
  expectedFeatures: string[];
  feedbackText: string;
  method: string;
  status: string;
  creditsRewarded?: number;
  createdAt: string;
}

export interface AdminStats {
  totals: {
    users: number;
    papers: number;
    revenueInr: number;
    payingCustomers: number;
    creditsSpent: number;
    creditsGranted: number;
    scans: number;
  };
  topCreators: { email: string; papers: number; spent: number }[];
  recentSignups: { email: string; created_at: string }[];
  papersByDay: { day: string; count: number }[];
  revenueByDay: { day: string; inr: number }[];
  revenueByReason: { reason: string; inr: number; count: number }[];
  recentPapers: {
    title: string;
    email: string;
    method: "typed" | "scanned" | "ai_generated" | "ai_textbook";
    created_at: string;
  }[];
  /** Failures in the paid paths, newest first. Empty is the healthy state. */
  recentErrors: {
    action: string;
    status: number;
    message: string;
    email: string;
    charged: boolean;
    context: Record<string, unknown>;
    created_at: string;
  }[];
  errorsLast24h: number;
  funnelCounts: { event: string; count: number }[];
  teacherFeedbacks: TeacherFeedbackItem[];
}

export async function getAdminStats(): Promise<AdminStats> {
  const admin = createAdminClient();

  // --- Users: paginate auth.users for id→email + signup dates ---
  const emailById = new Map<string, string>();
  const signups: { email: string; created_at: string }[] = [];
  const perPage = 200;
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) break;
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email) emailById.set(u.id, u.email);
      signups.push({ email: u.email ?? u.id.slice(0, 8), created_at: u.created_at ?? "" });
    }
    if (users.length < perPage) break;
  }

  // --- Papers ---
  const { data: papers } = await admin
    .from("papers")
    .select("id, user_id, title, created_at, updated_at, method");
  const paperRows = papers ?? [];
  const papersByUser = new Map<string, number>();
  const papersByDayMap = new Map<string, number>();
  // Per-user paper edit windows, for attributing ref-less (pre-fix) scans.
  const paperWindows = new Map<string, { id: string; c: string; u: string }[]>();
  for (const p of paperRows) {
    papersByUser.set(p.user_id, (papersByUser.get(p.user_id) ?? 0) + 1);
    const day = String(p.created_at).slice(0, 10);
    papersByDayMap.set(day, (papersByDayMap.get(day) ?? 0) + 1);
    const list = paperWindows.get(p.user_id) ?? [];
    list.push({
      id: String(p.id),
      c: String(p.created_at),
      u: String(p.updated_at ?? p.created_at),
    });
    paperWindows.set(p.user_id, list);
  }

  // --- Ledger: revenue, spend, scans ---
  const { data: ledger } = await admin
    .from("credit_ledger")
    .select("user_id, school_id, delta, reason, created_at, ref");
  const ledgerRows = ledger ?? [];

  // Paper ids that were scanned. New scans ref the paper id directly. Older
  // (pre-fix) scans have no ref, so we attribute them to the user's paper whose
  // edit window contains the scan time (falling back to the most recent paper
  // created before the scan).
  const scannedPaperIds = new Set<string>();
  for (const r of ledgerRows) {
    if (r.reason !== "scan") continue;
    if (r.ref) {
      scannedPaperIds.add(String(r.ref));
      continue;
    }
    const t = String(r.created_at);
    const list = paperWindows.get(r.user_id) ?? [];
    if (!list.length) continue;
    const inWindow = list.filter((p) => p.c <= t && t <= p.u);
    const before = list.filter((p) => p.c <= t);
    const pool = inWindow.length ? inWindow : before.length ? before : list;
    // most recently opened paper at/ before the scan
    const chosen = pool.reduce((a, b) => (a.c >= b.c ? a : b));
    scannedPaperIds.add(chosen.id);
  }

  let revenueInr = 0;
  let creditsSpent = 0;
  let creditsGranted = 0;
  let scans = 0;
  const payingCustomers = new Set<string>();
  const spentByUser = new Map<string, number>();
  const revenueByDayMap = new Map<string, number>();
  const revenueByReasonMap = new Map<string, { inr: number; count: number }>();

  for (const r of ledgerRows) {
    if (r.delta < 0) {
      creditsSpent += -r.delta;
      if (r.user_id)
        spentByUser.set(r.user_id, (spentByUser.get(r.user_id) ?? 0) + -r.delta);
      if (r.reason === "scan") scans += 1;
    } else if (r.reason === "topup" || r.reason === "monthly_refill") {
      creditsGranted += r.delta;
      const inr = grantInr(r);
      revenueInr += inr;
      if (r.user_id) payingCustomers.add(r.user_id);
      const day = String(r.created_at).slice(0, 10);
      revenueByDayMap.set(day, (revenueByDayMap.get(day) ?? 0) + inr);
      const label = r.reason === "topup" ? (r.school_id ? "School bulk" : "Credit pack") : "Monthly plan";
      const cur = revenueByReasonMap.get(label) ?? { inr: 0, count: 0 };
      revenueByReasonMap.set(label, { inr: cur.inr + inr, count: cur.count + 1 });
    }
  }

  // Include users with active subscriptions in paying customers
  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, status");
  for (const s of subs ?? []) {
    if (s.user_id && (s.status === "active" || s.status === "authenticated")) {
      payingCustomers.add(s.user_id);
    }
  }

  const topCreators = Array.from(papersByUser.entries())
    .map(([uid, count]) => ({
      email: emailById.get(uid) ?? uid.slice(0, 8) + "…",
      papers: count,
      spent: spentByUser.get(uid) ?? 0,
    }))
    .sort((a, b) => b.papers - a.papers)
    .slice(0, 25);

  const recentSignups = [...signups]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 12);

  const papersByDay = Array.from(papersByDayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([day, count]) => ({ day, count }));

  const revenueByDay = Array.from(revenueByDayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([day, inr]) => ({ day, inr }));

  const revenueByReason = Array.from(revenueByReasonMap.entries())
    .map(([reason, v]) => ({ reason, inr: v.inr, count: v.count }))
    .sort((a, b) => b.inr - a.inr);

  // Most-recent papers with their name + how they were made.
  const recentPapers = paperRows
    .slice()
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 50)
    .map((p) => {
      const dbMethod = (p as { method?: string }).method;
      let method: "typed" | "scanned" | "ai_generated" | "ai_textbook" = "typed";
      if (dbMethod && ["typed", "scanned", "ai_generated", "ai_textbook"].includes(dbMethod)) {
        method = dbMethod as typeof method;
      } else if (scannedPaperIds.has(String(p.id))) {
        method = "scanned";
      }
      return {
        title: (p.title as string)?.trim() || "Untitled Paper",
        email: emailById.get(p.user_id) ?? String(p.user_id).slice(0, 8) + "…",
        method,
        created_at: String(p.created_at),
      };
    });

  // --- Failures in the paid paths ---
  const { data: errorRows } = await admin
    .from("error_log")
    .select("action, status, message, charged, context, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(40);

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentErrors = (errorRows ?? []).map((e) => ({
    action: String(e.action),
    status: Number(e.status) || 0,
    message: String(e.message),
    email: e.user_id ? emailById.get(String(e.user_id)) ?? "unknown" : "—",
    charged: Boolean(e.charged),
    context: (e.context ?? {}) as Record<string, unknown>,
    created_at: String(e.created_at),
  }));
  const errorsLast24h = recentErrors.filter(
    (e) => new Date(e.created_at).getTime() >= dayAgo
  ).length;

  // This table may not exist until migration 0016 is deployed. Treat that as
  // an empty dashboard section so the rest of admin remains usable during rollout.
  const { data: funnelRows } = await admin
    .from("funnel_events")
    .select("event")
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  const funnelMap = new Map<string, number>();
  for (const row of funnelRows ?? []) {
    const event = String(row.event);
    funnelMap.set(event, (funnelMap.get(event) ?? 0) + 1);
  }
  const funnelCounts = Array.from(funnelMap.entries())
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count);

  // --- Teacher Feedbacks ---
  const teacherFeedbacks: TeacherFeedbackItem[] = [];
  try {
    const { data: fbRows } = await admin
      .from("teacher_feedback")
      .select("id, user_id, email, paper_id, rating, expected_features, feedback_text, generation_method, status, credits_rewarded, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    for (const r of fbRows ?? []) {
      teacherFeedbacks.push({
        id: String(r.id),
        userId: r.user_id ? String(r.user_id) : null,
        email: r.email || "unknown",
        paperId: r.paper_id ? String(r.paper_id) : null,
        rating: typeof r.rating === "number" ? r.rating : null,
        expectedFeatures: Array.isArray(r.expected_features) ? r.expected_features : [],
        feedbackText: String(r.feedback_text || ""),
        method: String(r.generation_method || "ai_generated"),
        status: String(r.status || "pending"),
        creditsRewarded: Number(r.credits_rewarded) || 0,
        createdAt: String(r.created_at),
      });
    }
  } catch {
    // table might not exist yet
  }

  if (teacherFeedbacks.length === 0) {
    try {
      const { data: funnelFb } = await admin
        .from("funnel_events")
        .select("id, metadata, user_id, created_at")
        .eq("event", "teacher_feedback")
        .order("created_at", { ascending: false })
        .limit(30);

      for (const r of funnelFb ?? []) {
        const meta = (r.metadata ?? {}) as Record<string, unknown>;
        teacherFeedbacks.push({
          id: String(r.id),
          userId: r.user_id ? String(r.user_id) : null,
          email:
            (meta.email as string) ||
            (r.user_id ? emailById.get(String(r.user_id)) ?? "unknown" : "anonymous"),
          paperId: (meta.paper_id as string) || null,
          rating: typeof meta.rating === "number" ? meta.rating : null,
          expectedFeatures: Array.isArray(meta.expected_features) ? (meta.expected_features as string[]) : [],
          feedbackText: String(meta.feedback_text || ""),
          method: String(meta.method || "ai_generated"),
          status: String(meta.status || "pending"),
          creditsRewarded: 0,
          createdAt: String(r.created_at),
        });
      }
    } catch {
      // funnel_events fallback
    }
  }

  return {
    totals: {
      users: signups.length,
      papers: paperRows.length,
      revenueInr,
      payingCustomers: payingCustomers.size,
      creditsSpent,
      creditsGranted,
      scans,
    },
    topCreators,
    recentSignups,
    papersByDay,
    revenueByDay,
    revenueByReason,
    recentPapers,
    recentErrors,
    errorsLast24h,
    funnelCounts,
    teacherFeedbacks,
  };
}
