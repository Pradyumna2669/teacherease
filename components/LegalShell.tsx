import Link from "next/link";

// Shared chrome for the policy/legal pages (Terms, Privacy, Refund, Contact).
// Themed to match the site; content is passed as semantic HTML and styled by
// the `.legal-prose` rules in globals.css.
export default function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="lp min-h-dvh bg-paper text-ink flex flex-col">
      <nav className="border-b border-rule">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight">
            Teacher<span className="ink-blank">Ease</span>
          </Link>
          <Link href="/" className="text-sm text-graphite hover:text-ink transition-colors">
            ← Home
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">Legal</p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-2 font-mono text-xs text-graphite">Last updated: {updated}</p>

        <div className="legal-prose mt-8 text-[15px] leading-relaxed">{children}</div>
      </main>

      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-graphite">
        <Link href="/" className="font-display text-lg font-semibold text-ink">
          Teacher<span className="ink-blank">Ease</span>
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/refund" className="hover:text-ink">Refunds</Link>
          <Link href="/contact" className="hover:text-ink">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
