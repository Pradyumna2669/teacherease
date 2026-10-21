import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanId } from "@/lib/plans";
import { planCredits } from "@/lib/credit-packs";

// Creates a Razorpay subscription for the signed-in teacher and returns its id
// so the browser can open Razorpay Checkout. A `pending` row is written so the
// webhook can map the subscription back to this user.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Billing cycles to schedule. Razorpay requires a finite count; this is "renew
// for ~10 years", effectively ongoing until cancelled.
const TOTAL_COUNT: Record<string, number> = {
  teacher_monthly: 120,
  teacher_annual: 10,
  school: 120,
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Payments are not configured yet." },
      { status: 503 }
    );
  }

  let planId: PlanId;
  try {
    ({ planId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const plan = PLANS[planId];
  if (!plan || !plan.razorpayPlanEnv) {
    return NextResponse.json({ error: "Unknown or free plan." }, { status: 400 });
  }
  // A plan the webhook grants no credits for would charge the card every month
  // and hand back nothing. PLANS.school is in that state — it has no entry in
  // CREDIT_PLANS — so it must not reach Checkout.
  if (planCredits(planId) <= 0) {
    return NextResponse.json(
      { error: "This plan is not available yet." },
      { status: 400 }
    );
  }
  const razorpayPlanId = process.env[plan.razorpayPlanEnv];
  if (!razorpayPlanId) {
    return NextResponse.json(
      { error: `Plan not configured (${plan.razorpayPlanEnv}).` },
      { status: 503 }
    );
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  try {
    const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: razorpayPlanId,
        total_count: TOTAL_COUNT[planId] ?? 12,
        customer_notify: 1,
        // notes ride along on every webhook payload — used to map back to user.
        notes: { user_id: user.id, plan: planId, email: user.email ?? "" },
      }),
    });

    const sub = await res.json();
    if (!res.ok || !sub.id) {
      const msg = sub?.error?.description || "Could not start subscription.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    // Pre-seed a pending row so the webhook (and the app) can find this user
    // by razorpay_subscription_id immediately.
    try {
      const admin = createAdminClient();
      await admin.from("subscriptions").upsert(
        {
          user_id: user.id,
          plan: planId,
          status: "pending",
          razorpay_subscription_id: sub.id,
        },
        { onConflict: "user_id" }
      );
    } catch {
      /* non-fatal: webhook can still map via notes.user_id */
    }

    return NextResponse.json({
      subscriptionId: sub.id,
      keyId, // publishable key id for Checkout
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
