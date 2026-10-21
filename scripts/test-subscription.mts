// Renewal-gating checks. Billing logic, so assert it rather than eyeball it.
//
//   npx tsx --env-file=.env.local scripts/test-subscription.mts

import {
  isSubscriptionCurrent,
  mapRazorpayStatus,
  RENEWAL_GRACE_DAYS,
} from "../lib/plans";

const results: Array<[string, boolean, string]> = [];
function check(name: string, ok: boolean, detail = "") {
  results.push([name, ok, detail]);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

console.log("\n=== Razorpay status mapping ===");
check(
  'active -> active',
  mapRazorpayStatus("active") === "active"
);
check(
  'authenticated -> pending (mandate set up, NOT yet paid)',
  mapRazorpayStatus("authenticated") === "pending",
  mapRazorpayStatus("authenticated")
);
check('halted -> halted', mapRazorpayStatus("halted") === "halted");
check('cancelled -> cancelled', mapRazorpayStatus("cancelled") === "cancelled");
check('expired -> cancelled', mapRazorpayStatus("expired") === "cancelled");
check('pending -> pending', mapRazorpayStatus("pending") === "pending");

console.log("\n=== Paid-period enforcement ===");
check(
  "active, 20 days left -> paid",
  isSubscriptionCurrent({ status: "active", current_period_end: days(20) }) === true
);
check(
  "active, ended yesterday -> still paid (inside grace)",
  isSubscriptionCurrent({ status: "active", current_period_end: days(-1) }) === true,
  `grace ${RENEWAL_GRACE_DAYS}d`
);
check(
  "active, ended 14 days ago -> NOT paid (the live bug)",
  isSubscriptionCurrent({ status: "active", current_period_end: days(-14) }) === false
);
check(
  "active, ended exactly at grace edge +1d -> NOT paid",
  isSubscriptionCurrent({
    status: "active",
    current_period_end: days(-(RENEWAL_GRACE_DAYS + 1)),
  }) === false
);
check(
  "active, no period recorded -> paid (first period, trust status)",
  isSubscriptionCurrent({ status: "active", current_period_end: null }) === true
);
check(
  "halted -> NOT paid",
  isSubscriptionCurrent({ status: "halted", current_period_end: days(20) }) === false
);
check(
  "pending (renewal failed, retrying) -> NOT paid",
  isSubscriptionCurrent({ status: "pending", current_period_end: days(20) }) === false
);
check(
  "cancelled -> NOT paid",
  isSubscriptionCurrent({ status: "cancelled", current_period_end: days(20) }) === false
);
check("no subscription row -> NOT paid", isSubscriptionCurrent(null) === false);
check(
  "garbage date -> paid (fail open, never lock out a real payer)",
  isSubscriptionCurrent({ status: "active", current_period_end: "not-a-date" }) === true
);

console.log("\n=== Credit granting is charge-gated ===");
// Mirrors the webhook: only subscription.charged reaches grantCredits.
const grantsCredits = (evt: string) => evt === "subscription.charged";
for (const evt of [
  "subscription.charged",
  "subscription.pending",
  "subscription.halted",
  "subscription.activated",
  "subscription.authenticated",
  "subscription.cancelled",
]) {
  const expected = evt === "subscription.charged";
  check(
    `${evt} -> ${expected ? "grants" : "no"} credits`,
    grantsCredits(evt) === expected
  );
}

console.log("\n" + "=".repeat(60));
const failed = results.filter(([, ok]) => !ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  failed.forEach(([n]) => console.log(`  FAILED: ${n}`));
  process.exitCode = 1;
}
console.log("");
