import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses, and protects your data.`,
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="26 June 2026">
      <p>
        This policy explains what {SITE_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;)
        collects, why, and your choices. It applies to the {SITE_NAME} website and
        app, operated by <strong>SthiraHost</strong>, India.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — your email address and authentication details, to create and secure your account.</li>
        <li><strong>Your content</strong> — the question papers you build, and the photos you upload for handwriting scans.</li>
        <li><strong>Usage &amp; billing</strong> — credit balance, transactions, and basic logs needed to run and protect the Service.</li>
      </ul>
      <p>
        We do <strong>not</strong> collect or store your card, UPI, or bank
        details — payments are handled entirely by our payment partner.
      </p>

      <h2>2. How we use your data</h2>
      <ul>
        <li>To provide the Service — save your papers, run scans, manage credits.</li>
        <li>To process payments and prevent abuse or fraud.</li>
        <li>To contact you about your account or important changes.</li>
      </ul>

      <h2>3. Service providers we share with</h2>
      <p>We use trusted providers to run the Service; they process data only on our behalf:</p>
      <ul>
        <li><strong>Supabase</strong> — secure database and authentication (account &amp; paper storage).</li>
        <li><strong>Razorpay</strong> — payment processing. They handle your payment details under their own privacy policy.</li>
        <li><strong>Google (Gemini)</strong> — when you scan a handwritten paper, the photo is sent to Google&rsquo;s AI service to read the questions. Don&rsquo;t upload sensitive personal information in scans.</li>
        <li><strong>Vercel</strong> — hosting of the website and app.</li>
      </ul>

      <h2>4. Data retention</h2>
      <p>
        We keep your account and content while your account is active. You can
        delete your papers at any time. Contact us to delete your account and
        associated data.
      </p>

      <h2>5. Who can see your papers</h2>
      <p>
        Your papers are yours. Other teachers cannot see them, and we do not
        sell, publish or share them.
      </p>
      <p>
        Our own staff can open a paper in a private admin tool, and sometimes
        need to — a question that prints wrongly or a scan that comes back
        garbled usually cannot be diagnosed without looking at the paper that
        produced it. Every such view is recorded against the staff member&rsquo;s
        email address. If you want to know whether your paper has ever been
        opened this way, email us and we will tell you.
      </p>

      <h2>6. Security</h2>
      <p>
        We use industry-standard measures (encrypted connections, access
        controls, row-level security) to protect your data. No system is
        perfectly secure, but we work to keep your information safe.
      </p>

      <h2>7. Your rights</h2>
      <p>
        You can access, correct, or delete your data. Email us and we will help.
      </p>

      <h2>8. Children</h2>
      <p>
        The Service is intended for teachers and adults. It is not directed at
        children, and we do not knowingly collect data from children.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy; the date above will change. Material changes
        will be highlighted where appropriate.
      </p>

      <h2>10. Contact</h2>
      <p>
        Privacy questions? Email{" "}
        <a href="mailto:pradyumnagkulkarni93@gmail.com">pradyumnagkulkarni93@gmail.com</a> or see our{" "}
        <a href="/contact">Contact page</a>.
      </p>
    </LegalShell>
  );
}
