"use client";

import { useEffect, useState } from "react";
import { MessageCircle, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_URL, COMMUNITY_NAME, COMMUNITY_SEEN_KEY } from "@/lib/community";
import { Modal } from "@/components/Modal";

// WhatsApp brand green — used only on the join controls so they read as "this
// opens WhatsApp" rather than as another TeacherEase action.
const WA = "#25D366";

function WhatsAppGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37s-1.04 1.02-1.04 2.48 1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.010-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.22-8.24 8.22z" />
    </svg>
  );
}

/** Persistent entry point. Sits in the dashboard header and on Account. */
export function JoinCommunityButton({
  variant = "subtle",
  className = "",
}: {
  variant?: "subtle" | "solid";
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors";
  const styles =
    variant === "solid"
      ? "text-white hover:opacity-90"
      : "text-graphite hover:text-ink hover:bg-rule";
  return (
    <a
      href={COMMUNITY_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={`Join the ${COMMUNITY_NAME} community on WhatsApp`}
      className={`${base} ${styles} ${className}`}
      style={variant === "solid" ? { backgroundColor: WA } : undefined}
    >
      <span style={variant === "subtle" ? { color: WA } : undefined}>
        <WhatsAppGlyph size={17} />
      </span>
      <span className="hidden sm:inline">Community</span>
    </a>
  );
}

/**
 * Shown once per teacher — after signup, and once to everyone who already had
 * an account. The "seen" flag lives on the auth user's metadata so dismissing
 * it on a phone also dismisses it on a laptop.
 */
export function CommunityPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      if (user.user_metadata?.[COMMUNITY_SEEN_KEY]) return;
      setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mark seen optimistically — a failed write just means they see it once more,
  // which is far better than blocking the dialog from closing.
  async function dismiss() {
    setOpen(false);
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({ data: { [COMMUNITY_SEEN_KEY]: true } });
    } catch {
      /* ignore */
    }
  }

  if (!open) return null;

  return (
    <Modal
      title="Join the TeacherEase teachers community"
      subtitle="Free WhatsApp group · you can leave any time"
      onClose={dismiss}
      footer={
        <>
          <button
            onClick={dismiss}
            className="px-4 py-3 lg:py-2 min-h-[44px] lg:min-h-0 text-sm text-graphite hover:text-ink rounded-lg"
          >
            Maybe later
          </button>
          <a
            href={COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="inline-flex items-center justify-center gap-2 text-white px-5 py-3 lg:py-2 min-h-[44px] lg:min-h-0 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: WA }}
          >
            <WhatsAppGlyph size={17} />
            Join group
            <ExternalLink size={14} />
          </a>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-graphite leading-relaxed">
          TeacherEase is built from what teachers actually ask for. The group is where
          those requests land — and where you will hear first when they ship.
        </p>
        <ul className="space-y-2">
          {[
            "Ask for a question type you need — diagram labels, assertion-reason, anything",
            "Request a language, board format or class we do not cover yet",
            "Report a paper that scanned wrong so we can fix it",
            "Get told when new features go live",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-ink">
              <MessageCircle size={15} className="mt-0.5 shrink-0" style={{ color: WA }} />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-graphite">
          Your number is visible to other members of the group, the same as any
          WhatsApp group. Nothing is posted on your behalf.
        </p>
      </div>
    </Modal>
  );
}
