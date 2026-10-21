import { createAdminClient } from "@/lib/supabase/admin";
import { CREDIT_COSTS, type CreditAction } from "@/lib/credit-packs";
import { isSubscriptionCurrent } from "@/lib/plans";

// Re-export cost config (defined in the client-safe credit-packs module) so
// existing server callers can keep importing it from here.
export { CREDIT_COSTS };
export type { CreditAction };

// Free credits granted to every new signup (1 full paper trial = 20 credits).
export const SIGNUP_BONUS_CREDITS = 20;

export type Wallet = "personal" | "school";

export interface BalanceInfo {
  balance: number;
  wallet: Wallet;
  schoolId: string | null;
}

// Read a user's spendable balance: the school pool if they're a member, else
// their personal wallet. Uses the service-role client (RLS-bypassing) so this
// works from any server route.
export async function getBalance(userId: string): Promise<BalanceInfo> {
  const admin = createAdminClient();

  const { data: member } = await admin
    .from("school_members")
    .select("school_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (member?.school_id) {
    const { data: school } = await admin
      .from("schools")
      .select("credits_balance")
      .eq("id", member.school_id)
      .maybeSingle();
    return {
      balance: school?.credits_balance ?? 0,
      wallet: "school",
      schoolId: member.school_id,
    };
  }

  const { data: bal } = await admin
    .from("credit_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  return { balance: bal?.balance ?? 0, wallet: "personal", schoolId: null };
}

export interface SpendResult {
  ok: boolean;
  balanceAfter: number;
  wallet: Wallet;
}

// Escape hatch for a metering outage. Only the unpaid paths (no AI call behind
// them) may ever consult it — letting a paid path through uncharged turns this
// app into a free Claude proxy. Defaults to closed so a Supabase blip costs us
// nothing; an operator has to opt in with CREDITS_FAIL_OPEN=true.
export function creditsFailOpen(): boolean {
  return process.env.CREDITS_FAIL_OPEN === "true";
}

// The credit cost of an action, scaled by units (e.g. pages for a scan).
export function actionCost(action: CreditAction, units = 1): number {
  return CREDIT_COSTS[action] * units;
}

// Atomically spend the cost of an action. Row-locks the wallet in Postgres, so
// concurrent requests can't overdraw. Returns ok=false (no charge) when funds
// are short. `units` scales the cost (a scan charges per page). Pass a ref
// (e.g. paper id) for the audit ledger.
export async function spendCredits(
  userId: string,
  action: CreditAction,
  ref?: string,
  units = 1
): Promise<SpendResult> {
  return spendAmount(userId, actionCost(action, units), action, ref);
}

// Spend an explicit total in a single atomic call. Use when one teacher action
// has a compound cost (e.g. an AI run plus its photos): charging it as two
// spends can leave the second half unpaid if it fails.
export async function spendAmount(
  userId: string,
  cost: number,
  reason: string,
  ref?: string
): Promise<SpendResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("spend_credits", {
    p_user_id: userId,
    p_reason: reason,
    p_cost: cost,
    p_ref: ref ?? null,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: !!row?.ok,
    balanceAfter: row?.balance_after ?? 0,
    wallet: (row?.wallet as Wallet) ?? "personal",
  };
}

// Return the credits an action cost back to the user's wallet. Use when a paid
// action failed *after* it was charged (e.g. vision error post-deduction).
export async function refundCredits(
  userId: string,
  action: CreditAction,
  ref?: string
): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("grant_credits", {
    p_user_id: userId,
    p_amount: CREDIT_COSTS[action],
    p_reason: "refund",
    p_ref: ref ?? null,
  });
}

// Add credits to a user's wallet (top-ups, monthly refills). Wallet-aware:
// lands in the school pool if the user is a member, else personal.
export async function grantCredits(
  userId: string,
  amount: number,
  reason: string,
  ref?: string
): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("grant_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_ref: ref ?? null,
  });
}

// Add credits straight to a school pool (admin bulk purchase).
export async function addSchoolCredits(
  schoolId: string,
  amount: number,
  reason = "topup",
  ref?: string
): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("add_school_credits", {
    p_school_id: schoolId,
    p_amount: amount,
    p_reason: reason,
    p_ref: ref ?? null,
  });
}

// Whether a user counts as "paid" — output comes out clean (no watermark) once
// they have an active subscription, have ever bought credits, or belong to a
// school whose pool was funded. Signup-bonus-only accounts are NOT paid, so
// free/farmed papers stay watermarked. Comp emails (env COMP_EMAILS, comma-
// separated) are always treated as paid — used to whitelist owner/demo accounts.
export async function isPaidUser(
  userId: string,
  email?: string | null
): Promise<boolean> {
  const comp = (process.env.COMP_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (email && comp.includes(email.toLowerCase())) return true;

  const admin = createAdminClient();

  // Active subscription whose paid period is still running. The date check
  // matters: a missed renewal webhook leaves status at "active" indefinitely.
  const { data: sub } = await admin
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (isSubscriptionCurrent(sub)) return true;

  // School member whose shared pool was ever funded?
  const { data: mem } = await admin
    .from("school_members")
    .select("school_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (mem?.school_id) {
    const { data: schoolPaid } = await admin
      .from("credit_ledger")
      .select("id")
      .eq("school_id", mem.school_id)
      .eq("reason", "topup")
      .limit(1)
      .maybeSingle();
    if (schoolPaid) return true;
  }

  // Ever bought credits personally (one-time pack or monthly refill)?
  const { data: paidRow } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("user_id", userId)
    .in("reason", ["topup", "monthly_refill"])
    .limit(1)
    .maybeSingle();
  return !!paidRow;
}

// Idempotency guard for webhooks: has a credit movement with this ref (e.g. a
// Razorpay payment id) already been recorded? Prevents double-granting on
// webhook retries.
export async function ledgerRefExists(ref: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("ref", ref)
    .limit(1)
    .maybeSingle();
  return !!data;
}
