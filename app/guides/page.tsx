import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  ARTICLES,
  ARTICLE_CATEGORIES,
  getArticlesByCategory,
} from "@/lib/articles";
import { SITE_NAME } from "@/lib/site";
import { LegalFooter } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Guides for Teachers — Question Papers, Formats and Scanning",
  description: `Practical guides on making school question papers: formats, MCQ layouts, scanning handwritten papers, and ready templates. From ${SITE_NAME}.`,
  alternates: { canonical: "/guides" },
  openGraph: {
    title: `Guides for Teachers — Question Papers, Formats and Scanning · ${SITE_NAME}`,
    description: `Practical guides on making school question papers: formats, MCQ layouts, scanning handwritten papers, and ready templates. From ${SITE_NAME}.`,
    url: "/guides",
  },
};

const CATEGORY_INTROS: Record<(typeof ARTICLE_CATEGORIES)[number], string> = {
  "Formats & Templates":
    "Reusable layouts, paper blueprints, and structure guides teachers can use across terms.",
  "Question Types":
    "Focused guides for MCQ, fill-in-the-blanks, worksheets, and other common paper sections.",
  "Scanning & Digitising":
    "Workflows for turning handwritten drafts into editable, print-ready exam papers.",
  "Classroom Examples":
    "Class- and subject-specific examples you can adapt directly to the next test.",
};

const STARTER_GUIDES = [
  "question-paper-format",
  "scan-handwritten-paper-to-pdf",
  "class-3-maths-question-paper",
];

export default function GuidesIndex() {
  const starterGuides = STARTER_GUIDES.map((slug) =>
    ARTICLES.find((article) => article.slug === slug),
  ).filter(Boolean);

  return (
    <div className="lp min-h-dvh bg-paper text-ink flex flex-col">
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
        <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">Guides</p>
        <h1 className="mt-3 font-display text-3xl sm:text-5xl font-semibold tracking-tight">
          Help for making question papers.
        </h1>
        <p className="mt-4 text-lg text-graphite max-w-3xl">
          Practical, no-fluff guides on formats, question types, scanning
          handwritten papers, and ready templates written for school teachers.
        </p>

        <section className="mt-10 rounded-lg border border-rule bg-white p-6 sm:p-8">
          <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
            Start here
          </p>
          <div className="mt-4 grid md:grid-cols-3 gap-5">
            {starterGuides.map((article) => (
              <Link
                key={article!.slug}
                href={`/guides/${article!.slug}`}
                className="group rounded-md border border-rule p-5 hover:border-ink/40 transition-colors"
              >
                <p className="font-mono text-xs text-pen">{article!.readMins} min read</p>
                <h2 className="mt-2 font-display text-xl leading-snug text-ink">
                  {article!.title}
                </h2>
                <p className="mt-2 text-sm text-graphite leading-relaxed">
                  {article!.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink group-hover:text-pen transition-colors">
                  Read guide <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-12 space-y-12">
          {ARTICLE_CATEGORIES.map((category) => {
            const articles = getArticlesByCategory(category);
            return (
              <section key={category}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
                      Topic cluster
                    </p>
                    <h2 className="mt-2 font-display text-2xl sm:text-3xl tracking-tight">
                      {category}
                    </h2>
                    <p className="mt-2 text-graphite max-w-2xl">
                      {CATEGORY_INTROS[category]}
                    </p>
                  </div>
                  <p className="hidden sm:block font-mono text-xs text-graphite">
                    {articles.length} guides
                  </p>
                </div>

                <div className="mt-6 grid sm:grid-cols-2 gap-5">
                  {articles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/guides/${article.slug}`}
                      className="group bg-white border border-rule rounded-md p-6 hover:border-ink/40 transition-colors flex flex-col"
                    >
                      <p className="font-mono text-xs text-pen">
                        {article.readMins} min read
                      </p>
                      <h3 className="mt-2 font-display text-xl leading-snug text-ink">
                        {article.title}
                      </h3>
                      <p className="mt-2 text-graphite text-[15px] leading-relaxed flex-1">
                        {article.description}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink group-hover:text-pen transition-colors">
                        Read guide <ArrowRight size={15} />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
