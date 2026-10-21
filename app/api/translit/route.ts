import { NextRequest } from "next/server";
import { LANGUAGES } from "@/lib/languages";

// Phonetic transliteration for the paper builder: teacher types Roman
// ("namaskar") and gets Devanagari ("नमस्कार"). Backed by Google Input Tools'
// transliteration endpoint (the same engine behind the classic Google
// transliteration widgets). It needs no API key.
//
// This is best-effort: on any failure we return an empty suggestion list so the
// client silently keeps the Roman text instead of erroring. Swap the upstream
// for a paid/official service later without touching the client.
//
// `ok: false` marks "we never got an answer" as opposed to "there is no
// Devanagari for this" — the client caches words forever, and a single dropped
// request on a school connection must not blacklist a word for the session.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { text?: string; lang?: string };

function itcFor(lang: string | undefined): string | null {
  if (!lang) return null;
  const def = (LANGUAGES as Record<string, { itc: string | null }>)[lang];
  return def?.itc ?? null; // unknown / no-engine language → no transliteration
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ suggestions: [], ok: false });
  }

  const text = (body.text || "").trim();
  const itc = itcFor(body.lang);
  // Guard: skip empty, over-long, or non-Roman words (nothing to convert).
  if (!itc || !text || text.length > 40 || !/[A-Za-z]/.test(text)) {
    return Response.json({ suggestions: [], ok: true });
  }

  const url =
    "https://inputtools.google.com/request?" +
    `text=${encodeURIComponent(text)}&itc=${itc}&num=6&cp=0&cs=1&ie=utf-8&oe=utf-8`;

  try {
    const res = await fetch(url, {
      // Keep it snappy; a slow suggest should never block typing.
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return Response.json({ suggestions: [], ok: false });
    const data = await res.json();
    // Shape: ["SUCCESS", [[ "namaskar", ["नमस्कार", ...], ... ]]]
    let suggestions: string[] = [];
    if (Array.isArray(data) && data[0] === "SUCCESS") {
      const cands = data?.[1]?.[0]?.[1];
      if (Array.isArray(cands)) suggestions = cands.filter((s) => typeof s === "string");
    }
    return Response.json({ suggestions, ok: true });
  } catch {
    return Response.json({ suggestions: [], ok: false });
  }
}
