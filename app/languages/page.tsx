import type { Metadata } from "next";
import Link from "next/link";
import { ScanLine, ArrowRight } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { LegalFooter } from "@/components/LegalShell";
import { hubData } from "@/lib/language-pages";

const { pages, moreLangs } = hubData();

export const metadata: Metadata = {
  title: "Question Papers in Every Indian Language — Hindi, Marathi, Tamil & More",
  description: `Make school exam question papers in ${pages.length}+ Indian languages. Type in English letters and auto-convert to the script, or photograph a handwritten paper. Proper regional fonts, clean PDF. Built for Indian teachers.`,
  keywords: [
    "question paper in regional language",
    "Indian language question paper maker",
    "multilingual question paper generator",
    "regional language exam paper",
    "Hindi Marathi Tamil question paper maker",
    "vernacular question paper maker",
  ],
  alternates: { canonical: "/languages" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/languages`,
    siteName: SITE_NAME,
    title: `Question Papers in Every Indian Language · ${SITE_NAME}`,
    description: `Make school question papers in ${pages.length}+ Indian languages — type in English letters, or scan a handwritten paper.`,
    locale: "en_IN",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      name: "Question Papers in Indian Languages",
      url: `${SITE_URL}/languages`,
      description: `Make school exam papers in ${pages.length}+ Indian languages with ${SITE_NAME}.`,
    },
    {
      "@type": "ItemList",
      itemListElement: pages.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${p.label} Question Paper Maker`,
        url: `${SITE_URL}/languages/${p.lang}`,
      })),
    },
  ],
};

export default function LanguagesHub() {
  return (
    <div className="lp min-h-dvh bg-paper text-ink flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight">
            Teacher<span className="ink-blank">Ease</span>
          </Link>
          <Link
            href="/login"
            className="bg-ink text-paper px-4 py-2 rounded-md text-sm font-medium hover:bg-pen transition-colors"
          >
            Start free
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
          Languages
        </p>
        <h1 className="mt-3 font-display text-3xl sm:text-5xl font-semibold tracking-tight max-w-3xl">
          Question papers in your language.
        </h1>
        <p className="mt-4 text-lg text-graphite max-w-2xl leading-relaxed">
          Most teachers can build a paper in English — but their students read in
          Hindi, Marathi, Tamil, Bengali and more. PaperGen makes print-ready
          papers in <span className="text-ink font-medium">{pages.length}+ Indian languages</span>.
          Can&apos;t type the script? Type in English letters and it converts as you
          go — or just photograph a handwritten paper.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-pen text-paper px-6 py-3 rounded-md font-medium hover:bg-ink transition-colors"
          >
            <ScanLine size={18} /> Start free
          </Link>
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-medium border border-ink/15 text-ink hover:border-ink/40 transition-colors"
          >
            Read the guides <ArrowRight size={16} />
          </Link>
        </div>

        <section className="mt-12">
          <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
            Pick a language
          </p>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {pages.map((p) => (
              <Link
                key={p.lang}
                href={`/languages/${p.lang}`}
                className="group bg-white border border-rule rounded-md p-5 hover:border-ink/40 transition-colors"
              >
                <p
                  className="font-display text-2xl text-ink leading-tight"
                  style={{ fontFamily: p.fontStack }}
                  dir={p.dir}
                  lang={p.lang}
                >
                  {p.native}
                </p>
                <p className="mt-2 text-sm text-graphite group-hover:text-ink transition-colors flex items-center gap-1">
                  {p.label} <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </Link>
            ))}
          </div>

          {moreLangs.length > 0 && (
            <p className="mt-6 text-sm text-graphite">
              Also supported (native labels rolling out):{" "}
              <span className="text-ink">{moreLangs.join(" · ")}</span>. Papers in
              these already print in the correct script — the fixed labels are
              being translated.
            </p>
          )}
        </section>

        <section className="mt-14 bg-white border border-rule rounded-lg p-6 sm:p-8">
          <h2 className="font-display text-2xl tracking-tight">
            How the language support works
          </h2>
          <div className="mt-5 grid sm:grid-cols-3 gap-6 text-[15px]">
            <div>
              <h3 className="font-display text-lg">Type in English letters</h3>
              <p className="mt-1.5 text-graphite leading-relaxed">
                Write &ldquo;namaste&rdquo; and get the script. No special keyboard —
                works on any phone or computer.
              </p>
            </div>
            <div>
              <h3 className="font-display text-lg">Or photograph a paper</h3>
              <p className="mt-1.5 text-graphite leading-relaxed">
                Snap a handwritten paper in any of these languages and it&apos;s read
                into an editable, print-ready one.
              </p>
            </div>
            <div>
              <h3 className="font-display text-lg">Prints perfectly</h3>
              <p className="mt-1.5 text-graphite leading-relaxed">
                Every language uses proper regional fonts, so the PDF matches the
                preview — no broken boxes or missing letters.
              </p>
            </div>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
