// Subscription plans for TeacherEase. Prices in INR. The Razorpay plan IDs are
// created once in the Razorpay dashboard (Subscriptions -> Plans) and wired in
// via env so code stays the same across test/live.

export type PlanId = "free" | "teacher_monthly" | "teacher_annual" | "school";

export interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string; // human display
  amountInr: number; // for reference / display only
  period: "month" | "year" | "seat";
  // Razorpay plan id env var name (undefined for the free plan).
  razorpayPlanEnv?: string;
  features: string[];
  highlight?: boolean;
}

// Free-tier limits (enforced server-side via usage_counters).
export const FREE_PAPERS_PER_MONTH = 1;
export const FREE_SCANS_PER_MONTH = 1;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "₹0",
    amountInr: 0,
    period: "month",
    features: [
      "1 paper trial",
      "All question types",
      "Ad-supported download",
      "Watermark on PDF",
    ],
  },
  teacher_monthly: {
    id: "teacher_monthly",
    name: "Teacher",
    priceLabel: "₹99",
    amountInr: 99,
    period: "month",
    razorpayPlanEnv: "RAZORPAY_PLAN_TEACHER_MONTHLY",
    highlight: true,
    features: [
      "Unlimited papers",
      "Unlimited handwriting scans",
      "Zero ads & instant download",
      "No footer / watermark",
      "Priority support",
    ],
  },
  teacher_annual: {
    id: "teacher_annual",
    name: "Teacher (Annual)",
    priceLabel: "₹499",
    amountInr: 499,
    period: "year",
    razorpayPlanEnv: "RAZORPAY_PLAN_TEACHER_ANNUAL",
    features: [
      "Everything in Teacher",
      "Full academic year",
      "Best value",
    ],
  },
  school: {
    id: "school",
    name: "School",
    priceLabel: "₹49",
    amountInr: 49,
    period: "seat",
    razorpayPlanEnv: "RAZORPAY_PLAN_SCHOOL",
    features: [
      "Per teacher / month",
      "Shared question bank",
      "Admin dashboard",
      "Min 10 seats",
    ],
  },
};

// Statuses that count as "paid & usable". Note this is necessary but NOT
// sufficient — see isSubscriptionCurrent(), which also requires the paid period
// to still be running. A row can sit at "active" long after its period ended if
// a renewal webhook never arrived.
export const ACTIVE_STATUSES = ["active"];

// How long past current_period_end we keep honouring a subscription, to absorb
// webhook lag between Razorpay charging and us hearing about it.
export const RENEWAL_GRACE_DAYS = 3;

/**
 * True only when the subscription is active AND its paid period has not run
 * out. Without the date check, a missed renewal webhook leaves a teacher on the
 * paid tier permanently.
 */
export function isSubscriptionCurrent(sub: {
  status: string;
  current_period_end: string | null;
} | null): boolean {
  if (!sub || !ACTIVE_STATUSES.includes(sub.status)) return false;
  // No period recorded yet — trust the status until the first renewal sets one.
  if (!sub.current_period_end) return true;
  const end = new Date(sub.current_period_end).getTime();
  if (Number.isNaN(end)) return true;
  return Date.now() <= end + RENEWAL_GRACE_DAYS * 24 * 60 * 60 * 1000;
}

export function isPaidPlan(plan: string): boolean {
  return plan !== "free";
}

// Map a Razorpay subscription status to our internal status.
export function mapRazorpayStatus(rzpStatus: string): string {
  switch (rzpStatus) {
    case "active":
      return "active";
    // "authenticated" means the mandate is registered but no money has been
    // taken yet. Treating it as active handed the paid tier to anyone who
    // authorised a card whose first charge then failed.
    case "authenticated":
      return "pending";
    case "halted":
    case "paused":
      return "halted";
    case "cancelled":
    case "expired":
    case "completed":
      return "cancelled";
    case "created":
    case "pending":
      return "pending";
    default:
      return "inactive";
  }
}
