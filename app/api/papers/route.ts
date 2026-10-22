import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { spendCredits } from "@/lib/credits";
import { DEFAULT_SETTINGS, seedSettings } from "@/lib/types";
import { recordFunnelEvent } from "@/lib/funnel-events";

// Creates a paper for the signed-in teacher, enforcing the free-tier monthly
// limit server-side (the dashboard's client insert can't be trusted to gate).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  // Optional overrides from the client (title/subject/class/settings/questions).
  let body: {
    title?: string;
    subject?: string | null;
    class_name?: string | null;
    settings?: unknown;
    questions?: unknown;
    method?: string;
    cycle_id?: string | null;
    variant?: string | null;
    layout_mode?: string | null;
    course_code?: string | null;
    semester?: number | string | null;
    department?: string | null;
    total_marks?: number | null;
    school_id?: string | null;
    school_name?: string | null;
    school_subtitle?: string | null;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine — use defaults */
  }

  // Saving a paper is free — credits are charged at AI generation time
  // (/api/questions/generate). Manual editing, duplicating, and saving from
  // the question bank are all free actions.
  const questions = Array.isArray(body.questions) ? body.questions : [];
  const chargeable = false;

  // Check if teacher belongs to a school
  let schoolId: string | null = body.school_id || null;
  let schoolBranding: {
    name?: string;
    logo_url?: string | null;
    address?: string | null;
    affiliation?: string | null;
    default_header?: Record<string, unknown> | null;
  } | null = null;
  try {
    const admin = createAdminClient();
    if (!schoolId) {
      const { data: mem } = await admin
        .from("school_members")
        .select("school_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (mem?.school_id) {
        schoolId = mem.school_id;
      }
    }
    if (schoolId) {
      const { data: sc } = await admin
        .from("schools")
        .select("name, logo_url, address, affiliation, default_header")
        .eq("id", schoolId)
        .maybeSingle();
      schoolBranding = sc;
    }
  } catch {
    /* school lookup failure shouldn't block paper creation */
  }

  // The school name, class and exam title are the same on nearly every paper a
  // teacher makes, and typing them again each time is how one paper goes out
  // with last term's — or another school's — details. Carry the header across
  // from her own most recent paper; never the questions or the title. Seeding
  // here rather than in the buttons covers the dashboard, the bank and the scan
  // shortcut at once. A failed lookup just leaves the defaults in place.
  const { data: previous } = await supabase
    .from("papers")
    .select("settings")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let seeded = seedSettings(previous?.settings, body.settings);

  const isCollege =
    body.layout_mode === "college_table" ||
    (body.settings as any)?.layoutMode === "college_table";

  // If teacher has a school, pre-seed school name and branding if not already customized
  if (schoolBranding) {
    const explicitSchoolName = body.school_name || (body.settings as any)?.schoolName;
    const isStaleName =
      !seeded.schoolName ||
      seeded.schoolName.toLowerCase().includes("adarsh") ||
      seeded.schoolName === "School Name" ||
      seeded.schoolName.toLowerCase().includes("autonomous institute of engineering");

    if (explicitSchoolName) {
      seeded.schoolName = explicitSchoolName;
    } else if (schoolBranding.name && (isCollege || isStaleName)) {
      seeded.schoolName = schoolBranding.name;
    }

    const explicitSubtitle = body.school_subtitle || (body.settings as any)?.schoolSubtitle;
    const isStaleSubtitle =
      !seeded.schoolSubtitle ||
      seeded.schoolSubtitle.toLowerCase().includes("autonomous institute affiliated");

    if (explicitSubtitle) {
      seeded.schoolSubtitle = explicitSubtitle;
    } else if (schoolBranding.affiliation || schoolBranding.address) {
      if (isCollege || isStaleSubtitle) {
        seeded.schoolSubtitle = schoolBranding.affiliation || schoolBranding.address || "";
      }
    }

    if (schoolBranding.logo_url && !seeded.logoUrl) {
      seeded.logoUrl = schoolBranding.logo_url;
    }
  } else if (body.school_name) {
    seeded.schoolName = body.school_name;
    if (body.school_subtitle) seeded.schoolSubtitle = body.school_subtitle;
  }

  // These two columns only feed the dashboard list. A caller echoing the
  // default named nothing, so let the header the teacher will actually see
  // decide — a listed row saying "Maths" over a paper headed Science is the
  // same mix-up in miniature.
  const subject =
    body.subject != null && body.subject !== DEFAULT_SETTINGS.subject
      ? body.subject
      : seeded.subject;
  const className =
    body.class_name != null && body.class_name !== DEFAULT_SETTINGS.className
      ? body.class_name
      : seeded.className;

  const VALID_METHODS = ["typed", "scanned", "ai_generated", "ai_textbook"] as const;
  const method = VALID_METHODS.includes(body.method as typeof VALID_METHODS[number])
    ? (body.method as typeof VALID_METHODS[number])
    : "typed";

  const layoutMode =
    body.layout_mode ||
    (body.settings as any)?.layoutMode ||
    seeded.layoutMode ||
    "standard";
  const cycleId = body.cycle_id || null;
  const variant = body.variant || "normal";

  const mergedSettings = {
    ...seeded,
    subject,
    className,
    layoutMode,
    variant,
    ...(body.course_code ? { courseCode: body.course_code } : {}),
    ...(body.semester ? { semester: body.semester } : {}),
    ...(body.department ? { department: body.department } : {}),
    ...(body.total_marks ? { totalMarks: body.total_marks } : {}),
    ...((body.settings as Record<string, unknown>) || {}),
  };

  const { data, error } = await supabase
    .from("papers")
    .insert({
      user_id: user.id,
      school_id: schoolId,
      status: "draft",
      title: body.title ?? "Untitled Paper",
      subject,
      class_name: className,
      settings: mergedSettings,
      questions,
      method,
      cycle_id: cycleId,
      variant,
      layout_mode: layoutMode,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Could not create paper." },
      { status: 500 }
    );
  }

  // Record audit log for school papers
  if (schoolId) {
    try {
      const adminClient = createAdminClient();
      await adminClient.from("audit_logs").insert({
        school_id: schoolId,
        actor_id: user.id,
        actor_email: user.email,
        action: "paper.generate",
        entity: "paper",
        entity_id: data.id,
        summary: `Synthesized paper: ${body.title || "Untitled Paper"}`,
        details: {
          subject,
          class_name: className,
          variant,
          cycle_id: cycleId,
          total_marks: body.total_marks,
          questions_count: Array.isArray(questions) ? questions.length : 0,
        },
      });
    } catch (auditErr) {
      console.warn("Failed to write audit log:", auditErr);
    }
  }

  // Charge credits now that the paper exists; ref the ledger to the paper id.
  let balanceAfter: number | undefined;
  if (chargeable) {
    try {
      const spend = await spendCredits(user.id, "generate", data.id);
      balanceAfter = spend.balanceAfter;
    } catch {
      /* metering failure shouldn't block creation */
    }
  }

  await recordFunnelEvent(
    questions.length > 0 ? "paper_generated" : "paper_created",
    user.id,
    { mode: questions.length > 0 ? "content" : "blank", questionCount: questions.length }
  );

  try {
    const { count: priorPaperCount } = await supabase
      .from("papers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("id", data.id);

    if (priorPaperCount === 0) {
      await recordFunnelEvent("first_paper_completed", user.id, {
        questionCount: questions.length,
      });
    } else if (priorPaperCount === 1) {
      await recordFunnelEvent("second_paper_completed", user.id, {
        questionCount: questions.length,
      });
    }
  } catch {
    /* tracking failure should not block paper creation */
  }

  return NextResponse.json({ id: data.id, creditsRemaining: balanceAfter });
}
