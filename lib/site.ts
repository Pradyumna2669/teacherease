// Central site metadata used by SEO.
// This drives metadataBase, every canonical, the sitemap and robots.txt. The
// fallback must be the live domain: if NEXT_PUBLIC_SITE_URL is ever missing in
// production, pointing canonicals at the vercel.app host would deindex the site.
// Guard it against invalid values (for example local Windows path strings or
// partial env values) so build-time metadata generation never throws.
export const SITE_URL = (() => {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || "https://teacherease.online")
    .trim()
    .replace(/\/+$/, "");

  try {
    return new URL(raw).origin;
  } catch {
    return "https://teacherease.online";
  }
})();

export const SITE_NAME = "TeacherEase";

export const SITE_TAGLINE = "Smart Question Paper Generator for Schools & Colleges";

export const SITE_DESCRIPTION =
  "Create print-ready school exam question papers in minutes — in English, Hindi, Marathi, Tamil and 15+ Indian languages. Type in English letters and auto-convert to the script, or photograph a handwritten paper and let AI turn it into an editable one. Built for Indian teachers. Cheaper than a typist.";

export const SITE_KEYWORDS = [
  "question paper maker",
  "question paper generator",
  "exam paper maker",
  "create question paper online",
  "question paper format",
  "test paper generator",
  "school exam paper maker India",
  "handwritten paper to digital",
  "worksheet maker for teachers",
  "question paper maker in Hindi",
  "Marathi question paper maker",
  "regional language question paper",
  "Indian language question paper generator",
  "multilingual question paper maker",
];
