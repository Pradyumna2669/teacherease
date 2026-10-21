import type { SupabaseClient } from "@supabase/supabase-js";
import { isSubscriptionCurrent } from "@/lib/plans";

// Subscription state for a teacher. With the credits model, an active
// subscription's job is to grant monthly credits (see the Razorpay webhook) —
// usage itself is metered in credits, not gated by this row.
export interface SubscriptionRow {
  user_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
}

// Read a user's subscription via any authed client (RLS allows own row).
export async function getSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionRow | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id, plan, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as SubscriptionRow) ?? null;
}

// Active *and* still inside the paid period — see isSubscriptionCurrent.
export function isActive(sub: SubscriptionRow | null): boolean {
  return isSubscriptionCurrent(sub);
}
