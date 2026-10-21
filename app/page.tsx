import Link from "next/link";
import {
  ScanLine,
  Camera,
  PencilLine,
  Download,
  Check,
  ArrowRight,
  Smartphone,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/site";
import { isTwaCookie } from "@/lib/twa";
import { TOPUP_PACKS, CREDIT_COSTS } from "@/lib/credit-packs";
import { hubData } from "@/lib/language-pages";
import { FEATURED_ARTICLES } from "@/lib/articles";
import SamplePaperDemo from "@/components/SamplePaperDemo";

const LANG_CHIPS = hubData().pages;

const PAGE_TITLE =
  "Create a Complete Question Paper in Minutes — TeacherEase";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: "Create a complete school exam paper in minutes. Choose class, subject, chapters and marks, then generate a print-ready PDF or scan a handwritten paper.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: PAGE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

// Structured data — lets Google show rich results for the app + brand.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        description: "Free to start — 3 free papers on signup, then pay per use.",
      },
      audience: { "@type": "EducationalAudience", educationalRole: "teacher" },
    },
    { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon` },
    { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  ],
};

const STEPS = [
  {
    icon: <Camera size={18} />,
    title: "Snap it, or start blank",
    desc: "Photograph a handwritten paper, or open a fresh builder and add questions yourself.",
  },
  {
    icon: <PencilLine size={18} />,
    title: "Edit & arrange",
    desc: "Fix anything, set the marks, pick a header. The live preview is the printed page, exactly.",
  },
  {
    icon: <Download size={18} />,
    title: "Download & print",
    desc: "Export a clean, print-ready PDF in one click. Minutes — not an afternoon at the typist.",
  },
];

const FEATURES = [
  { title: "Handwriting scan", desc: "Photograph a paper; AI reads it into an editable, print-ready version.", tag: "New" },
  { title: "15+ question types", desc: "Fill-blanks, MCQ, match, true/false, comprehension, word problems and more." },
  { title: "Textbook maths", desc: "Vertical add, subtract, multiply, divide — laid out like the textbook, not Word." },
  { title: "Live A4 preview", desc: "What you see is what prints — header, marks, ruled answer lines, the lot." },
  { title: "One-click PDF", desc: "Clean export. Density controls pack the page to save paper and ink." },
  { title: "Saved to your account", desc: "Auto-saved and reusable across terms, from any device." },
];

const QUESTION_TYPES = [
  "True or False",
  "Short Answer",
  "Long Answer",
  "Reading Comprehension",
  "Word Problems",
  "Essay / Composition",
  "Picture Composition",
  "Handwriting Practice",
  "Dictation",
  "Label the Picture",
];

// Small reusable section eyebrow, set in mono like an exam section label.
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
      {children}
    </p>
  );
}

export default function Home() {
  // The Android app opens this page too (tapping the logo), and Play allows no
  // pricing or buy CTA inside it. Read the cookie on the server so nothing ever
  // reaches the DOM there; crawlers have no cookie, so SEO sees the full page.
  const inApp = isTwaCookie(cookies());

  return (
    <div className="lp min-h-dvh bg-paper text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ===== Nav ===== */}
      <nav className="sticky top-0 z-50 border-b border-rule bg-paper/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
            Teacher<span className="ink-blank">Ease</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/languages" className="hidden sm:inline-block px-3 py-2 text-sm text-graphite hover:text-ink transition-colors">
              Languages
            </Link>
            <Link href="/guides" className="hidden sm:inline-block px-3 py-2 text-sm text-graphite hover:text-ink transition-colors">
              Guides
            </Link>
            {!inApp && (
              <a href="#pricing" className="hidden sm:inline-block px-3 py-2 text-sm text-graphite hover:text-ink transition-colors">
                Pricing
              </a>
            )}
            <Link href="/login" className="px-3 py-2 text-sm text-graphite hover:text-ink transition-colors">
              Sign in
            </Link>
            <Link
              href="/login"
              className="bg-ink text-paper px-4 sm:px-5 py-2 rounded-md text-sm font-medium hover:bg-pen transition-colors"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-10 items-center">
          {/* Left — thesis */}
          <div>
            <Eyebrow>For the teacher setting this term&apos;s exams</Eyebrow>
            <h1 className="mt-5 font-display text-[2.6rem] sm:text-6xl leading-[1.04] tracking-tight">
              Create a complete
              <br />
              <span className="italic">question paper</span>
              <span className="italic ink-blank"> in 2 minutes.</span>
            </h1>
            <p className="mt-6 text-lg text-graphite max-w-xl leading-relaxed">
              Choose your class, subject, chapters, marks and difficulty. TeacherEase
              creates the paper, formats it for print, and gives you a clean PDF.
              Need to digitise a handwritten one? Scan it and edit in seconds.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="group inline-flex items-center justify-center gap-2 bg-pen text-paper px-7 py-3.5 rounded-md font-medium hover:bg-ink transition-colors"
              >
                <Sparkles size={18} />
                Generate a paper free
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-md font-medium border border-ink/15 text-ink hover:border-ink/40 transition-colors"
              >
                Try interactive demo
                <ArrowRight size={16} />
              </a>
            </div>

            <p className="mt-5 font-mono text-xs text-graphite flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <Smartphone size={13} /> works on your phone
              </span>
              <span>· 3 free papers</span>
              <span>· no card required</span>
            </p>
          </div>

          {/* Right — the signature: a real question paper, scanned */}
          <div className="relative">
            {/* handwritten chit, pinned */}
            <div className="absolute -top-5 -left-3 sm:-left-6 z-20 w-32 sm:w-36 rotate-[-7deg]">
              <div className="bg-[#fbfaf4] border border-rule lp-sheet rounded-sm p-3">
                <p className="font-mono text-[9px] text-pen mb-1.5">📷 your handwriting</p>
                <div className="space-y-1.5">
                  <div className="h-1.5 rounded bg-ink/15 w-5/6" />
                  <div className="h-1.5 rounded bg-ink/15 w-full" />
                  <div className="h-1.5 rounded bg-ink/15 w-2/3" />
                  <div className="h-1.5 rounded bg-ink/15 w-4/5" />
                </div>
              </div>
            </div>

            {/* the clean paper it becomes */}
            <div className="relative bg-white lp-sheet rounded-sm overflow-hidden">
              {/* scan sweep */}
              <div className="lp-scanline absolute left-0 right-0 h-12 z-10 pointer-events-none bg-gradient-to-b from-pen/0 via-pen/10 to-pen/0 border-y border-pen/30" />
              {/* red margin rule */}
              <div className="absolute top-0 bottom-0 left-9 w-px bg-pen/25" />

              <div className="relative pl-12 pr-6 py-7 font-display text-ink">
                <div className="text-center border-b border-ink/15 pb-3">
                  <p className="text-sm font-semibold">Sunrise English School</p>
                  <p className="text-xs text-graphite">Summative Assessment · Class III · Maths</p>
                </div>

                <div className="mt-4 space-y-4 text-[13px] leading-relaxed">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span><span className="font-mono text-pen text-xs">Q.1)</span> Fill in the blanks:</span>
                      <span className="font-mono text-pen text-[11px]">(5M)</span>
                    </div>
                    <div className="mt-2 pl-5 space-y-2 text-graphite">
                      <p>a) 7 × 8 = <span className="inline-block w-12 border-b border-ink/40 align-middle" /></p>
                      <p>b) Smallest two-digit number is <span className="inline-block w-12 border-b border-ink/40 align-middle" /></p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span><span className="font-mono text-pen text-xs">Q.2)</span> Choose the correct answer:</span>
                      <span className="font-mono text-pen text-[11px]">(4M)</span>
                    </div>
                    <p className="mt-2 pl-5 text-graphite">Which number is even?</p>
                    <div className="mt-1.5 pl-5 grid grid-cols-2 gap-y-1 text-graphite">
                      <span>(a) 7 ☐</span><span>(b) 12 ☐</span>
                      <span>(c) 9 ☐</span><span>(d) 15 ☐</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-right font-mono text-xs text-graphite">
              scanned &amp; set in <span className="text-pen">8 seconds</span>
            </p>
          </div>
        </div>
      </section>

      {/* ===== Proof strip ===== */}
      <section className="border-y border-rule bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-rule">
          {[
            { big: "3 free", small: "papers to start generating or scanning" },
            { big: "2 min", small: "from class + subject to a print-ready draft" },
            { big: "15+ types", small: "MCQ, match, vertical maths, comprehension…" },
          ].map((s) => (
            <div key={s.big} className="px-2 sm:px-8 py-4 sm:py-2 text-center sm:text-left">
              <p className="font-mono text-2xl font-bold text-ink">{s.big}</p>
              <p className="mt-1 text-sm text-graphite">{s.small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Interactive Demo ===== */}
      <SamplePaperDemo />

      {/* ===== How it works ===== */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <Eyebrow>Section A — How it works</Eyebrow>
        <h2 className="mt-4 font-display text-3xl sm:text-5xl tracking-tight max-w-2xl">
          From a photo to a printed paper, in three steps.
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <div key={s.title} className="bg-white border border-rule rounded-md p-6">
              <div className="flex items-center justify-between border-b border-rule pb-3">
                <span className="font-mono text-sm text-pen">Step {i + 1}</span>
                <span className="text-ink/40">{s.icon}</span>
              </div>
              <h3 className="mt-4 font-display text-xl">{s.title}</h3>
              <p className="mt-2 text-graphite text-[15px] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Features — a teacher-marked checklist ===== */}
      <section className="bg-white border-y border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <Eyebrow>Section B — What you get</Eyebrow>
          <h2 className="mt-4 font-display text-3xl sm:text-5xl tracking-tight max-w-2xl">
            Everything a good paper needs. Ticked off.
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 gap-x-12">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`flex gap-4 py-5 ${i < FEATURES.length - (FEATURES.length % 2 === 0 ? 2 : 1) ? "border-b border-rule" : ""}`}
              >
                <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full border border-pen/40 text-pen flex items-center justify-center">
                  <Check size={14} strokeWidth={3} />
                </span>
                <div>
                  <h3 className="font-display text-lg flex items-center gap-2">
                    {f.title}
                    {f.tag && (
                      <span className="font-mono text-[10px] uppercase tracking-wide text-pen border border-pen/40 rounded px-1.5 py-0.5">
                        {f.tag}
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-graphite text-[15px] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Question types — shown, not listed ===== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <Eyebrow>Section C — Every question type you teach</Eyebrow>
        <div className="mt-8 grid md:grid-cols-3 gap-5">
          {/* Fill in the blanks */}
          <div className="lp-ruled border border-rule rounded-md p-5 font-display">
            <p className="font-mono text-xs text-pen mb-3">FILL IN THE BLANKS</p>
            <p className="text-[15px] text-ink">
              The capital of India is{" "}
              <span className="inline-block w-20 border-b border-ink/50 align-middle" />.
            </p>
          </div>
          {/* MCQ */}
          <div className="lp-ruled border border-rule rounded-md p-5 font-display">
            <p className="font-mono text-xs text-pen mb-3">MULTIPLE CHOICE</p>
            <p className="text-[15px] text-ink">2 + 3 × 4 = ?</p>
            <div className="mt-2 grid grid-cols-2 gap-y-1 text-[15px] text-graphite">
              <span>(a) 20 ☐</span><span>(b) 14 ☐</span>
            </div>
          </div>
          {/* Match */}
          <div className="lp-ruled border border-rule rounded-md p-5 font-display">
            <p className="font-mono text-xs text-pen mb-3">MATCH THE FOLLOWING</p>
            <div className="text-[15px] text-graphite grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-1">
              <span>Cow</span><span className="text-ink/30">—</span><span>Barks</span>
              <span>Dog</span><span className="text-ink/30">—</span><span>Moos</span>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {QUESTION_TYPES.map((t) => (
            <span
              key={t}
              className="font-mono text-xs text-graphite border border-rule bg-white px-3 py-1.5 rounded-full"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ===== Languages ===== */}
      <section className="bg-white border-y border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <Eyebrow>Section D — In your language</Eyebrow>
          <h2 className="mt-4 font-display text-3xl sm:text-5xl tracking-tight max-w-2xl">
            Not just English. {LANG_CHIPS.length}+ Indian languages.
          </h2>
          <p className="mt-4 text-graphite max-w-2xl text-lg leading-relaxed">
            Your students read in Hindi, Marathi, Tamil, Bengali… so should your
            papers. Can&apos;t type the script?{" "}
            <span className="text-ink font-medium">
              Type in English letters and TeacherEase converts it as you go
            </span>{" "}
            — or photograph a handwritten paper. Proper regional fonts, clean PDF.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {LANG_CHIPS.map((p) => (
              <Link
                key={p.lang}
                href={`/languages/${p.lang}`}
                className="group inline-flex items-center gap-2 font-mono text-sm border border-rule bg-paper px-3 py-1.5 rounded-full hover:border-ink/40 transition-colors"
              >
                <span
                  className="text-ink"
                  style={{ fontFamily: p.fontStack }}
                  dir={p.dir}
                  lang={p.lang}
                >
                  {p.native}
                </span>
                <span className="text-graphite group-hover:text-ink">{p.label}</span>
              </Link>
            ))}
          </div>
          <Link
            href="/languages"
            className="mt-8 inline-flex items-center gap-2 text-pen font-medium hover:underline"
          >
            See all languages <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ===== Guides ===== */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-20 sm:py-24">
        <Eyebrow>Guides — formats, templates &amp; how-tos</Eyebrow>
        <h2 className="mt-4 font-display text-3xl sm:text-5xl tracking-tight max-w-2xl">
          Setting a paper? Start here.
        </h2>
        <p className="mt-4 text-graphite max-w-2xl text-lg leading-relaxed">
          Practical write-ups for Indian school teachers — paper formats, marks
          splits, question-type templates, and how to turn a handwritten paper
          into a clean printable one.
        </p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURED_ARTICLES.map((article) => (
            <Link
              key={article.slug}
              href={`/guides/${article.slug}`}
              className="group border border-rule bg-white rounded-md p-6 hover:border-ink/40 transition-colors"
            >
              <p className="font-mono text-[11px] uppercase tracking-wide text-pen">
                {article.category} · {article.readMins} min
              </p>
              <h3 className="mt-3 font-display text-lg leading-snug text-ink group-hover:text-pen transition-colors">
                {article.title}
              </h3>
              <p className="mt-2 text-graphite text-[15px] leading-relaxed">
                {article.description}
              </p>
            </Link>
          ))}
        </div>
        <Link
          href="/guides"
          className="mt-8 inline-flex items-center gap-2 text-pen font-medium hover:underline"
        >
          Read all guides <ArrowRight size={16} />
        </Link>
      </section>

      {/* ===== Pricing ===== */}
      {!inApp && (
      <section id="pricing" className="bg-white border-y border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <Eyebrow>Section E — Pricing</Eyebrow>
          <h2 className="mt-4 font-display text-3xl sm:text-5xl tracking-tight">
            Choose how you teach.
          </h2>
          <p className="mt-4 text-graphite max-w-xl">
            Start free, then pick the plan that matches how many papers you make.
            Whether you want to scan a handwritten sheet or generate a fresh paper,
            the value is always the same: fewer hours, cleaner print-outs, and less
            rework.
          </p>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-graphite">
            <span>3 free papers to start</span>
            <span>monthly plans from ₹99</span>
            <span>pay-as-you-go packs available</span>
          </div>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {TOPUP_PACKS.map((pack) => (
              <div
                key={pack.id}
                className={`relative bg-paper rounded-md p-6 flex flex-col border ${
                  pack.highlight ? "border-pen ring-1 ring-pen/30" : "border-rule"
                }`}
              >
                {pack.highlight && (
                  <span className="absolute -top-2.5 left-5 font-mono text-[10px] uppercase tracking-wide bg-pen text-paper px-2 py-0.5 rounded">
                    Best value
                  </span>
                )}
                <h3 className="font-display text-lg">{pack.name}</h3>
                <p className="mt-2 font-display text-3xl font-bold text-ink">
                  ≈ {pack.credits === 60 ? "3" : pack.credits === 180 ? "9" : pack.credits === 400 ? "20" : "50"} papers
                </p>
                <p className="font-mono text-xs text-graphite">{pack.credits} credits · never expires</p>
                <p className="mt-3 text-sm text-graphite flex-1">
                  Full AI generation, handwritten scan, answer key, and print export.
                </p>
                <p className="mt-4 font-display text-2xl">₹{pack.amountInr}</p>
                <Link
                  href="/topup"
                  className={`mt-4 w-full py-2.5 rounded-md font-medium text-sm text-center transition-colors ${
                    pack.highlight
                      ? "bg-pen text-paper hover:bg-ink"
                      : "bg-ink text-paper hover:bg-pen"
                  }`}
                >
                  Get paper pack
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm text-graphite">
            Want monthly auto-refill or a shared school pool?{" "}
            <Link href="/topup" className="text-pen font-medium hover:underline">
              See all options →
            </Link>
          </p>
          <p className="mt-2 font-mono text-xs text-graphite">
            Secure payments via Razorpay · UPI, cards &amp; netbanking · GST invoice on request
          </p>
        </div>
      </section>
      )}

      {/* ===== Closing CTA ===== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <div className="bg-ink text-paper rounded-lg px-8 sm:px-14 py-14 sm:py-20 text-center relative overflow-hidden">
          <div className="absolute top-0 bottom-0 left-10 w-px bg-pen/40" />
          <Eyebrow>Last question</Eyebrow>
          <h2 className="mt-4 font-display text-3xl sm:text-5xl tracking-tight">
            Generate your next paper{" "}
            <span className="italic ink-blank">in minutes.</span>
          </h2>
          <p className="mt-4 text-paper/70 max-w-lg mx-auto">
            Start with 3 free papers, then make a complete exam paper from your
            class, subject and chapters — or scan a handwritten one and edit it.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 bg-pen text-paper px-8 py-4 rounded-md font-medium hover:bg-white hover:text-ink transition-colors"
          >
            <Sparkles size={18} />
            Start creating free
          </Link>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-display text-xl font-semibold">
            Teacher<span className="ink-blank">Ease</span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-graphite">
            <Link href="/languages" className="hover:text-ink">Languages</Link>
            <Link href="/guides" className="hover:text-ink">Guides</Link>
            {!inApp && <a href="#pricing" className="hover:text-ink">Pricing</a>}
            <Link href="/login" className="hover:text-ink">Sign in</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/refund" className="hover:text-ink">Refunds</Link>
            <Link href="/contact" className="hover:text-ink">Contact</Link>
          </div>
          <p className="font-mono text-xs text-graphite">Made for Indian teachers.</p>
        </div>
      </footer>
    </div>
  );
}
