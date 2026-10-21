import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordFunnelEvent, type FunnelEvent } from "@/lib/funnel-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EVENTS: FunnelEvent[] = [
  "signup",
  "paper_previewed",
  "paper_downloaded_pdf",
  "paper_downloaded_docx",
  "payment_started",
];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { event?: unknown; metadata?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const event = body.event;
  if (typeof event !== "string" || !ALLOWED_EVENTS.includes(event as FunnelEvent)) {
    return NextResponse.json({ error: "Unsupported event." }, { status: 400 });
  }

  await recordFunnelEvent(
    event as FunnelEvent,
    user.id,
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata as Record<string, unknown>
      : {}
  );
  return NextResponse.json({ ok: true });
}
