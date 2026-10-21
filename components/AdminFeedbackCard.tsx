"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Gift, Loader2, ExternalLink, Star } from "lucide-react";
import { type TeacherFeedbackItem } from "@/lib/admin";

export default function AdminFeedbackCard({ fb }: { fb: TeacherFeedbackItem }) {
  const [status, setStatus] = useState(fb.status);
  const [rewarded, setRewarded] = useState(fb.creditsRewarded || 0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleVerifyAndReward() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackId: fb.id,
          userId: fb.userId,
          action: "verify_and_reward",
          amount: 50,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify");
      setStatus("verified");
      setRewarded(data.creditsRewarded || 50);
      setMsg("50 credits granted & verified!");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error verifying");
    } finally {
      setBusy(false);
    }
  }

  async function handleDismiss() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/admin/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackId: fb.id,
          action: "dismiss",
        }),
      });
      setStatus("dismissed");
    } catch {}
    finally {
      setBusy(false);
    }
  }

  const hasDetails = (fb.expectedFeatures && fb.expectedFeatures.length > 0) || Boolean(fb.feedbackText?.trim());

  return (
    <div className="border border-rule/80 rounded-xl p-4 bg-paper/30 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-ink">{fb.email}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-mono uppercase text-[10px] bg-rule text-graphite">
            {fb.method}
          </span>
          {fb.rating && (
            <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
              <Star size={13} className="fill-amber-400 text-amber-400" />
              {fb.rating}/5
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-graphite">
            {fb.createdAt ? new Date(fb.createdAt).toLocaleString("en-IN") : "—"}
          </span>
          {status === "verified" ? (
            <span className="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 size={12} />
              Verified {rewarded > 0 ? `(+${rewarded} cr)` : ""}
            </span>
          ) : status === "dismissed" ? (
            <span className="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Dismissed
            </span>
          ) : (
            <span className="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Pending
            </span>
          )}
        </div>
      </div>

      {/* Feature tags */}
      {fb.expectedFeatures && fb.expectedFeatures.length > 0 && (
        <div>
          <div className="text-[11px] font-medium text-graphite mb-1">Expected Features:</div>
          <div className="flex flex-wrap gap-1.5">
            {fb.expectedFeatures.map((f, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-md bg-pen/10 text-pen border border-pen/20"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Written text or empty state explanation */}
      {fb.feedbackText ? (
        <div>
          <div className="text-[11px] font-medium text-graphite mb-1">Written Feedback:</div>
          <p className="text-xs sm:text-sm text-ink bg-white border border-rule/60 rounded-lg p-2.5">
            &ldquo;{fb.feedbackText}&rdquo;
          </p>
        </div>
      ) : !hasDetails ? (
        <p className="text-xs text-graphite italic bg-white/60 border border-rule/40 rounded-lg p-2">
          Rating submitted without additional written text or feature selections.
        </p>
      ) : null}

      {/* Associated paper link */}
      {fb.paperId && (
        <div className="pt-1 flex items-center gap-1.5 text-xs text-graphite">
          <span>Paper ID:</span>
          <Link
            href={`/builder?id=${fb.paperId}`}
            target="_blank"
            className="text-pen hover:underline font-mono inline-flex items-center gap-1"
          >
            {fb.paperId.slice(0, 8)}… <ExternalLink size={12} />
          </Link>
        </div>
      )}

      {/* Verification Actions */}
      {status === "pending" && (
        <div className="pt-2 flex items-center justify-between border-t border-rule/60">
          {msg ? (
            <span className="text-xs text-emerald-700 font-medium">{msg}</span>
          ) : (
            <span className="text-xs text-graphite">Review feedback and reward teacher:</span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              disabled={busy}
              className="px-2.5 py-1 text-xs text-graphite hover:text-ink border border-rule rounded-lg hover:bg-rule/40 transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleVerifyAndReward}
              disabled={busy}
              className="px-3 py-1 text-xs font-semibold text-white bg-pen rounded-lg hover:opacity-95 disabled:opacity-50 transition-opacity flex items-center gap-1.5 shadow-sm"
            >
              {busy ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  <Gift size={13} /> Verify &amp; Grant 50 Credits
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
