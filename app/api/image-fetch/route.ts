import { NextRequest, NextResponse } from "next/server";

// Fetches a chosen Openverse image (by id) server-side and returns it as a
// base64 data URL. Embedding as a data URL means the image survives the
// html2pdf export exactly like an uploaded image — and the browser never
// touches a cross-origin URL. We only ever fetch from api.openverse.org's own
// thumbnail proxy, so there is no arbitrary-host (SSRF) surface.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "PaperGen/1.0 (school exam paper generator)";
const MAX_BYTES = 8_000_000; // 8 MB safety cap

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  const urlParam = req.nextUrl.searchParams.get("url")?.trim();

  let targetUrl = "";
  if (urlParam && /^https?:\/\//i.test(urlParam)) {
    targetUrl = urlParam;
  } else if (id && /^https?:\/\//i.test(id)) {
    targetUrl = id;
  } else if (id && /^[a-f0-9-]{16,64}$/i.test(id)) {
    targetUrl = `https://api.openverse.org/v1/images/${id}/thumb/`;
  } else {
    return NextResponse.json({ error: "Invalid image identifier." }, { status: 400 });
  }

  try {
    const r = await fetch(targetUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "*/*",
      },
      cache: "no-store",
    });
    if (!r.ok) {
      return NextResponse.json(
        { error: "Could not fetch the image." },
        { status: 502 }
      );
    }
    const contentType = r.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image." }, { status: 415 });
    }
    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large." }, { status: 413 });
    }
    const dataUrl = `data:${contentType};base64,${Buffer.from(buf).toString("base64")}`;
    return NextResponse.json({ dataUrl });
  } catch {
    return NextResponse.json(
      { error: "Could not fetch the image." },
      { status: 502 }
    );
  }
}
