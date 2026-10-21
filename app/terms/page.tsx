import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `Terms and conditions for using ${SITE_NAME}.`,
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms & Conditions" updated="26 June 2026">
      <p>
        These Terms govern your use of {SITE_NAME} (the &ldquo;Service&rdquo;), a
        web application that helps teachers build and digitise exam question
        papers. By creating an account or using the Service you agree to these
        Terms. If you do not agree, please do not use the Service.
      </p>
      <p>
        The Service is operated by <strong>SthiraHost</strong>
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;), based in India. Contact:{" "}
        <a href="mailto:pradyumnagkulkarni93@gmail.com">pradyumnagkulkarni93@gmail.com</a>.
      </p>

      <h2>1. Your account</h2>
      <p>
        You must provide accurate details and keep your login secure. You are
        responsible for activity under your account. The Service is intended for
        teachers and education professionals.
      </p>

      <h2>2. Credits &amp; payments</h2>
      <ul>
        <li>Paid features run on <strong>credits</strong>. You buy credits in one-time packs, or receive them through a subscription plan.</li>
        <li>Prices are shown on our pricing page in Indian Rupees (INR) and may change; changes do not affect credits already purchased.</li>
        <li>Credits are tied to your account, are <strong>non-transferable</strong>, and have no cash value.</li>
        <li>Payments are processed by our payment partner (Razorpay). We do not store your card or bank details.</li>
        <li>Refunds and cancellations are governed by our <a href="/refund">Refund &amp; Cancellation Policy</a>.</li>
      </ul>

      <h2>3. Your content</h2>
      <p>
        You retain ownership of the question papers and content you create or
        upload. You grant us a limited licence to store and process your content
        solely to operate the Service (for example, to run handwriting scans and
        save your papers). You are responsible for the content you create and for
        having the rights to any material you upload.
      </p>

      <h2>4. Acceptable use</h2>
      <p>
        Do not misuse the Service: no unlawful content, no attempts to break,
        overload, or reverse-engineer the Service, and no sharing of one account
        in a way that abuses free credits. We may suspend accounts that breach
        these Terms.
      </p>

      <h2>5. Service availability</h2>
      <p>
        We work to keep the Service available but provide it on an &ldquo;as
        is&rdquo; basis without warranties. Features may change or be discontinued.
      </p>

      <h2>6. Limitation of liability</h2>
      <p>
        To the extent permitted by law, we are not liable for indirect or
        consequential losses. Our total liability for any claim is limited to the
        amount you paid us in the three months before the claim.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or close
        accounts that breach these Terms. Unused credits may be forfeited on
        closure for breach.
      </p>

      <h2>8. Governing law</h2>
      <p>
        These Terms are governed by the laws of India, with exclusive
        jurisdiction of the courts at <strong>Amravati, Maharashtra</strong>.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these Terms; the &ldquo;last updated&rdquo; date above will
        change. Continued use after an update means you accept the revised Terms.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions? See our <a href="/contact">Contact page</a> or email{" "}
        <a href="mailto:pradyumnagkulkarni93@gmail.com">pradyumnagkulkarni93@gmail.com</a>.
      </p>
    </LegalShell>
  );
}
