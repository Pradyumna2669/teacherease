import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// School context for the signed-in user.
//   GET  -> { school, role, members } | { school: null }
//   POST -> create a school (caller becomes admin + first member)
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

  // Membership tells us which school the user belongs to and their role.
  const { data: membership } = await admin
    .from("school_members")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id) {
    return NextResponse.json({ school: null });
  }

  const { data: school } = await admin
    .from("schools")
    .select("id, name, credits_balance, discount_bps, admin_user_id, logo_url, address, affiliation, default_header")
    .eq("id", membership.school_id)
    .maybeSingle();

  if (!school) return NextResponse.json({ school: null });

  const isAdmin = school.admin_user_id === user.id;

  // Only the admin sees the full roster + per-teacher spend.
  let members: unknown[] = [];
  if (isAdmin) {
    const { data } = await admin.rpc("school_members_detail", {
      p_school_id: school.id,
    });
    members = data ?? [];
  }

  return NextResponse.json({
    school: {
      id: school.id,
      name: school.name,
      creditsBalance: school.credits_balance,
      discountBps: school.discount_bps,
      logoUrl: school.logo_url ?? null,
      address: school.address ?? null,
      affiliation: school.affiliation ?? null,
      defaultHeader: school.default_header ?? {},
    },
    role: membership.role,
    isAdmin,
    members,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let name = "";
  try {
    ({ name } = await req.json());
  } catch {
    /* validated below */
  }
  name = (name || "").trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "Enter a school name." }, { status: 400 });
  }

  const admin = createAdminClient();

  // One school per user (a user already in a school can't create another).
  const { data: existing } = await admin
    .from("school_members")
    .select("school_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.school_id) {
    return NextResponse.json(
      { error: "You're already part of a school." },
      { status: 409 }
    );
  }

  const { data: school, error } = await admin
    .from("schools")
    .insert({ name, admin_user_id: user.id })
    .select("id")
    .single();
  if (error || !school) {
    return NextResponse.json(
      { error: error?.message || "Could not create school." },
      { status: 500 }
    );
  }

  // Admin is also a member (role 'admin') so their own usage draws on the pool.
  await admin
    .from("school_members")
    .insert({ school_id: school.id, user_id: user.id, role: "admin" });

  return NextResponse.json({ id: school.id });
}
