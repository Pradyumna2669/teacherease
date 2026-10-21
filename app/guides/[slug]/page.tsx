import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScanLine } from "lucide-react";
import { ARTICLES, getArticle } from "@/lib/articles";
import { hubData } from "@/lib/language-pages";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { LegalFooter } from "@/components/LegalShell";

const LANG_CHIPS = hubData().pages.slice(0, 8);

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const article = getArticle(params.slug);
  if (!article) return {};

  const url = `${SITE_URL}/guides/${article.slug}`;
  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: `/guides/${article.slug}` },
    openGraph: {
      type: "article",
      url,
      title: article.title,
      description: article.description,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

export default function GuideArticle({ params }: { params: { slug: string } }) {
  const article = getArticle(params.slug);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.published,
    dateModified: article.updated,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon` },
    },
    mainEntityOfPage: `${SITE_URL}/guides/${article.slug}`,
    articleSection: article.category,
  };

  // Same-category first, then topped up from the rest — a small category must
  // still leave the reader (and the crawler) with onward links.
  const others = ARTICLES.filter((candidate) => candidate.slug !== article.slug);
  const related = [
    ...others.filter((candidate) => candidate.category === article.category),
    ...others.filter((candidate) => candidate.category !== article.category),
  ].slice(0, 3);

  return (
    <div className="lp min-h-dvh bg-paper text-ink flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="border-b border-rule">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight">
            Paper<span className="ink-blank">Gen</span>
          </Link>
          <Link
            href="/guides"
            className="text-sm text-graphite hover:text-ink transition-colors"
          >
            ← All guides
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">
            Guide · {article.readMins} min read
          </p>
          <span className="font-mono text-xs text-graphite border border-rule rounded-full px-2 py-1">
            {article.category}
          </span>
        </div>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
          {article.title}
        </h1>
        <p className="mt-5 text-lg text-graphite leading-relaxed">{article.intro}</p>

        <article className="legal-prose mt-8 text-[15px] leading-relaxed">
          {article.blocks.map((block, index) => {
            if ("h" in block) return <h2 key={index}>{block.h}</h2>;
            if ("p" in block) return <p key={index}>{block.p}</p>;

            if ("ol" in block)
              return (
                <ol key={index}>
                  {block.ol.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ol>
              );

            if ("table" in block)
              return (
                <div key={index} className="my-6 overflow-x-auto">
                  <table className="w-full border-collapse text-[14px]">
                    {block.table.caption && (
                      <caption className="caption-top text-left font-mono text-[11px] uppercase tracking-wide text-pen pb-2">
                        {block.table.caption}
                      </caption>
                    )}
                    <thead>
                      <tr>
                        {block.table.head.map((cell) => (
                          <th
                            key={cell}
                            className="border-b border-ink/30 py-2 pr-4 text-left font-mono text-[11px] uppercase tracking-wide text-graphite"
                          >
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.table.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="border-b border-rule py-2 pr-4 align-top"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );

            return (
              <ul key={index}>
                {block.ul.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            );
          })}
        </article>

        <div className="mt-12 bg-ink text-paper rounded-lg p-7 sm:p-9 relative overflow-hidden">
          <div className="absolute top-0 bottom-0 left-7 w-px bg-pen/40" />
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-pen">
            Make it now
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold">
            Build this paper in minutes — free to start.
          </h2>
          <p className="mt-2 text-paper/70 text-[15px]">
            Type it yourself or photograph a handwritten one. New accounts get 60
            free credits.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex items-center gap-2 bg-pen text-paper px-6 py-3 rounded-md font-medium hover:bg-white hover:text-ink transition-colors"
          >
            <ScanLine size={18} /> Start free
          </Link>
        </div>

        {related.length > 0 && (
          <div className="mt-12">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-pen">
              More in this cluster
            </p>
            <ul className="mt-3 space-y-2">
              {related.map((candidate) => (
                <li key={candidate.slug}>
                  <Link
                    href={`/guides/${candidate.slug}`}
                    className="font-display text-lg text-ink hover:text-pen transition-colors"
                  >
                    {candidate.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-12 border-t border-rule pt-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-pen">
            Set this paper in your language
          </p>
          <p className="mt-2 text-graphite text-[15px] leading-relaxed">
            The same format works in any Indian language — type in English
            letters and it converts to the script, or photograph a handwritten
            paper.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {LANG_CHIPS.map((chip) => (
              <Link
                key={chip.lang}
                href={`/languages/${chip.lang}`}
                className="group inline-flex items-center gap-2 font-mono text-sm border border-rule bg-white px-3 py-1.5 rounded-full hover:border-ink/40 transition-colors"
              >
                <span
                  style={{ fontFamily: chip.fontStack }}
                  dir={chip.dir}
                  lang={chip.lang}
                >
                  {chip.native}
                </span>
                <span className="text-graphite group-hover:text-ink">
                  {chip.label}
                </span>
              </Link>
            ))}
            <Link
              href="/languages"
              className="inline-flex items-center gap-1.5 font-mono text-sm border border-ink/20 px-3 py-1.5 rounded-full text-ink hover:border-ink/50 transition-colors"
            >
              All languages
            </Link>
          </div>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
