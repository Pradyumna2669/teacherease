import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { ARTICLES } from "@/lib/articles";
import { INDEXABLE_LANGUAGE_PAGES } from "@/lib/language-pages";

// lastModified is only emitted where we have a real per-page edit date (guide
// articles carry one). Stamping every other URL with a hardcoded date that never
// moves teaches Google the field is noise, and it starts ignoring it site-wide.

export default function sitemap(): MetadataRoute.Sitemap {
  const guides: MetadataRoute.Sitemap = ARTICLES.map((article) => ({
    url: `${SITE_URL}/guides/${article.slug}`,
    lastModified: new Date(article.updated),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // Only languages with unique, written content. The template-only ones are
  // noindex until their LANG_DEPTH entry exists — submitting them would just
  // re-fill Search Console with "Discovered – currently not indexed".
  const languagePages: MetadataRoute.Sitemap = INDEXABLE_LANGUAGE_PAGES.map((lang) => ({
    url: `${SITE_URL}/languages/${lang}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/guides`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/languages`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...languagePages,
    ...guides,
    {
      url: `${SITE_URL}/pricing`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/refund`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/contact`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
