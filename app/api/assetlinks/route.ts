import { NextResponse } from "next/server";

// Digital Asset Links.
//
// An Android Trusted Web Activity only runs full-screen — no browser address
// bar — if the site it opens confirms the app is allowed to speak for it. Play
// fetches https://papergen.online/.well-known/assetlinks.json and looks for the
// app's signing certificate here. Without a match the wrapper still works but
// shows a Chrome toolbar, which stops it looking like an app at all.
//
// Served through a rewrite (see next.config.mjs) because Next does not route
// directories whose name starts with a dot.
//
// Set these in Vercel once the release key exists:
//   ANDROID_PACKAGE_NAME      online.papergen.app (matches twa-manifest.json)
//   ANDROID_CERT_FINGERPRINTS SHA-256 fingerprint(s), comma-separated.
//                             Play App Signing shows the one that matters under
//                             Release > Setup > App signing.
export const dynamic = "force-dynamic";

// A package name that does not match the APK fails silently — Chrome just keeps
// the toolbar — so an unset variable falls back to the real one rather than to
// something that cannot possibly verify.
const PACKAGE_NAME = "online.papergen.app";

export async function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME || PACKAGE_NAME;
  const fingerprints = (process.env.ANDROID_CERT_FINGERPRINTS || "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);

  // Until the app exists, return a valid empty list rather than a 404 — a 404
  // here is indistinguishable from a misconfigured domain when debugging.
  if (fingerprints.length === 0) {
    return NextResponse.json([], {
      headers: {
        "content-type": "application/json",
        // Android's verifier fetches this on a short timeout; let the CDN answer.
        "cache-control": "public, max-age=300, s-maxage=300",
      },
    });
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: pkg,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=300, s-maxage=300",
      },
    }
  );
}
