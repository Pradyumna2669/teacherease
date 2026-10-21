import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type ScannedPaper } from "@/lib/scan";
import { getBalance, spendCredits, CREDIT_COSTS } from "@/lib/credits";
import { extractPaper, type ScanImage } from "@/lib/scan-providers";
import { logError } from "@/lib/error-log";

// Vision-powered scan: a photographed handwritten question paper -> structured
// questions that drop into the builder. Runs server-side so the API key never
// reaches the browser. Backend is pluggable via SCAN_PROVIDER (anthropic |
// gemini | mock) — see lib/scan-providers.ts.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // vision extraction can take a while

// Anthropic model (used only when SCAN_PROVIDER=anthropic). Sonnet 4.6 is the
// production default: strong handwriting accuracy at ~1/4 the cost of Opus, so
// per-page scan credits stay profitable. Override via SCAN_MODEL.
const MODEL = process.env.SCAN_MODEL || "claude-sonnet-4-6";

const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB per image after decode

// Parse a data URL (or bare base64) into a provider-neutral image.
function toScanImage(input: string): ScanImage | null {
  const m = /^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/i.exec(
    input.trim()
  );
  const mediaType = m
    ? m[1].toLowerCase().replace("image/jpg", "image/jpeg")
    : "image/jpeg";
  const data = m ? m[2] : input.trim();
  if (!data) return null;
  // Rough size guard (base64 is ~4/3 of raw bytes).
  if ((data.length * 3) / 4 > MAX_BYTES) return null;
  return { mediaType, data };
}

export async function POST(req: NextRequest) {
  // Require a signed-in teacher — keeps the vision calls behind auth.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to scan." }, { status: 401 });
  }

  let images: unknown;
  let paperId: unknown;
  try {
    ({ images, paperId } = await req.json());
  } catch {
    // A body this route cannot even parse is usually one the platform already
    // truncated or rejected — worth recording, since the teacher sees only a
    // failed scan.
    await logError({
      action: "scan",
      status: 400,
      message: "Request body could not be parsed (likely oversized or truncated).",
      userId: user.id,
      context: { contentLength: req.headers.get("content-length") },
    });
    return NextResponse.json(
      {
        error:
          "Those photos could not be uploaded — they may be too large. Try fewer pages, or retake them in better light.",
      },
      { status: 400 }
    );
  }

  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "No images provided." }, { status: 400 });
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `Please scan at most ${MAX_IMAGES} pages at a time.` },
      { status: 400 }
    );
  }

  const scanImages: ScanImage[] = [];
  for (const img of images) {
    if (typeof img !== "string") continue;
    const parsed = toScanImage(img);
    if (!parsed) {
      return NextResponse.json(
        { error: "An image is invalid or larger than 5MB." },
        { status: 400 }
      );
    }
    scanImages.push(parsed);
  }
  if (scanImages.length === 0) {
    return NextResponse.json({ error: "No valid images provided." }, { status: 400 });
  }

  // Scans are charged PER PAPER (1 paper = 20 credits), NOT per page.
  // Teachers get unlimited page scans per paper.
  // Adding pages to an existing paper (paperId provided) is free.
  const pages = scanImages.length;
  const isAddingPages = typeof paperId === "string" && Boolean(paperId);
  const scanCost = isAddingPages ? 0 : CREDIT_COSTS.scan;
  let balance: number;
  try {
    ({ balance } = await getBalance(user.id));
  } catch (err) {
    await logError({
      action: "scan",
      status: 503,
      message: `Balance check failed, scan refused: ${
        err instanceof Error ? err.message : "unknown"
      }`,
      userId: user.id,
      context: { pages },
    });
    return NextResponse.json(
      {
        error:
          "We couldn't check your balance just now — please try again in a moment.",
      },
      { status: 503 }
    );
  }
  if (scanCost > 0 && balance < scanCost) {
    const papersLeft = Math.floor(balance / CREDIT_COSTS.scan);
    return NextResponse.json(
      {
        error: `You need at least 1 paper in your balance to scan. You have ${papersLeft} papers remaining. Get a paper pack to continue.`,
        upgrade: true,
        needed: scanCost,
        balance,
      },
      { status: 402 }
    );
  }

  // Shape info reused by every failure path below. No image data — these are
  // photographs of exam papers.
  const shape = {
    pages,
    bytes: scanImages.reduce((n, i) => n + Math.round((i.data.length * 3) / 4), 0),
    provider: process.env.SCAN_PROVIDER || "unset",
  };

  // Run the configured vision backend.
  const result = await extractPaper(scanImages, MODEL);
  if (result.error || !result.raw) {
    await logError({
      action: "scan",
      status: result.status || 502,
      message: result.error || "Vision backend returned no result.",
      userId: user.id,
      context: shape,
    });
    return NextResponse.json(
      { error: result.error || "Scan failed." },
      { status: result.status || 502 }
    );
  }

  let paper: ScannedPaper;
  try {
    paper = JSON.parse(result.raw);
  } catch {
    await logError({
      action: "scan",
      status: 502,
      message: "Vision backend returned non-JSON.",
      userId: user.id,
      context: { ...shape, rawPrefix: result.raw.slice(0, 120) },
    });
    return NextResponse.json(
      { error: "Scan result was malformed. Please try again." },
      { status: 502 }
    );
  }

  if (!paper || !Array.isArray(paper.questions)) {
    await logError({
      action: "scan",
      status: 502,
      message: "Extraction produced no questions array.",
      userId: user.id,
      context: shape,
    });
    return NextResponse.json(
      { error: "No questions found. Try a clearer photo." },
      { status: 502 }
    );
  }

  // Successful extraction — charge credits.
  let balanceAfter: number | undefined;
  try {
    const ref = typeof paperId === "string" && paperId ? paperId : undefined;
    if (scanCost > 0) {
      const spend = await spendCredits(user.id, "scan", ref, 1);
      balanceAfter = spend.balanceAfter;
    } else {
      const b = await getBalance(user.id);
      balanceAfter = b.balance;
    }
  } catch (err) {
    // The teacher keeps the result; we absorb the cost. Worth knowing about
    // — a run of these means metering is broken and scans are going free.
    await logError({
      action: "scan",
      status: 200,
      message: `Extraction succeeded but metering failed: ${
        err instanceof Error ? err.message : "unknown"
      }`,
      userId: user.id,
      context: shape,
    });
  }

  return NextResponse.json({ paper, creditsRemaining: balanceAfter });
}
