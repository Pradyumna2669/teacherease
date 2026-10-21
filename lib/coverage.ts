import { createClient } from "@/lib/supabase/client";
import type { BoardId } from "@/lib/curriculum/types";

// A teacher's classes, and what she has taught in each.
//
// Coverage hangs off a class rather than off the teacher: the same person takes
// Class 3 and Class 5, and they are nowhere near the same point in the year.
//
// RLS scopes every row to the signed-in teacher, so these queries carry no
// user_id filter of their own beyond what insert requires.

export interface TeacherClass {
  id: string;
  label: string;
  board: BoardId;
  class: number;
  subject: string;
  created_at: string;
}

export async function listClasses(): Promise<TeacherClass[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teacher_classes")
    .select("id, label, board, class, subject, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TeacherClass[];
}

export async function createClass(input: {
  label: string;
  board: BoardId;
  class: number;
  subject?: string;
}): Promise<TeacherClass> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in.");

  const { data, error } = await supabase
    .from("teacher_classes")
    .insert({
      user_id: user.id,
      label: input.label,
      board: input.board,
      class: input.class,
      subject: input.subject ?? "maths",
    })
    .select("id, label, board, class, subject, created_at")
    .single();
  if (error) throw error;
  return data as TeacherClass;
}

export async function deleteClass(classId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("teacher_classes").delete().eq("id", classId);
  if (error) throw error;
}

/** Skill ids this class has covered. */
export async function listCoverage(classId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teacher_coverage")
    .select("skill_id")
    .eq("class_id", classId);
  if (error) throw error;
  return (data ?? []).map((r) => r.skill_id as string);
}

/**
 * Tick or untick one skill. Writes immediately rather than batching on a save
 * button — the checklist is something she edits in passing over a whole term,
 * and an unsaved tick is a lost tick.
 */
export async function setCovered(
  classId: string,
  skillId: string,
  covered: boolean
): Promise<void> {
  const supabase = createClient();
  if (!covered) {
    const { error } = await supabase
      .from("teacher_coverage")
      .delete()
      .eq("class_id", classId)
      .eq("skill_id", skillId);
    if (error) throw error;
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in.");

  const { error } = await supabase
    .from("teacher_coverage")
    .upsert(
      { class_id: classId, user_id: user.id, skill_id: skillId, source: "checklist" },
      { onConflict: "class_id,skill_id" }
    );
  if (error) throw error;
}

/** Tick several at once — used when a whole topic is marked done. */
export async function setCoveredMany(
  classId: string,
  skillIds: string[],
  covered: boolean
): Promise<void> {
  const supabase = createClient();
  if (!skillIds.length) return;

  if (!covered) {
    const { error } = await supabase
      .from("teacher_coverage")
      .delete()
      .eq("class_id", classId)
      .in("skill_id", skillIds);
    if (error) throw error;
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in.");

  const { error } = await supabase.from("teacher_coverage").upsert(
    skillIds.map((skill_id) => ({
      class_id: classId,
      user_id: user.id,
      skill_id,
      source: "checklist",
    })),
    { onConflict: "class_id,skill_id" }
  );
  if (error) throw error;
}
