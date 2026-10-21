import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

// Social share card (WhatsApp/Twitter/FB link previews). 1200x630.
// Keep this route dynamic because the Windows + Next 14 stack can fail when the
// OG image is prerendered as a static asset during a local build.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #eef2ff 0%, #ffffff 55%, #f5f3ff 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#4f46e5",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            P
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#111827" }}>
            {SITE_NAME}
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 68,
            fontWeight: 800,
            color: "#111827",
            lineHeight: 1.1,
            letterSpacing: "-1px",
          }}
        >
          Question papers in minutes.
        </div>
        <div style={{ marginTop: 16, fontSize: 40, fontWeight: 700, color: "#4f46e5" }}>
          Create, scan and print faster.
        </div>
        <div style={{ marginTop: 32, fontSize: 30, color: "#4b5563" }}>
          Built for Indian teachers · Save time on every paper
        </div>
      </div>
    ),
    { ...size }
  );
}
