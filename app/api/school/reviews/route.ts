import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("school_members")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id) {
    return NextResponse.json({ reviews: [] });
  }

  // Fetch papers with school_id where status is in_review, approved, or changes_requested
  const { data: papers, error } = await admin
    .from("papers")
    .select("id, title, subject, class_name, status, review_feedback, user_id, updated_at, reviewed_at, questions, settings")
    .eq("school_id", membership.school_id)
    .in("status", ["in_review", "approved", "changes_requested"])
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get author emails
  const userIds = Array.from(new Set((papers || []).map((p) => p.user_id)));
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: members } = await admin.rpc("school_members_detail", {
      p_school_id: membership.school_id,
    });
    if (Array.isArray(members)) {
      members.forEach((m: { user_id: string; email: string }) => {
        emailMap.set(m.user_id, m.email);
      });
    }
  }

  const items = (papers || []).map((p) => {
    const questions = Array.isArray(p.questions) ? p.questions : [];
    const settings = p.settings && typeof p.settings === "object" ? p.settings : {};
    return {
      id: p.id,
      title: p.title,
      subject: p.subject,
      class_name: p.class_name,
      status: p.status,
      review_feedback: p.review_feedback,
      user_id: p.user_id,
      author_email: emailMap.get(p.user_id) || "Teacher",
      question_count: questions.length,
      total_marks: (settings as Record<string, unknown>).totalMarks || 0,
      updated_at: p.updated_at,
      reviewed_at: p.reviewed_at,
    };
  });

  return NextResponse.json({ reviews: items, isAdmin: membership.role === "admin" });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("school_members")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id || membership.role !== "admin") {
    return NextResponse.json(
      { error: "Only school administrators can approve or reject exam papers." },
      { status: 403 }
    );
  }

  let body: {
    paperId?: string;
    verdict?: "approved" | "changes_requested";
    feedback?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.paperId || !body.verdict || !["approved", "changes_requested"].includes(body.verdict)) {
    return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
  }

  const { data: paper } = await admin
    .from("papers")
    .select("id, school_id, status")
    .eq("id", body.paperId)
    .maybeSingle();

  if (!paper || paper.school_id !== membership.school_id) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  const { error } = await admin
    .from("papers")
    .update({
      status: body.verdict,
      review_feedback: body.feedback?.trim() || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", body.paperId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: body.verdict });
}
