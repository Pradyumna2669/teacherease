import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private app + API routes — no SEO value, keep them out of the index.
        // These all either require auth (middleware 307s them to /login) or are
        // auth screens themselves; crawling them only burns crawl budget on
        // redirects, which Search Console reports as "Page with redirect".
        disallow: [
          "/api/",
          "/builder",
          "/dashboard",
          "/school",
          "/bank",
          "/account",
          "/admin",
          "/auth",
          "/login",
          "/topup",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
