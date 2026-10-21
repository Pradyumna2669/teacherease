import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// School roster mutations — admin only.
//   POST   { email }   -> add a teacher to the pool
//   DELETE { userId }  -> remove a teacher (the admin can't remove themselves)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Confirm the caller is the admin of their school; returns the school id.
async function requireAdminSchool(userId: string) {
  const admin = createAdminClient();
  const { data: school } = await admin
    .from("schools")
    .select("id")
    .eq("admin_user_id", userId)
    .maybeSingle();
  return school?.id ?? null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const schoolId = await requireAdminSchool(user.id);
  if (!schoolId) {
    return NextResponse.json({ error: "You don't admin a school." }, { status: 403 });
  }

  let email = "";
  try {
    ({ email } = await req.json());
  } catch {
    /* validated below */
  }
  email = (email || "").trim().toLowerCase();
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: targetId } = await admin.rpc("user_id_by_email", {
    p_email: email,
  });
  if (!targetId) {
    return NextResponse.json(
      { error: "No TeacherEase account with that email. Ask them to sign up first." },
      { status: 404 }
    );
  }

  // A user can only belong to one school (unique index on user_id).
  const { error } = await admin
    .from("school_members")
    .insert({ school_id: schoolId, user_id: targetId, role: "teacher" });
  if (error) {
    const msg = /duplicate|unique/i.test(error.message)
      ? "That teacher is already in a school."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const schoolId = await requireAdminSchool(user.id);
  if (!schoolId) {
    return NextResponse.json({ error: "You don't admin a school." }, { status: 403 });
  }

  let userId = "";
  try {
    ({ userId } = await req.json());
  } catch {
    /* validated below */
  }
  if (!userId) {
    return NextResponse.json({ error: "Missing teacher." }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json(
      { error: "You can't remove yourself (the admin)." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  await admin
    .from("school_members")
    .delete()
    .eq("school_id", schoolId)
    .eq("user_id", userId);

  return NextResponse.json({ ok: true });
}
