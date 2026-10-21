import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find caller's school and verify admin role
  const { data: membership } = await admin
    .from("school_members")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id) {
    return NextResponse.json({ error: "No school found." }, { status: 404 });
  }

  const { data: school } = await admin
    .from("schools")
    .select("id, admin_user_id")
    .eq("id", membership.school_id)
    .maybeSingle();

  if (!school || school.admin_user_id !== user.id) {
    return NextResponse.json(
      { error: "Only the school administrator can change school branding." },
      { status: 403 }
    );
  }

  let body: {
    name?: string;
    logoUrl?: string;
    address?: string;
    affiliation?: string;
    defaultHeader?: Record<string, unknown>;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim().length >= 2) {
    updates.name = body.name.trim();
  }
  if (body.logoUrl !== undefined) {
    updates.logo_url = typeof body.logoUrl === "string" ? body.logoUrl.trim() : null;
  }
  if (body.address !== undefined) {
    updates.address = typeof body.address === "string" ? body.address.trim() : null;
  }
  if (body.affiliation !== undefined) {
    updates.affiliation = typeof body.affiliation === "string" ? body.affiliation.trim() : null;
  }
  if (body.defaultHeader !== undefined && typeof body.defaultHeader === "object") {
    updates.default_header = body.defaultHeader;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await admin
    .from("schools")
    .update(updates)
    .eq("id", school.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updates });
}
