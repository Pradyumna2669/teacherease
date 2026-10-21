import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScanLine, Keyboard, Camera, FileText, ArrowRight, Check } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { LegalFooter } from "@/components/LegalShell";
import {
  LANGUAGE_PAGES,
  isLanguagePage,
  languagePageData,
} from "@/lib/language-pages";
import { FEATURED_ARTICLES } from "@/lib/articles";

export function generateStaticParams() {
  return LANGUAGE_PAGES.map((lang) => ({ lang }));
}

export function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Metadata {
  if (!isLanguagePage(params.lang)) return {};
  const d = languagePageData(params.lang);
  const title = d.depth
    ? `${d.label} Question Paper Maker — ${d.depth.boardShort} Format`
    : `${d.label} Question Paper Maker — Make Exam Papers in ${d.label}`;
  const description = d.depth
    ? `Make print-ready ${d.label} (${d.native}) question papers for ${d.depth.regions}. Type in English letters and auto-convert to ${d.label} script, or photograph a handwritten paper. Proper fonts, aligned marks, clean A4 PDF.`
    : `Create print-ready ${d.label} (${d.native}) question papers in minutes. Type in English letters and auto-convert to ${d.label}, or photograph a handwritten paper. Proper ${d.label} fonts, clean PDF. Built for Indian teachers.`;
  const url = `${SITE_URL}/languages/${d.lang}`;
  return {
    title,
    description,
    keywords: d.keywords,
    alternates: { canonical: `/languages/${d.lang}` },
    // Pages without language-specific content are template near-duplicates.
    // Keep them crawlable for their links, but out of the index until written.
    robots: d.depth ? undefined : { index: false, follow: true },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: `${title} · ${SITE_NAME}`,
      description,
      locale: "en_IN",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function LanguagePage({ params }: { params: { lang: string } }) {
  if (!isLanguagePage(params.lang)) notFound();
  const d = languagePageData(params.lang);
  const nativeStyle = { fontFamily: d.fontStack } as React.CSSProperties;
  const rtl = d.dir === "rtl";

  // Sibling language pages for internal linking.
  const others = LANGUAGE_PAGES.filter((l) => l !== d.lang)
    .slice(0, 8)
    .map((l) => languagePageData(l));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: `${SITE_NAME} — ${d.label} Question Paper Maker`,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        url: `${SITE_URL}/languages/${d.lang}`,
        inLanguage: d.lang,
        description: `Make ${d.label} school question papers online, or scan a handwritten one.`,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          description: "Free to start — 3 free papers on signup.",
        },
        audience: { "@type": "EducationalAudience", educationalRole: "teacher" },
      },
      {
        "@type": "FAQPage",
        mainEntity: d.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Languages", item: `${SITE_URL}/languages` },
          { "@type": "ListItem", position: 3, name: d.label, item: `${SITE_URL}/languages/${d.lang}` },
        ],
      },
    ],
  };

  const WAYS = [
    {
      icon: <Keyboard size={18} />,
      title: d.hasTranslit
        ? "Type in English — get " + d.label
        : "Type or paste " + d.label,
      desc: d.hasTranslit
        ? `Can't type in ${d.label}? Type "namaste"-style in English letters and it converts to ${d.label} script as you press space. Pick from suggestions when a word needs it.`
        : `Type or paste ${d.label} directly. Everything else — layout, marks, answer lines — is done for you.`,
    },
    {
      icon: <Camera size={18} />,
      title: "Photograph a handwritten paper",
      desc: `Already wrote it by hand? Take a photo and TeacherEase reads your ${d.label} paper into an editable, print-ready one. Nothing to type.`,
    },
    {
      icon: <FileText size={18} />,
      title: `Print-ready ${d.label} PDF`,
      desc: `Real ${d.label} fonts, a live A4 preview that matches the print, and a clean one-click PDF — header, marks and ruled lines included.`,
    },
  ];

  return (
    <div className="lp min-h-dvh bg-paper text-ink flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight">
            Teacher<span className="ink-blank">Ease</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/languages" className="text-sm text-graphite hover:text-ink transition-colors">
              All languages
            </Link>
            <Link
              href="/login"
              className="bg-ink text-paper px-4 py-2 rounded-md text-sm font-medium hover:bg-pen transition-colors"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-12 sm:pt-16 pb-12">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-mono text-sm border border-rule bg-white rounded-full px-3 py-1"
              style={nativeStyle}
              dir={d.dir}
              lang={d.lang}
            >
              {d.native}
            </span>
            <span className="font-mono text-xs tracking-[0.16em] uppercase text-pen">
              Question paper maker
            </span>
          </div>

          <h1 className="mt-5 font-display text-4xl sm:text-6xl leading-[1.05] tracking-tight">
            Question papers in <span className="ink-blank">{d.label}</span>,
            <br className="hidden sm:block" /> set in minutes.
          </h1>

          <p
            className="mt-5 text-2xl sm:text-3xl text-ink/90"
            style={nativeStyle}
            dir={d.dir}
            lang={d.lang}
          >
            {d.tagline}
          </p>

          <p className="mt-5 text-lg text-graphite max-w-2xl leading-relaxed">
            Make a print-ready {d.label} exam paper without fighting the keyboard.{" "}
            {d.hasTranslit
              ? `Type in plain English letters and TeacherEase writes it in ${d.label} for you`
              : `Type, paste, or scan ${d.label}`}
            {" "}— or just <span className="text-ink font-medium">photograph a handwritten paper</span>{" "}
            and it's typed up automatically. Built for Indian teachers.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-pen text-paper px-7 py-3.5 rounded-md font-medium hover:bg-ink transition-colors"
            >
              <ScanLine size={18} /> Make a {d.label} paper — free
            </Link>
            <a
              href="#how"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-md font-medium border border-ink/15 text-ink hover:border-ink/40 transition-colors"
            >
              See how it works <ArrowRight size={16} />
            </a>
          </div>
          <p className="mt-5 font-mono text-xs text-graphite">
            3 free paper generations on signup · works on your phone · no card to start
          </p>
        </section>

        {/* Three ways */}
        <section id="how" className="bg-white border-y border-rule">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
              How teachers make a {d.label} paper
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl tracking-tight max-w-2xl">
              Three ways in. No {d.label} keyboard needed.
            </h2>
            <div className="mt-10 grid md:grid-cols-3 gap-6">
              {WAYS.map((w, i) => (
                <div key={i} className="border border-rule rounded-md p-6">
                  <div className="flex items-center justify-between border-b border-rule pb-3">
                    <span className="font-mono text-sm text-pen">0{i + 1}</span>
                    <span className="text-ink/40">{w.icon}</span>
                  </div>
                  <h3 className="mt-4 font-display text-xl leading-snug">{w.title}</h3>
                  <p className="mt-2 text-graphite text-[15px] leading-relaxed">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Boards + sample questions (languages with written depth only) */}
        {d.depth && (
          <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-20">
            <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
              {d.label}-medium schools
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl tracking-tight max-w-2xl">
              Built around how {d.label} teachers actually set papers.
            </h2>
            <p className="mt-5 text-graphite max-w-3xl text-[17px] leading-relaxed">
              {d.depth.context}
            </p>

            <div className="mt-8">
              <p className="font-mono text-xs uppercase tracking-wide text-graphite">
                Used for papers following
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {d.depth.boards.map((board) => (
                  <span
                    key={board}
                    className="font-mono text-sm border border-rule bg-white px-3 py-1.5 rounded-full text-graphite"
                  >
                    {board}
                  </span>
                ))}
              </div>
              <p className="mt-3 font-mono text-xs text-graphite">
                Medium of instruction in {d.depth.regions}.
              </p>
            </div>

            <h3 className="mt-12 font-display text-2xl tracking-tight">
              Sample questions, set in {d.label}.
            </h3>
            <p className="mt-2 text-graphite max-w-2xl">
              Typed in English letters, printed in {d.native}. These are the kind
              of items a primary paper is built from:
            </p>
            <div className="mt-6 grid gap-4">
              {d.depth.samples.map((sample) => (
                <div
                  key={sample.label}
                  className="bg-white border border-rule rounded-md p-6"
                >
                  <p className="font-mono text-[11px] uppercase tracking-wide text-pen">
                    {sample.label}
                  </p>
                  <p
                    className="mt-3 font-display text-xl sm:text-2xl leading-relaxed text-ink"
                    style={nativeStyle}
                    dir={d.dir}
                    lang={d.lang}
                  >
                    {sample.q}
                  </p>
                  <p className="mt-3 text-graphite text-[14px] border-t border-rule pt-3">
                    {sample.gloss}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Question types in-script */}
        <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-20">
          <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
            Every question type — in {d.label}
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl tracking-tight max-w-2xl">
            The instructions come ready-written in {d.label}.
          </h2>
          <p className="mt-3 text-graphite max-w-2xl">
            Pick a question type and its heading is already set in {d.label} — you
            just add the questions. A few examples:
          </p>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {d.showcase.map((s) => (
              <div
                key={s.type}
                className="bg-white border border-rule rounded-md p-5 flex flex-col gap-2"
              >
                <p className="font-mono text-[11px] uppercase tracking-wide text-pen">
                  {s.en}
                </p>
                <p
                  className="font-display text-xl text-ink leading-snug"
                  style={nativeStyle}
                  dir={d.dir}
                  lang={d.lang}
                >
                  {s.native}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Script handling (languages with written depth only) */}
        {d.depth && (
          <section className="bg-white border-y border-rule">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
              <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
                {d.label} script, handled properly
              </p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl tracking-tight max-w-2xl">
                The details that decide whether a child can read the paper.
              </h2>
              <div className="mt-10 grid sm:grid-cols-2 gap-x-12 gap-y-8">
                {d.depth.scriptNotes.map((note) => (
                  <div key={note.h}>
                    <h3 className="font-display text-xl leading-snug">{note.h}</h3>
                    <p className="mt-2 text-graphite text-[15px] leading-relaxed">
                      {note.p}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Why teachers pick it */}
        <section className="bg-white border-y border-rule">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
              Why {d.label} teachers use it
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-x-12 gap-y-1">
              {[
                `No ${d.label} typing skills needed — English letters convert to script, or scan a handwritten paper`,
                `Proper ${d.label} fonts, so the PDF prints cleanly`,
                "15+ question types with headings already in " + d.label,
                "Cheaper and faster than a local typist",
                "Works on your phone — set a paper between classes",
                "Free to start, pay only for what you use",
              ].map((f) => (
                <div key={f} className="flex gap-3 py-4 border-b border-rule">
                  <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full border border-pen/40 text-pen flex items-center justify-center">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <p className="text-graphite text-[15px] leading-relaxed">{f}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-20">
          <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
            {d.label} question papers — FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl tracking-tight">
            Common questions.
          </h2>
          <div className="mt-8 divide-y divide-rule border-t border-rule">
            {d.faq.map((f) => (
              <div key={f.q} className="py-6">
                <h3 className="font-display text-lg text-ink">{f.q}</h3>
                <p className="mt-2 text-graphite text-[15px] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-16 sm:pb-20">
          <div className="bg-ink text-paper rounded-lg px-8 sm:px-12 py-12 sm:py-16 relative overflow-hidden">
            <div className="absolute top-0 bottom-0 left-8 w-px bg-pen/40" />
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-pen">
              Make it now
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl tracking-tight max-w-xl">
              Set your next {d.label} paper — free to start.
            </h2>
            <p className="mt-3 text-paper/70 max-w-lg">
              Sign up, get 3 free papers, and make your first {d.label} paper today.
              Type it in English letters, or scan a handwritten one.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 bg-pen text-paper px-7 py-3.5 rounded-md font-medium hover:bg-white hover:text-ink transition-colors"
            >
              <ScanLine size={18} /> Start free
            </Link>
          </div>
        </section>

        {/* Guides */}
        <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-16">
          <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
            Guides for setting a paper
          </p>
          <h2 className="mt-3 font-display text-2xl sm:text-3xl tracking-tight max-w-2xl">
            Formats and templates that work in {d.label} too.
          </h2>
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            {FEATURED_ARTICLES.slice(0, 3).map((article) => (
              <Link
                key={article.slug}
                href={`/guides/${article.slug}`}
                className="group border border-rule bg-white rounded-md p-5 hover:border-ink/40 transition-colors"
              >
                <p className="font-mono text-[11px] uppercase tracking-wide text-pen">
                  {article.readMins} min read
                </p>
                <h3 className="mt-2 font-display text-lg leading-snug text-ink group-hover:text-pen transition-colors">
                  {article.title}
                </h3>
              </Link>
            ))}
          </div>
          <Link
            href="/guides"
            className="mt-6 inline-flex items-center gap-1.5 text-pen font-medium hover:underline"
          >
            All guides <ArrowRight size={16} />
          </Link>
        </section>

        {/* Other languages */}
        <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-20">
          <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
            Other languages
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((o) => (
              <Link
                key={o.lang}
                href={`/languages/${o.lang}`}
                className="group inline-flex items-center gap-2 font-mono text-sm border border-rule bg-white px-3 py-1.5 rounded-full hover:border-ink/40 transition-colors"
              >
                <span style={{ fontFamily: o.fontStack }} dir={o.dir} lang={o.lang}>
                  {o.native}
                </span>
                <span className="text-graphite group-hover:text-ink">{o.label}</span>
              </Link>
            ))}
            <Link
              href="/languages"
              className="inline-flex items-center gap-1.5 font-mono text-sm border border-ink/20 px-3 py-1.5 rounded-full text-ink hover:border-ink/50 transition-colors"
            >
              All languages <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
