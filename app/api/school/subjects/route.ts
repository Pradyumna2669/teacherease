import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/school/subjects -> list all subjects for user's school
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("school_members")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id) {
    return NextResponse.json({ error: "Not a school member" }, { status: 403 });
  }

  const { data: subjects, error } = await admin
    .from("bank_subjects")
    .select("id, name, code, semester, department, class_name, created_at")
    .eq("school_id", membership.school_id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subjects: subjects || [] });
}

// POST /api/school/subjects -> create a subject and automatically allot it to admin
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("school_members")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id || membership.role !== "admin") {
    return NextResponse.json(
      { error: "Only institutional admins can create institutional subjects." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : null;
  const department = typeof body.department === "string" ? body.department.trim() : null;
  const className = typeof body.class_name === "string" ? body.class_name.trim() : null;
  const semester =
    body.semester !== undefined && body.semester !== null && body.semester !== ""
      ? Number(body.semester)
      : null;

  if (!name) {
    return NextResponse.json({ error: "Subject name is required." }, { status: 400 });
  }

  // Insert into bank_subjects
  const { data: subject, error: subError } = await admin
    .from("bank_subjects")
    .insert({
      school_id: membership.school_id,
      user_id: user.id,
      name,
      code: code || null,
      department: department || null,
      semester: isNaN(semester as number) ? null : semester,
      class_name: className || null,
    })
    .select()
    .single();

  if (subError) {
    if (subError.code === "23505") {
      return NextResponse.json(
        { error: `A subject with name "${name}" already exists in your curriculum.` },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  // By default, newly created subject is active and allotted to the admin who created it
  const { data: allotment, error: allotError } = await admin
    .from("college_course_allotments")
    .insert({
      school_id: membership.school_id,
      subject_id: subject.id,
      user_id: user.id,
      allotted_by: user.id,
    })
    .select()
    .single();

  if (allotError && allotError.code !== "23505") {
    console.error("Auto-allotment error:", allotError);
  }

  // Record audit log
  await admin.from("audit_logs").insert({
    school_id: membership.school_id,
    actor_id: user.id,
    actor_email: user.email,
    actor_role: "admin",
    action: "subject.create",
    entity: "bank_subjects",
    entity_id: subject.id,
    summary: `Created subject "${subject.name}" (${subject.code || "No code"}) and auto-allotted to admin`,
    details: {
      subject_id: subject.id,
      name: subject.name,
      code: subject.code,
      department: subject.department,
      semester: subject.semester,
      class_name: subject.class_name,
      allotment_id: allotment?.id,
    },
  });

  return NextResponse.json({
    ok: true,
    subject,
    allotment,
  });
}

// DELETE /api/school/subjects?id=... -> delete subject & cascade allotments
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("school_members")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id || membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can delete subjects." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Subject ID required" }, { status: 400 });

  const { data: existing } = await admin
    .from("bank_subjects")
    .select("id, name")
    .eq("id", id)
    .eq("school_id", membership.school_id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  }

  const { error: delError } = await admin
    .from("bank_subjects")
    .delete()
    .eq("id", id)
    .eq("school_id", membership.school_id);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    school_id: membership.school_id,
    actor_id: user.id,
    actor_email: user.email,
    actor_role: "admin",
    action: "subject.delete",
    entity: "bank_subjects",
    entity_id: id,
    summary: `Deleted subject "${existing.name}" and revoked all associated allotments`,
    details: { subject_id: id, name: existing.name },
  });

  return NextResponse.json({ ok: true });
}
