import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Records failures in the paid paths so they reach the admin dashboard instead
// of dying silently in someone's browser. Never throws: a logging problem must
// not turn a handled error into an unhandled one.

export type ErrorAction =
  | "scan"
  | "generate_questions"
  | "create_paper"
  | "subscription_renewal";

export interface LogErrorInput {
  action: ErrorAction;
  status: number;
  message: string;
  userId?: string | null;
  /** Non-sensitive shape info only — never request bodies or image data. */
  context?: Record<string, unknown>;
  /** True only if the teacher was charged despite this failure. */
  charged?: boolean;
}

export async function logError({
  action,
  status,
  message,
  userId,
  context = {},
  charged = false,
}: LogErrorInput): Promise<void> {
  // Always leave a trace in the platform logs even if the insert fails.
  console.error(`[${action}] ${status} ${message}`, context);
  try {
    const admin = createAdminClient();
    await admin.from("error_log").insert({
      user_id: userId ?? null,
      action,
      status,
      message: message.slice(0, 500),
      context,
      charged,
    });
  } catch (err) {
    console.error("[error-log] could not record failure", err);
  }
}
