import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "PaperGen/1.0 (school exam paper generator)";

interface ImageSearchResult {
  id: string;
  title: string;
  thumbnail: string;
  creator: string;
  license: string;
  source: string;
}

async function searchClipart(query: string): Promise<ImageSearchResult[]> {
  try {
    const q = query.trim() + " outline";
    const res = await fetch(
      "https://duckduckgo.com/?q=" +
        encodeURIComponent(q) +
        "&t=h_&iar=images&iax=images&ia=images",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
        },
        signal: AbortSignal.timeout(6000),
      }
    );
    const html = await res.text();
    const vqdMatch =
      html.match(/vqd=([0-9-]+)/) || html.match(/vqd=["']([^"']+)["']/);
    if (!vqdMatch) return [];

    const imgRes = await fetch(
      "https://duckduckgo.com/i.js?l=us-en&o=json&q=" +
        encodeURIComponent(q) +
        "&vqd=" +
        vqdMatch[1] +
        "&f=type:clipart,,",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
          Referer: "https://duckduckgo.com/",
        },
        signal: AbortSignal.timeout(6000),
      }
    );
    const imgData = await imgRes.json();
    const results = (imgData.results || []).slice(0, 24).map((r: any) => ({
      id: r.thumbnail || r.image,
      title: r.title || "Outline Image",
      thumbnail: r.thumbnail || r.image,
      creator: r.source || "",
      license: "Outline / Clipart",
      source: r.url || "",
    }));
    return results;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1") || 1);

  if (!q) return NextResponse.json({ results: [], page, hasMore: false });

  // 1. Try outline / clipart search first for page 1
  if (page === 1) {
    const clipartResults = await searchClipart(q);
    if (clipartResults.length > 0) {
      return NextResponse.json({
        results: clipartResults,
        page: 1,
        hasMore: false,
      });
    }
  }

  // 2. Fallback to Openverse
  const api =
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}` +
    `&page=${page}&page_size=20&mature=false`;

  try {
    const r = await fetch(api, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!r.ok) {
      return NextResponse.json(
        { results: [], page, hasMore: false, error: "Search service unavailable." },
        { status: 502 }
      );
    }
    const data = await r.json();
    const raw: any[] = Array.isArray(data.results) ? data.results : [];
    const results = raw
      .filter((i) => i.id && (i.thumbnail || i.url))
      .map((i) => ({
        id: i.id,
        title: i.title || "",
        thumbnail: i.thumbnail || i.url,
        creator: i.creator || "",
        license: [i.license, i.license_version].filter(Boolean).join(" ").toUpperCase(),
        source: i.source || "",
      }));
    const pageCount = Number(data.page_count) || page;
    return NextResponse.json({ results, page, hasMore: page < pageCount });
  } catch {
    return NextResponse.json(
      { results: [], page, hasMore: false, error: "Could not reach the image library." },
      { status: 502 }
    );
  }
}
