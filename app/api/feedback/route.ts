import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rating = typeof body.rating === "number" ? Math.max(1, Math.min(5, Math.round(body.rating))) : null;
    const expectedFeatures = Array.isArray(body.expectedFeatures)
      ? body.expectedFeatures.filter((f): f is string => typeof f === "string").slice(0, 15)
      : [];
    const feedbackText = typeof body.feedbackText === "string" ? body.feedbackText.trim().slice(0, 2000) : "";
    const method = typeof body.method === "string" ? body.method.slice(0, 50) : "ai_generated";
    const paperId = typeof body.paperId === "string" ? body.paperId : null;

    if (!rating && expectedFeatures.length === 0 && !feedbackText) {
      return NextResponse.json({ error: "Please provide your rating or feedback." }, { status: 400 });
    }

    const admin = createAdminClient();
    const userEmail = user?.email || null;
    const userId = user?.id || null;

    // 1. Always record in funnel_events so feedback is never lost
    try {
      await admin.from("funnel_events").insert({
        event: "teacher_feedback",
        user_id: userId,
        metadata: {
          rating: rating ?? 0,
          expected_features: expectedFeatures,
          feedback_text: feedbackText,
          method,
          paper_id: paperId,
          email: userEmail,
          status: "pending_verification",
        },
      });
    } catch (funnelErr) {
      console.warn("[feedback] funnel_events fallback failed:", funnelErr);
    }

    // 2. Try inserting into dedicated teacher_feedback table if it exists
    try {
      await admin.from("teacher_feedback").insert({
        user_id: userId,
        email: userEmail,
        paper_id: paperId,
        generation_method: method,
        rating,
        expected_features: expectedFeatures,
        feedback_text: feedbackText,
        status: "pending",
        credits_rewarded: 0, // No instant reward; rewarded after verification
      });
    } catch {
      // Table might not be migrated yet; funnel_events already captured the payload
    }

    return NextResponse.json({
      success: true,
      message: "Feedback received and queued for review. Credits will be rewarded after verification.",
    });
  } catch (err: unknown) {
    console.error("[feedback error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record feedback." },
      { status: 500 }
    );
  }
}
