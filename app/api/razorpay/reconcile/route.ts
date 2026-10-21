import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { planCredits, razorpayRef } from "@/lib/credit-packs";
import { grantCredits, addSchoolCredits } from "@/lib/credits";

// Replays payments Razorpay captured but whose webhook never landed.
//
// A dropped webhook (or one that 500'd on its last retry) means a teacher paid
// and got nothing, and we only find out when they complain. This walks the
// payments Razorpay actually captured in the last WINDOW_HOURS and grants any
// that have no matching credit_ledger row.
//
// Safe to run repeatedly and safe to race the real webhook: the grant RPCs key
// on credit_ledger's unique ref index (migration 0012), so a payment already
// credited is a swallowed no-op, not a second grant.
//
// Two ways in:
//   GET  — Vercel cron, once a day (see vercel.json). Sweeps every payment.
//          Daily rather than quarter-hourly because the project is on a Hobby
//          plan, where more frequent crons are rejected at deploy time.
//   POST — a signed-in teacher pressing "I paid but have no credits". Same
//          sweep, restricted to her own payments, so she is never waiting on
//          tomorrow's cron for money she has already spent.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A backlog needs several Razorpay round-trips per payment; the 10s default
// would cut the sweep short and leave the tail unreconciled until the next run.
export const maxDuration = 60;

const WINDOW_HOURS = 48;
const PAGE = 100;
const MAX_PAGES = 5; // 500 payments per sweep is far beyond current volume
const LEDGER_LOOKUP_CHUNK = 50; // keep the PostgREST `in` filter out of URL limits

interface RzpPayment {
  id: string;
  status: string;
  order_id?: string | null;
  invoice_id?: string | null;
}

interface SweepResult {
  scanned: number;
  replayed: number;
  credits: number;
  unmapped: number;
  failed: number;
}

// Vercel sends `Authorization: Bearer $CRON_SECRET` on cron invocations.
function fromCron(req: NextRequest, secret: string): boolean {
  const header = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  return (
    header.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  );
}

// onlyUserId restricts the sweep to one teacher's payments. Anything that maps
// to somebody else is skipped silently rather than counted as unmapped — from
// her point of view those payments simply are not hers.
async function sweep(
  auth: string,
  onlyUserId?: string
): Promise<SweepResult> {
  const rzp = async <T>(path: string): Promise<T | null> => {
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  };

  const to = Math.floor(Date.now() / 1000);
  const from = to - WINDOW_HOURS * 3600;

  // 1. Money actually collected in the window. "captured" only: an authorized
  //    payment was never taken, and a refunded one must not be re-credited.
  const captured: RzpPayment[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await rzp<{ items?: RzpPayment[] }>(
      `/payments?from=${from}&to=${to}&count=${PAGE}&skip=${page * PAGE}`
    );
    const items = batch?.items ?? [];
    captured.push(...items.filter((p) => p.status === "captured"));
    if (items.length < PAGE) break;
  }
  if (!captured.length) {
    return { scanned: 0, replayed: 0, credits: 0, unmapped: 0, failed: 0 };
  }

  // 2. Which of those already reached the ledger? One query per chunk rather
  //    than one per payment.
  const admin = createAdminClient();
  const granted = new Set<string>();
  for (let i = 0; i < captured.length; i += LEDGER_LOOKUP_CHUNK) {
    const refs = captured
      .slice(i, i + LEDGER_LOOKUP_CHUNK)
      .map((p) => razorpayRef(p.id));
    const { data } = await admin
      .from("credit_ledger")
      .select("ref")
      .in("ref", refs);
    for (const row of data ?? []) granted.add(row.ref as string);
  }

  const replayed: { payment: string; credits: number; reason: string }[] = [];
  let unmapped = 0;
  let failed = 0;

  for (const payment of captured) {
    const ref = razorpayRef(payment.id);
    if (granted.has(ref)) continue;

    try {
      if (payment.invoice_id) {
        // Subscription charge: invoice -> subscription -> notes, the same
        // mapping subscription.charged would have carried.
        const invoice = await rzp<{ subscription_id?: string }>(
          `/invoices/${payment.invoice_id}`
        );
        const sub = invoice?.subscription_id
          ? await rzp<{ notes?: { user_id?: string; plan?: string } }>(
              `/subscriptions/${invoice.subscription_id}`
            )
          : null;
        const userId = sub?.notes?.user_id;
        const credits = planCredits(sub?.notes?.plan || "");
        if (!userId || credits <= 0) {
          unmapped++;
          continue;
        }
        if (onlyUserId && userId !== onlyUserId) continue;
        await grantCredits(userId, credits, "monthly_refill", ref);
        replayed.push({ payment: payment.id, credits, reason: "monthly_refill" });
      } else if (payment.order_id) {
        // One-time top-up: the order notes carry user/school + credit count.
        const order = await rzp<{ notes?: Record<string, string> }>(
          `/orders/${payment.order_id}`
        );
        const notes = order?.notes;
        const credits = Number(notes?.credits || 0);
        if (!notes || credits <= 0) {
          unmapped++;
          continue;
        }
        // School pools are bought by a person, and that person's id is what a
        // self-serve replay is allowed to match on.
        if (onlyUserId && notes.user_id !== onlyUserId) continue;
        if (notes.kind === "school_topup" && notes.school_id) {
          await addSchoolCredits(notes.school_id, credits, "topup", ref);
        } else if (notes.user_id) {
          await grantCredits(notes.user_id, credits, "topup", ref);
        } else {
          unmapped++;
          continue;
        }
        replayed.push({ payment: payment.id, credits, reason: "topup" });
      } else {
        unmapped++;
      }
    } catch (err) {
      // One bad payment must not abandon the rest of the sweep; the next run
      // picks it up again while it is still inside the window.
      console.error("[reconcile] could not replay payment", payment.id, err);
      failed++;
    }
  }

  // Loud on purpose: every replay here is a webhook we never received.
  if (replayed.length) {
    console.warn(
      `[reconcile] replayed ${replayed.length} missed grant(s)`,
      replayed
    );
  }

  return {
    scanned: captured.length,
    replayed: replayed.length,
    credits: replayed.reduce((sum, r) => sum + r.credits, 0),
    unmapped,
    failed,
  };
}

// Razorpay credentials, or null when payments are not configured yet.
function razorpayAuth(): string | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Reconciliation is not configured." },
      { status: 503 }
    );
  }
  if (!fromCron(req, cronSecret)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }

  const auth = razorpayAuth();
  if (!auth) {
    return NextResponse.json(
      { error: "Payments are not configured yet." },
      { status: 503 }
    );
  }

  try {
    return NextResponse.json(await sweep(auth));
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Reconcile failed.";
    console.error("[reconcile]", detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}

// "I paid but have no credits." Scoped to the caller, so it is safe to expose
// and cannot be used to drive somebody else's grants.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const auth = razorpayAuth();
  if (!auth) {
    return NextResponse.json(
      { error: "Payments are not configured yet." },
      { status: 503 }
    );
  }

  try {
    const result = await sweep(auth, user.id);
    return NextResponse.json({
      replayed: result.replayed,
      credits: result.credits,
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Reconcile failed.";
    console.error("[reconcile:self]", detail);
    return NextResponse.json(
      { error: "We could not check your payments just now. Try again shortly." },
      { status: 500 }
    );
  }
}
