import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Bank items for one paper.
//
// Free, like the rest of generation: this is a read of shared content, not an
// AI call, so there is nothing to meter. It is behind auth only because the
// bank is a real asset and there is no reason to serve it to the open web.
//
// RLS already restricts reads to reviewed rows, so this route does not repeat
// that check — it would drift from the policy rather than reinforce it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_KEYS = 60;
const MAX_ROWS = 400;

export async function POST(req: NextRequest) {
  // The curated/seeded database is intentionally unavailable to teachers.
  // Papers must use the teacher's own question bank or manual questions.
  return NextResponse.json(
    { error: "The curated question bank is unavailable." },
    { status: 404 }
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const cls = Number(body.class);
  const subject = typeof body.subject === "string" ? body.subject : "maths";
  const board = typeof body.board === "string" ? body.board : null;
  const skills = Array.isArray(body.skills)
    ? (body.skills as unknown[]).filter((s): s is string => typeof s === "string").slice(0, MAX_KEYS)
    : [];
  const chapters = Array.isArray(body.chapters)
    ? (body.chapters as unknown[]).filter((c): c is string => typeof c === "string").slice(0, MAX_KEYS)
    : [];

  if (!Number.isInteger(cls) || cls < 1 || cls > 12) {
    return NextResponse.json({ error: "Which class?" }, { status: 400 });
  }
  if (!skills.length && !chapters.length) {
    return NextResponse.json({ items: [] });
  }

  let query = supabase
    .from("bank_items")
    .select("id, skill_id, chapter, question_type, difficulty, marks, body, answer")
    .eq("subject", subject)
    .lte("class", cls)
    .limit(MAX_ROWS);

  // Board-neutral rows serve every board; only genuinely board-specific rows
  // carry one, so both must come back.
  if (board) query = query.or(`board.is.null,board.eq.${board}`);

  query = skills.length
    ? query.in("skill_id", skills)
    : query.in("chapter", chapters);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not read the question bank." }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
