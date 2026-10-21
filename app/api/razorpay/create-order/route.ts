import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPack, packPriceInr, schoolCreditCostInr } from "@/lib/credit-packs";

// Creates a one-time Razorpay Order for a credit top-up — either a personal
// pack or a bulk school purchase. The browser opens Checkout with the returned
// order id; the `order.paid` webhook grants the credits. Order notes carry the
// mapping (user/school + credit amount) so the webhook is self-contained.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  packId?: string; // personal top-up pack id
  schoolId?: string; // present => bulk school purchase
  credits?: number; // school purchases specify an arbitrary credit quantity
}

const MIN_SCHOOL_CREDITS = 1000; // schools buy in bulk

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

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Resolve amount (paise) + credit grant + notes server-side. Never trust a
  // client-sent price.
  let amountPaise: number;
  let credits: number;
  let notes: Record<string, string>;
  let description: string;

  if (body.schoolId) {
    // --- Bulk school purchase: caller must be the school's admin. ---
    const credAmount = Math.floor(Number(body.credits) || 0);
    if (credAmount < MIN_SCHOOL_CREDITS) {
      return NextResponse.json(
        { error: `Minimum bulk purchase is ${MIN_SCHOOL_CREDITS} credits.` },
        { status: 400 }
      );
    }
    const admin = createAdminClient();
    const { data: school } = await admin
      .from("schools")
      .select("id, admin_user_id, name")
      .eq("id", body.schoolId)
      .maybeSingle();
    if (!school || school.admin_user_id !== user.id) {
      return NextResponse.json(
        { error: "Only the school admin can buy pool credits." },
        { status: 403 }
      );
    }
    amountPaise = Math.round(schoolCreditCostInr(credAmount) * 100);
    credits = credAmount;
    notes = {
      kind: "school_topup",
      school_id: school.id,
      user_id: user.id,
      credits: String(credits),
    };
    description = `${school.name} — ${credits} pool credits`;
  } else {
    // --- Personal top-up pack. ---
    const pack = body.packId ? getPack(body.packId) : null;
    if (!pack) {
      return NextResponse.json({ error: "Unknown pack." }, { status: 400 });
    }
    amountPaise = Math.round(packPriceInr(pack) * 100);
    credits = pack.credits;
    notes = {
      kind: "topup",
      user_id: user.id,
      credits: String(credits),
      pack_id: pack.id,
    };
    description = `${pack.name} — ${credits} credits`;
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", notes }),
    });
    const order = await res.json();
    if (!res.ok || !order.id) {
      const msg = order?.error?.description || "Could not start checkout.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    return NextResponse.json({
      orderId: order.id,
      amount: amountPaise,
      keyId,
      credits,
      description,
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
