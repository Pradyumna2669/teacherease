import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Get in touch with the ${SITE_NAME} team.`,
};

export default function ContactPage() {
  return (
    <LegalShell title="Contact Us" updated="26 June 2026">
      <p>
        We&rsquo;re happy to help with anything — accounts, credits, payments, or
        feedback. The fastest way to reach us is email.
      </p>

      <h2>Email</h2>
      <p>
        <a href="mailto:pradyumnagkulkarni93@gmail.com">pradyumnagkulkarni93@gmail.com</a>{" "}
        — we reply within 1–2 working days.
      </p>

      <h2>Phone</h2>
      <p>+91 74995 25969 (Mon–Sat, 10am–6pm IST)</p>

      <h2>Business details</h2>
      <p>
        <strong>SthiraHost</strong>
        <br />
        Vimaco Enclave, Camp
        <br />
        Amravati, Maharashtra 444602, India
      </p>

      <h2>For billing &amp; refunds</h2>
      <p>
        See our <a href="/refund">Refund &amp; Cancellation Policy</a>, then email
        us from your registered account with the transaction details.
      </p>
    </LegalShell>
  );
}
