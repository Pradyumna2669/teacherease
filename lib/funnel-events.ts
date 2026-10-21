import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type FunnelEvent =
  | "signup"
  | "paper_created"
  | "paper_generated"
  | "first_paper_completed"
  | "second_paper_completed"
  | "paper_previewed"
  | "paper_downloaded_pdf"
  | "paper_downloaded_docx"
  | "answer_key_generated"
  | "question_bank_used"
  | "payment_started"
  | "payment_completed";

const SAFE_KEYS = new Set([
  "mode",
  "questionCount",
  "sourcePageCount",
  "exportFormat",
  "hasAnswerKey",
  "hasSourcePdf",
  "paperCount",
  "planId",
  "packId",
  "amountInr",
  "provider",
  "source",
]);

export async function recordFunnelEvent(
  event: FunnelEvent,
  userId: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const safeMetadata = Object.fromEntries(
    Object.entries(metadata)
      .filter(([key, value]) => SAFE_KEYS.has(key) && ["string", "number", "boolean"].includes(typeof value))
      .slice(0, 10)
  );

  try {
    await createAdminClient().from("funnel_events").insert({
      event,
      user_id: userId,
      metadata: safeMetadata,
    });
  } catch (error) {
    console.error("[funnel-events] could not record event", error);
  }
}
