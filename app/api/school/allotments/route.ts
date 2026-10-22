import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/school/allotments -> returns { allotments: [...], subjects: [...] }
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("school_members")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id) {
    return NextResponse.json({ allotments: [], subjects: [] });
  }

  // Fetch subjects for this school
  const { data: subjects } = await admin
    .from("bank_subjects")
    .select("id, name, code, semester, department, class_name, created_at")
    .eq("school_id", membership.school_id)
    .order("name");

  // Fetch allotments
  const { data: allotments } = await admin
    .from("college_course_allotments")
    .select("id, subject_id, user_id, created_at")
    .eq("school_id", membership.school_id)
    .order("created_at", { ascending: false });

  // Fetch member emails
  const { data: members } = await admin.rpc("school_members_detail", {
    p_school_id: membership.school_id,
  });

  const memberMap: Record<string, string> = {};
  (members || []).forEach((m: any) => {
    memberMap[m.user_id] = m.email;
  });

  const enrichedAllotments = (allotments || []).map((a: any) => {
    const sub = (subjects || []).find((s: any) => s.id === a.subject_id);
    return {
      id: a.id,
      subject_id: a.subject_id,
      user_id: a.user_id,
      teacher_email: memberMap[a.user_id] || a.user_id,
      subject_name: sub?.name || "Subject",
      subject_code: sub?.code || "",
      department: sub?.department || "",
      semester: sub?.semester ?? null,
      class_name: sub?.class_name || "",
      created_at: a.created_at,
    };
  });

  return NextResponse.json({
    allotments: enrichedAllotments,
    subjects: subjects || [],
    members: members || [],
    isAdmin: membership.role === "admin",
  });
}

// POST /api/school/allotments -> allot a subject to a teacher
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("school_members")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id || membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can manage course allotments." }, { status: 403 });
  }

  const { subject_id, user_id } = await req.json();
  if (!subject_id || !user_id) {
    return NextResponse.json({ error: "subject_id and user_id are required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("college_course_allotments")
    .insert({
      school_id: membership.school_id,
      subject_id,
      user_id,
      allotted_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Subject is already allotted to this teacher." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch subject name & teacher email for clear audit trail
  const { data: subObj } = await admin
    .from("bank_subjects")
    .select("name, code")
    .eq("id", subject_id)
    .maybeSingle();

  const { data: teacherProfile } = await admin.auth.admin.getUserById(user_id);
  const teacherEmail = teacherProfile?.user?.email || user_id;
  const subLabel = subObj ? (subObj.code ? `${subObj.code} · ${subObj.name}` : subObj.name) : "Course";

  // Record audit log
  await admin.from("audit_logs").insert({
    school_id: membership.school_id,
    actor_id: user.id,
    actor_email: user.email,
    actor_role: "admin",
    action: "allotment.grant",
    entity: "allotment",
    entity_id: data.id,
    summary: `Allotted course "${subLabel}" to faculty (${teacherEmail})`,
    details: { subject_id, user_id, teacher_email: teacherEmail, subject_label: subLabel },
  });

  return NextResponse.json({ ok: true, allotment: data });
}

// DELETE /api/school/allotments?id=... -> revoke an allotment
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("school_members")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id || membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can revoke allotments." }, { status: 403 });
  }

  await admin
    .from("college_course_allotments")
    .delete()
    .eq("id", id)
    .eq("school_id", membership.school_id);

  // Record audit log
  await admin.from("audit_logs").insert({
    school_id: membership.school_id,
    actor_id: user.id,
    actor_email: user.email,
    actor_role: "admin",
    action: "allotment.revoke",
    entity: "allotment",
    entity_id: id,
    summary: `Revoked subject allotment`,
    details: { allotment_id: id },
  });

  return NextResponse.json({ ok: true });
}
