import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBalance, isPaidUser } from "@/lib/credits";

// Returns the signed-in user's spendable credit balance (personal wallet, or
// their school pool if they're a member). Used by the dashboard + builder to
// show the live balance and low-credit warnings.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const { balance, wallet, schoolId } = await getBalance(user.id);
    const paid = await isPaidUser(user.id, user.email);
    return NextResponse.json({ balance, wallet, schoolId, paid });
  } catch {
    // Credits tables not set up yet — report unknown rather than 500. Default
    // paid=false so output stays watermarked until we can confirm payment.
    return NextResponse.json({
      balance: null,
      wallet: "personal",
      schoolId: null,
      paid: false,
    });
  }
}
