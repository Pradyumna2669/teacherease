"use client";

import { useState } from "react";
import {
  ScanLine,
  PencilLine,
  Sparkles,
  Check,
  Download,
  Share2,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { TranslitInput } from "@/components/Translit";
import {
  PAPER_LANGUAGE_LABELS,
  type PaperLanguage,
  type PaperSettings,
} from "@/lib/types";

// A guided path through making the first paper.
//
// The builder shows everything at once — three tabs, twenty question types, a
// settings panel — which is right for the second paper and wrong for the
// first. This asks one thing at a time, in the order a teacher already thinks
// in: whose paper is it, what is on it, does it look right.
//
// It drives the builder's own state rather than keeping its own, so "edit
// normally" at the end is just closing the overlay — nothing to save, nothing
// to reconcile.

type Step = 0 | 1 | 2;

const STEPS = ["Paper details", "Add questions", "Check and download"];

export default function StartWizard({
  settings,
  onPatch,
  questionCount,
  onScan,
  onAddQuestion,
  onGenerateAI,
  onDownload,
  onShare,
  exporting,
  onFinish,
}: {
  settings: PaperSettings;
  onPatch: (patch: Partial<PaperSettings>) => void;
  questionCount: number;
  onScan: () => void;
  onAddQuestion: () => void;
  onGenerateAI: () => void;
  onDownload: () => void;
  onShare?: () => void;
  exporting: boolean;
  /** Leave the guide and use the full builder. */
  onFinish: () => void;
}) {
  const [step, setStep] = useState<Step>(0);

  const field =
    "w-full px-3 py-3 min-h-[48px] border border-rule rounded-lg text-base bg-white focus:ring-2 focus:ring-ink focus:border-ink outline-none";
  const label = "block text-sm font-medium text-ink mb-1.5";

  return (
    <div className="fixed inset-0 z-40 bg-paper overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Where am I, and how much is left */}
        <div className="flex items-center gap-2 mb-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i <= step ? "bg-pen" : "bg-rule"
              }`}
            />
          ))}
        </div>
        <p className="font-mono text-xs tracking-[0.18em] uppercase text-graphite mb-4">
          Step {step + 1} of 3 · {STEPS[step]}
        </p>

        {step === 0 && (
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">
              Whose paper is this?
            </h1>
            <p className="text-sm text-graphite mt-1 mb-5">
              This is the heading printed at the top. You can change any of it
              later.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Which language is the paper in?
                </label>
                <select
                  value={settings.language}
                  onChange={(e) =>
                    onPatch({ language: e.target.value as PaperLanguage })
                  }
                  className={field}
                >
                  {(
                    Object.keys(PAPER_LANGUAGE_LABELS) as PaperLanguage[]
                  ).map((l) => (
                    <option key={l} value={l}>
                      {PAPER_LANGUAGE_LABELS[l]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-graphite mt-1.5">
                  Not English? You can still type in English letters — they turn
                  into the right script as you go.
                </p>
              </div>

              <div>
                <label className={label}>School name</label>
                <TranslitInput
                  value={settings.schoolName}
                  onChange={(e) => onPatch({ schoolName: e.target.value })}
                  placeholder="e.g. Zilla Parishad Primary School"
                  className={field}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Class</label>
                  <TranslitInput
                    value={settings.className}
                    onChange={(e) => onPatch({ className: e.target.value })}
                    placeholder="e.g. V"
                    className={field}
                  />
                </div>
                <div>
                  <label className={label}>Subject</label>
                  <TranslitInput
                    value={settings.subject}
                    onChange={(e) => onPatch({ subject: e.target.value })}
                    placeholder="e.g. Science"
                    className={field}
                  />
                </div>
              </div>

              <div>
                <label className={label}>What is this test called?</label>
                <TranslitInput
                  value={settings.assessmentTitle}
                  onChange={(e) => onPatch({ assessmentTitle: e.target.value })}
                  placeholder="e.g. Unit Test 1"
                  className={field}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Total marks</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={settings.totalMarks || ""}
                    onChange={(e) =>
                      onPatch({ totalMarks: Number(e.target.value) || 0 })
                    }
                    className={field}
                  />
                </div>
                <div>
                  <label className={label}>Time allowed</label>
                  <input
                    value={settings.timeAllowed}
                    onChange={(e) => onPatch({ timeAllowed: e.target.value })}
                    placeholder="e.g. 1 hr 30 min"
                    className={field}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">
              What is on the paper?
            </h1>
            <p className="text-sm text-graphite mt-1 mb-5">
              Already have it written on paper? Photograph it — that is the
              quickest way.
            </p>

            <button
              onClick={onScan}
              className="w-full flex items-start gap-3 text-left border-2 border-ink bg-white rounded-xl p-4 hover:bg-ink/5"
            >
              <ScanLine size={26} className="text-pen shrink-0 mt-0.5" />
              <span className="flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink text-base">
                    Photograph a paper
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    1 Paper · Unlimited pages
                  </span>
                </span>
                <span className="block text-sm text-graphite mt-0.5">
                  Take a photo of a handwritten or printed paper and it becomes
                  editable questions.
                </span>
              </span>
            </button>

            <button
              onClick={onAddQuestion}
              className="w-full flex items-start gap-3 text-left border border-rule bg-white rounded-xl p-4 mt-3 hover:bg-ink/5"
            >
              <PencilLine size={26} className="text-ink shrink-0 mt-0.5" />
              <span className="flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink text-base">
                    Type a question myself
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    Free
                  </span>
                </span>
                <span className="block text-sm text-graphite mt-0.5">
                  Fill in the blanks, multiple choice, match the pairs and more.
                </span>
              </span>
            </button>

            <button
              onClick={onGenerateAI}
              className="w-full flex items-start gap-3 text-left border border-rule bg-white rounded-xl p-4 mt-3 hover:bg-ink/5"
            >
              <Sparkles size={26} className="text-pen shrink-0 mt-0.5" />
              <span className="flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink text-base">
                    Generate using AI
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pen/10 text-pen shrink-0">
                    1 Paper
                  </span>
                </span>
                <span className="block text-sm text-graphite mt-0.5">
                  Give your syllabus, marks and instructions; AI creates the complete paper.
                </span>
              </span>
            </button>

            <div
              className={`mt-5 rounded-lg px-4 py-3 text-sm ${
                questionCount
                  ? "bg-ink/5 text-ink"
                  : "bg-white border border-dashed border-rule text-graphite"
              }`}
            >
              {questionCount ? (
                <span className="inline-flex items-center gap-2 font-medium">
                  <Check size={16} className="text-pen" />
                  {questionCount} question{questionCount > 1 ? "s" : ""} added so
                  far
                </span>
              ) : (
                "No questions yet. Add at least one to carry on."
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">
              Your paper is ready
            </h1>
            <p className="text-sm text-graphite mt-1 mb-5">
              {questionCount} question{questionCount === 1 ? "" : "s"} ·{" "}
              {settings.subject || "Subject"} ·{" "}
              {settings.className ? `Class ${settings.className}` : "Class"}
            </p>

            {onShare && (
              <button
                onClick={onShare}
                disabled={exporting}
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl px-4 py-4 min-h-[56px] text-base font-semibold hover:bg-emerald-700 disabled:opacity-60 shadow-sm mb-3"
              >
                {exporting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Share2 size={20} />
                )}
                {exporting ? "Preparing PDF…" : "Share PDF (WhatsApp)"}
              </button>
            )}

            <button
              onClick={onDownload}
              disabled={exporting}
              className="w-full inline-flex items-center justify-center gap-2 bg-pen text-white rounded-xl px-4 py-3.5 min-h-[52px] text-base font-semibold hover:bg-ink disabled:opacity-60"
            >
              {exporting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Download size={20} />
              )}
              {exporting ? "Making your PDF…" : "Download the PDF"}
            </button>

            <button
              onClick={onFinish}
              className="w-full mt-3 border border-rule bg-white rounded-xl px-4 py-3.5 min-h-[48px] text-base font-medium text-ink hover:bg-ink/5"
            >
              Change something first
            </button>

            <p className="text-xs text-graphite mt-4 text-center">
              Nothing is lost — the paper stays saved in My Papers.
            </p>
          </div>
        )}

        {/* Move between steps */}
        <div className="flex items-center gap-3 mt-7">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="inline-flex items-center gap-1.5 px-4 py-3 min-h-[48px] rounded-lg border border-rule bg-white text-ink font-medium hover:bg-ink/5"
            >
              <ArrowLeft size={17} /> Back
            </button>
          )}
          {step < 2 && (
            <button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={step === 1 && questionCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-ink text-white rounded-lg px-4 py-3 min-h-[48px] text-base font-semibold hover:bg-pen disabled:opacity-40"
            >
              {step === 0 ? "Next" : "See my paper"} <ArrowRight size={18} />
            </button>
          )}
        </div>

        {step < 2 && (
          <button
            onClick={onFinish}
            className="w-full mt-4 text-sm text-graphite underline underline-offset-2 py-2"
          >
            Skip the guide — let me do it myself
          </button>
        )}
      </div>
    </div>
  );
}
