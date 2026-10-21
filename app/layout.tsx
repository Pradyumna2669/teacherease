import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import {
  Instrument_Sans,
  Noto_Sans_Devanagari,
  Noto_Serif_Devanagari,
  Space_Mono,
  Noto_Sans_Bengali,
  Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
  Noto_Sans_Kannada,
  Noto_Sans_Oriya,
  Noto_Nastaliq_Urdu,
  Noto_Sans_Ol_Chiki,
  Noto_Sans_Meetei_Mayek,
} from "next/font/google";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";
import GoogleAdsense from "@/components/GoogleAdsense";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
} from "@/lib/site";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });
// preload: false on every script font. They are declared here because the root
// layout is where the CSS variables have to live, but only the paper preview
// ever uses one — preloading all thirteen put thirteen font requests in front of
// first paint on the launch route, on a 4G phone that renders none of them.
const devanagariSans = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari-sans",
  preload: false,
});
const devanagariSerif = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari-serif",
  preload: false,
});

// One font per additional Indic script (see lib/languages.ts SCRIPT_FONT). Each
// exposes a CSS variable the language font-stacks reference. next/font only
// ships the @font-face for a script to pages that actually use it.
const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], weight: ["400", "700"], variable: "--font-bengali", preload: false });
const gujarati = Noto_Sans_Gujarati({ subsets: ["gujarati"], weight: ["400", "700"], variable: "--font-gujarati", preload: false });
const gurmukhi = Noto_Sans_Gurmukhi({ subsets: ["gurmukhi"], weight: ["400", "700"], variable: "--font-gurmukhi", preload: false });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], weight: ["400", "700"], variable: "--font-tamil", preload: false });
const telugu = Noto_Sans_Telugu({ subsets: ["telugu"], weight: ["400", "700"], variable: "--font-telugu", preload: false });
const kannada = Noto_Sans_Kannada({ subsets: ["kannada"], weight: ["400", "700"], variable: "--font-kannada", preload: false });
const odia = Noto_Sans_Oriya({ subsets: ["oriya"], weight: ["400", "700"], variable: "--font-odia", preload: false });
const urdu = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-urdu", preload: false });
const olchiki = Noto_Sans_Ol_Chiki({ subsets: ["ol-chiki"], weight: ["400"], variable: "--font-olchiki", preload: false });
const meitei = Noto_Sans_Meetei_Mayek({ subsets: ["meetei-mayek"], weight: ["400"], variable: "--font-meitei", preload: false });

const display = localFont({
  src: [
    {
      path: "./fonts/Newsreader-VariableFont.ttf",
      style: "normal",
      weight: "200 800",
    },
    {
      path: "./fonts/Newsreader-Italic-VariableFont.ttf",
      style: "italic",
      weight: "200 800",
    },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const mono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  // SVG first for crisp tabs at any zoom; the PNG mark covers browsers and
  // Android home screens that ignore SVG, and apple-icon covers iOS.
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "256x256" },
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "education",
  // Standalone install: no browser chrome, and the status bar picks up the
  // brand rather than a default grey.
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  other: {
    "google-adsense-account":
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-1963220156593983",
  },
};

// Separate export because Next 14 moved viewport/themeColor out of metadata.
// interactiveWidget keeps the builder's bottom bar above the on-screen keyboard
// instead of letting it be shoved off the viewport.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16243b",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsenseClientId =
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-1963220156593983";

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;700&display=swap"
        />
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${sans.variable} ${devanagariSans.variable} ${devanagariSerif.variable} ${bengali.variable} ${gujarati.variable} ${gurmukhi.variable} ${tamil.variable} ${telugu.variable} ${kannada.variable} ${odia.variable} ${urdu.variable} ${olchiki.variable} ${meitei.variable} ${display.variable} ${mono.variable} font-sans`}
      >
        <GoogleAdsense />
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
