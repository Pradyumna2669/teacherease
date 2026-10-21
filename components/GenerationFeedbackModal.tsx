"use client";

import { useState } from "react";
import { Star, Gift, CheckCircle2, X, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { postJson } from "@/lib/api-client";

const EXPECTED_FEATURE_OPTIONS = [
  { id: "ncert_chapters", label: "NCERT / State Board textbook chapter alignment" },
  { id: "answer_keys", label: "Auto-generated Answer Keys & Marking Scheme" },
  { id: "school_header", label: "School Header & Custom Logo (CBSE / State style)" },
  { id: "multiple_sets", label: "Multiple Sets for anti-cheating (Set A, B, C)" },
  { id: "math_diagrams", label: "Better math formulas, equations & diagrams" },
  { id: "clean_docx", label: "Clean Word (.docx) export for easy editing" },
  { id: "more_q_types", label: "Case-based & Assertion-Reason question types" },
  { id: "paper_pricing", label: "Cheaper pricing / Unlimited monthly paper pass" },
  { id: "regional_lang", label: "Regional language accuracy (Hindi, Marathi, etc.)" },
];

export default function GenerationFeedbackModal({
  onClose,
  method = "ai_generated",
  paperId,
}: {
  onClose: () => void;
  method?: "ai_generated" | "scanned" | "ai_textbook";
  paperId?: string | null;
}) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleFeature(label: string) {
    setSelectedFeatures((prev) =>
      prev.includes(label) ? prev.filter((f) => f !== label) : [...prev, label]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0 && selectedFeatures.length === 0 && !feedbackText.trim()) {
      setError("Please select a rating or check the features you need.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await postJson("/api/feedback", {
        rating: rating || null,
        expectedFeatures: selectedFeatures,
        feedbackText: feedbackText.trim(),
        method,
        paperId: paperId || null,
      });

      // Mark in storage so we don't prompt repeatedly in this session
      try {
        sessionStorage.setItem("teacherease_feedback_submitted", "true");
        if (paperId) localStorage.setItem(`teacherease_feedback_${paperId}`, "true");
      } catch {
        // ignore storage errors
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const ratingLabels: Record<number, string> = {
    1: "Very disappointed",
    2: "Needs major changes",
    3: "Average / Needs tweaks",
    4: "Good paper",
    5: "Excellent, exactly what I needed!",
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-paper border border-rule w-full max-w-lg rounded-2xl shadow-xl overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-rule px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-pen/10 text-pen flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-base sm:text-lg text-ink">
                How did your generated paper turn out?
              </h2>
              <p className="text-xs text-graphite">
                Help us build the exact paper generator you need
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-graphite hover:text-ink rounded-lg hover:bg-rule/40 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {submitted ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={26} />
              </div>
              <h3 className="font-display font-semibold text-lg text-ink">
                Feedback Submitted!
              </h3>
              <p className="text-xs sm:text-sm text-graphite max-w-sm mx-auto">
                Thank you for your valuable feedback. Our team reviews each submission, and{" "}
                <span className="font-semibold text-pen">50 bonus credits</span> will be added to your
                account upon verification!
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-semibold text-white bg-pen rounded-lg hover:opacity-90 transition-opacity"
                >
                  Continue Editing Paper
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Verification reward banner */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5">
                <Gift size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <span className="font-semibold">Credit Reward after verification:</span> Share your
                  honest feedback on what features you expected. Our team reviews every response and
                  rewards <span className="font-semibold text-amber-950">50 bonus credits</span> to
                  your account after verification!
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  {error}
                </div>
              )}

              {/* Star Rating */}
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  1. Did the questions meet your expectations?
                </label>
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 text-slate-300 hover:scale-110 transition-transform focus:outline-none"
                    >
                      <Star
                        size={26}
                        className={
                          (hoverRating || rating) >= star
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300"
                        }
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs text-graphite font-medium">
                    {ratingLabels[hoverRating || rating] || "Select a rating"}
                  </span>
                </div>
              </div>

              {/* Feature Expectation Checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                  2. What features or improvements were you expecting?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXPECTED_FEATURE_OPTIONS.map((f) => {
                    const isSelected = selectedFeatures.includes(f.label);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFeature(f.label)}
                        className={`text-left px-3 py-2 rounded-lg text-xs border transition-all flex items-start gap-2 ${
                          isSelected
                            ? "border-pen bg-pen/5 text-pen font-medium"
                            : "border-rule/80 bg-white text-graphite hover:border-rule hover:text-ink"
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? "border-pen bg-pen text-white" : "border-graphite/40"
                          }`}
                        >
                          {isSelected && <CheckCircle2 size={10} />}
                        </span>
                        <span className="leading-snug">{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Textarea for specific feedback */}
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  3. What should we build or fix so you can make all your papers here?
                </label>
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g., I teach Class 8 Maths CBSE. I need chapter-wise questions from NCERT with an answer key and proper section division..."
                  className="w-full text-xs sm:text-sm p-3 border border-rule rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-pen/20 focus:border-pen text-ink resize-none placeholder:text-graphite/60"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-rule">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="text-xs text-graphite hover:text-ink px-3 py-2 rounded-lg transition-colors"
                >
                  Maybe later
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-pen rounded-lg hover:opacity-95 disabled:opacity-50 transition-opacity flex items-center gap-1.5 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "Submit Feedback"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
