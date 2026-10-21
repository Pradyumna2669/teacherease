import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRazorpayStatus } from "@/lib/plans";
import { planCredits, razorpayRef } from "@/lib/credit-packs";
import {
  grantCredits,
  addSchoolCredits,
  ledgerRefExists,
} from "@/lib/credits";
import { logError } from "@/lib/error-log";
import { recordFunnelEvent } from "@/lib/funnel-events";

// Razorpay webhook. Verifies the HMAC signature, then:
//   - order.paid           -> grant top-up credits (personal pack or school pool)
//   - subscription.charged -> grant the plan's monthly credits + mark active
//   - subscription.halted  -> retries exhausted: cancel, so no further credits
//   - subscription.*       -> mirror subscription status into `subscriptions`
//
// Credits are granted ONLY on subscription.charged, which Razorpay emits after
// it has actually collected the money. A renewal that fails therefore grants
// nothing, and once Razorpay gives up (halted) we cancel the row so the next
// month cannot credit either. Grants are idempotent: every grant carries a ref
// keyed on the Razorpay payment id, and a unique index on credit_ledger.ref
// makes the ledger insert itself reject a retry (0012), so concurrent retries
// cannot double-credit. The lookup below is only a cheap early-out.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RzpSubscriptionEntity {
  id: string;
  status: string;
  current_end?: number; // unix seconds
  notes?: { user_id?: string; plan?: string };
}
interface RzpOrderEntity {
  id: string;
  notes?: Record<string, string>;
}
interface RzpPaymentEntity {
  id: string;
}

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  // Must hash the *raw* body — re-serializing JSON would change the bytes.
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: {
      subscription?: { entity?: RzpSubscriptionEntity };
      order?: { entity?: RzpOrderEntity };
      payment?: { entity?: RzpPaymentEntity };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  }

  const eventType = event.event || "";
  const paymentId = event.payload?.payment?.entity?.id;

  try {
    // ---- One-time top-ups (credit packs + school bulk) -------------------
    if (eventType === "order.paid") {
      const notes = event.payload?.order?.entity?.notes;
      const credits = Number(notes?.credits || 0);
      if (!notes || credits <= 0) {
        return NextResponse.json({ received: true, mapped: false });
      }
      // Without an id there is nothing to make the grant idempotent against, so
      // refuse rather than credit a payment we could never recognise again.
      const rzpId = paymentId || event.payload?.order?.entity?.id;
      if (!rzpId) {
        return NextResponse.json({ received: true, mapped: false });
      }
      const ref = razorpayRef(rzpId);
      if (await ledgerRefExists(ref)) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      if (notes.kind === "school_topup" && notes.school_id) {
        await addSchoolCredits(notes.school_id, credits, "topup", ref);
        await recordFunnelEvent("payment_completed", notes.user_id || null, {
          planId: "school_topup",
          amountInr: Number(notes.amount_inr) || undefined,
        });
      } else if (notes.user_id) {
        await grantCredits(notes.user_id, credits, "topup", ref);
        await recordFunnelEvent("payment_completed", notes.user_id, {
          packId: notes.pack_id,
          amountInr: Number(notes.amount_inr) || undefined,
        });
      } else {
        return NextResponse.json({ received: true, mapped: false });
      }
      return NextResponse.json({ received: true, granted: credits });
    }

    // ---- Subscription events --------------------------------------------
    const entity = event.payload?.subscription?.entity;
    if (!entity || !entity.id) {
      return NextResponse.json({ received: true });
    }

    const status = mapRazorpayStatus(entity.status);
    const userId = entity.notes?.user_id;
    const plan = entity.notes?.plan;
    const currentPeriodEnd = entity.current_end
      ? new Date(entity.current_end * 1000).toISOString()
      : null;

    const admin = createAdminClient();

    // Mirror subscription status into `subscriptions`.
    const patch: Record<string, unknown> = {
      status,
      razorpay_subscription_id: entity.id,
    };
    if (plan) patch.plan = plan;
    if (currentPeriodEnd) patch.current_period_end = currentPeriodEnd;

    const { data: existing } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("razorpay_subscription_id", entity.id)
      .maybeSingle();

    let mappedUserId = existing?.user_id || userId || null;
    if (existing?.user_id) {
      await admin
        .from("subscriptions")
        .update(patch)
        .eq("razorpay_subscription_id", entity.id);
    } else if (userId) {
      await admin
        .from("subscriptions")
        .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
    }

    // Money actually collected — grant this period's credits (idempotent).
    if (eventType === "subscription.charged" && mappedUserId && plan) {
      const credits = planCredits(plan);
      const ref = razorpayRef(
        paymentId || `${entity.id}:${entity.current_end ?? ""}`
      );
      if (credits > 0 && !(await ledgerRefExists(ref))) {
        await grantCredits(mappedUserId, credits, "monthly_refill", ref);
        await recordFunnelEvent("payment_completed", mappedUserId, { planId: plan });
      }
    }

    // Razorpay has exhausted its retries. Cancel so the subscription cannot
    // quietly resume and so nothing credits next month. Razorpay has already
    // stopped charging at this point; this makes our side agree.
    if (eventType === "subscription.halted") {
      await admin
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("razorpay_subscription_id", entity.id);
      await logError({
        action: "subscription_renewal",
        status: 402,
        message: "Renewal failed after retries — subscription cancelled, no credits granted.",
        userId: mappedUserId,
        context: { subscriptionId: entity.id, plan: plan ?? null, rzpStatus: entity.status },
      });
    }

    // A failed charge that Razorpay will retry. No credits, and access is
    // already withheld because "pending" is not an active status.
    if (eventType === "subscription.pending") {
      await logError({
        action: "subscription_renewal",
        status: 402,
        message: "Renewal payment failed — Razorpay will retry. No credits granted.",
        userId: mappedUserId,
        context: { subscriptionId: entity.id, plan: plan ?? null, rzpStatus: entity.status },
      });
    }

    return NextResponse.json({ received: true, event: eventType });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "db error";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
