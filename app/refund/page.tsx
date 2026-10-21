import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: `Refund and cancellation terms for ${SITE_NAME} credits and subscriptions.`,
};

export default function RefundPage() {
  return (
    <LegalShell title="Refund & Cancellation Policy" updated="26 June 2026">
      <p>
        {SITE_NAME} sells <strong>digital credits</strong> used to create and scan
        question papers. Because credits are delivered instantly and consumed as a
        digital service, this policy explains when refunds and cancellations apply.
      </p>

      <h2>1. Credit packs (one-time)</h2>
      <ul>
        <li>Credits are added to your account immediately after payment.</li>
        <li><strong>Used credits are non-refundable</strong>, as the service has already been delivered.</li>
        <li><strong>Unused credits</strong> from a pack may be refunded if you request it within <strong>7 days</strong> of purchase and the credits have not been used. We refund to the original payment method.</li>
      </ul>

      <h2>2. Subscription plans</h2>
      <ul>
        <li>You can <strong>cancel anytime</strong> from your account or by contacting us. Cancellation stops future renewals.</li>
        <li>On cancellation you keep access and any credits already granted until the end of the current billing cycle.</li>
        <li>We do not provide pro-rated refunds for the current cycle once it has been charged, unless required by law.</li>
      </ul>

      <h2>3. Failed or duplicate payments</h2>
      <ul>
        <li>If you were charged but credits were not added, contact us — we will add the credits or refund the charge.</li>
        <li>Accidental duplicate charges are fully refunded.</li>
        <li>Payments that fail at the bank/UPI step are auto-reversed by the payment provider, usually within 5–7 working days.</li>
      </ul>

      <h2>4. How to request a refund</h2>
      <p>
        Email <a href="mailto:pradyumnagkulkarni93@gmail.com">pradyumnagkulkarni93@gmail.com</a> from your
        registered email with your transaction details (date, amount, payment
        reference). We respond within <strong>3 working days</strong>. Approved
        refunds are processed to the original payment method, typically within{" "}
        <strong>5–7 working days</strong> via our payment partner (Razorpay).
      </p>

      <h2>5. Free credits</h2>
      <p>
        Signup-bonus and promotional credits are free and carry no monetary value;
        they are not refundable or exchangeable for cash.
      </p>

      <h2>6. Contact</h2>
      <p>
        For any billing concern, see our <a href="/contact">Contact page</a> or
        email <a href="mailto:pradyumnagkulkarni93@gmail.com">pradyumnagkulkarni93@gmail.com</a>.
      </p>
    </LegalShell>
  );
}
