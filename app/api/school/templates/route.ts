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
    .select("school_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id) {
    return NextResponse.json({ templates: [] });
  }

  const { data: templates, error } = await admin
    .from("school_templates")
    .select("id, school_id, created_by, title, description, subject, class_name, settings, sections, created_at")
    .eq("school_id", membership.school_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: templates ?? [] });
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
    .select("school_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id) {
    return NextResponse.json({ error: "You are not part of any school." }, { status: 403 });
  }

  let body: {
    title?: string;
    description?: string;
    subject?: string;
    className?: string;
    settings?: Record<string, unknown>;
    sections?: unknown[];
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const title = (body.title || "").trim();
  if (title.length < 2) {
    return NextResponse.json({ error: "Template title is required." }, { status: 400 });
  }

  const { data: template, error } = await admin
    .from("school_templates")
    .insert({
      school_id: membership.school_id,
      created_by: user.id,
      title,
      description: body.description?.trim() || null,
      subject: body.subject?.trim() || null,
      class_name: body.className?.trim() || null,
      settings: body.settings || {},
      sections: Array.isArray(body.sections) ? body.sections : [],
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: template.id, ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Template ID is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("school_members")
    .select("school_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.school_id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { data: template } = await admin
    .from("school_templates")
    .select("created_by, school_id")
    .eq("id", id)
    .maybeSingle();

  if (!template || template.school_id !== membership.school_id) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const canDelete = template.created_by === user.id || membership.role === "admin";
  if (!canDelete) {
    return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  }

  const { error } = await admin.from("school_templates").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
