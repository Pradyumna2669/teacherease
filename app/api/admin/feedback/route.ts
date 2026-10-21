import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { grantCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { feedbackId, userId, action = "verify_and_reward", amount = 50 } = body;

    if (!feedbackId) {
      return NextResponse.json({ error: "Missing feedbackId" }, { status: 400 });
    }

    const admin = createAdminClient();

    if (action === "verify_and_reward") {
      if (userId) {
        await grantCredits(userId, Number(amount) || 50, "feedback_reward", feedbackId);
      }
      // Update teacher_feedback table
      await admin
        .from("teacher_feedback")
        .update({
          status: "verified",
          credits_rewarded: Number(amount) || 50,
          updated_at: new Date().toISOString(),
        })
        .eq("id", feedbackId);

      return NextResponse.json({
        success: true,
        status: "verified",
        creditsRewarded: Number(amount) || 50,
      });
    }

    if (action === "verify_only") {
      await admin
        .from("teacher_feedback")
        .update({
          status: "verified",
          updated_at: new Date().toISOString(),
        })
        .eq("id", feedbackId);

      return NextResponse.json({ success: true, status: "verified" });
    }

    if (action === "dismiss") {
      await admin
        .from("teacher_feedback")
        .update({
          status: "dismissed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", feedbackId);

      return NextResponse.json({ success: true, status: "dismissed" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[admin-feedback-error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update feedback" },
      { status: 500 }
    );
  }
}
