import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

// Web app manifest. Makes the site installable, and is the foundation an
// Android wrapper (Trusted Web Activity) is built on — Bubblewrap reads this
// file to generate the project, so name, colours, icons and start_url here are
// what the installed app ends up with.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Question Paper Maker`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    // The installed app's identity. Pinned so that changing start_url later
    // updates the installed app instead of quietly installing a second one.
    id: "/",
    // Teachers who install this are here to make a paper, not read the landing
    // page — open straight into their papers.
    //
    // Deliberately NOT `src=twa`. That marker is what lib/twa.ts uses to hide
    // every payment surface, and a Chrome-installed PWA is display-mode
    // standalone too — so it would latch the flag and never clear it, leaving a
    // PWA user with no way to buy credits at all. The Play build carries the
    // marker via android/twa-manifest.json, which is a separate file.
    start_url: "/dashboard?src=pwa",
    scope: "/",
    // Reuse the open window rather than stacking a second one when a link or
    // shortcut launches the app.
    launch_handler: { client_mode: "navigate-existing" } as MetadataRoute.Manifest["launch_handler"],
    display: "standalone",
    // Reviewing a whole A4 sheet is the landscape case, and Play flags a
    // portrait lock on large screens.
    orientation: "any",
    // Exactly the page background, so the splash does not change shade the
    // moment content paints.
    background_color: "#FCFCF9",
    theme_color: "#16243b",
    lang: "en-IN",
    dir: "ltr",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android masks adaptive icons; these keep the mark inside the safe zone.
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Scan a handwritten paper",
        short_name: "Scan",
        url: "/builder?scan=1&src=pwa",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Question bank",
        short_name: "Bank",
        url: "/bank?src=pwa",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
