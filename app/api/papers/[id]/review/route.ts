import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const paperId = params.id;
  const admin = createAdminClient();

  const { data: paper } = await admin
    .from("papers")
    .select("id, user_id, school_id, status")
    .eq("id", paperId)
    .maybeSingle();

  if (!paper) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  // Teacher must be the author, or school admin
  const { data: membership } = await admin
    .from("school_members")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id) {
    return NextResponse.json(
      { error: "You must be a member of a school to submit papers for review." },
      { status: 403 }
    );
  }

  let body: { action?: "submit" | "withdraw" } = {};
  try {
    body = await req.json();
  } catch {
    /* default submit */
  }

  const action = body.action || "submit";

  if (action === "submit") {
    if (paper.user_id !== user.id) {
      return NextResponse.json({ error: "Only the author can submit." }, { status: 403 });
    }
    const { error } = await admin
      .from("papers")
      .update({
        school_id: membership.school_id,
        status: "in_review",
        review_feedback: null,
      })
      .eq("id", paperId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "in_review" });
  } else if (action === "withdraw") {
    if (paper.user_id !== user.id && membership.role !== "admin") {
      return NextResponse.json({ error: "Permission denied." }, { status: 403 });
    }
    const { error } = await admin
      .from("papers")
      .update({
        status: "draft",
      })
      .eq("id", paperId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "draft" });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
