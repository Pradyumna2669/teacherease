"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, KeyRound } from "lucide-react";
import { postJson } from "@/lib/api-client";
import { answerableItems } from "@/lib/answers";
import { CREDIT_COSTS } from "@/lib/credit-packs";
import { inAndroidApp, OUT_OF_CREDITS } from "@/lib/twa";
import type { PaperSettings, Question } from "@/lib/types";

// The answer key, edited as a key.
//
// The alternative was an answer box under every item in the editor, which
// would have put a second field on eleven separate question editors and made
// the paper harder to read while writing it. Here the teacher sees the key in
// the order it prints, which is also the order she marks in.
//
// Off unless she turns it on. Most papers are handed to students.

export default function AnswerKeyPanel({
  settings,
  questions,
  onChange,
  onSetAnswer,
  paperId,
}: {
  settings: PaperSettings;
  questions: Question[];
  onChange: (updates: Partial<PaperSettings>) => void;
  /** id is "i:<itemId>" or "q:<questionId>", as answerableItems produces. */
  onSetAnswer: (id: string, answer: string) => void;
  paperId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inApp, setInApp] = useState<boolean | null>(null);
  useEffect(() => setInApp(inAndroidApp()), []);

  const on = settings.answerKey;
  const rows = on ? answerableItems(questions) : [];

  // Current answer for a row, read back out of the paper itself so the panel
  // never holds a second copy that could drift.
  const valueFor = (id: string): string => {
    if (id.startsWith("q:")) {
      const q = questions.find((x) => `q:${x.id}` === id);
      return q?.answerNote || "";
    }
    for (const q of questions) {
      const item = q.items.find((x) => `i:${x.id}` === id);
      if (item) return item.answer || "";
    }
    return "";
  };

  const filled = rows.filter((r) => valueFor(r.id).trim()).length;

  async function writeAnswers() {
    setBusy(true);
    setError(null);
    try {
      const data = await postJson<{ answers: { id: string; answer: string }[] }>(
        "/api/answers",
        { questions, settings, paperId }
      );
      for (const a of data.answers) onSetAnswer(a.id, a.answer);
      if (!data.answers.length) setError("No answers came back. Try again.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not write the answers.";
      // Inside the Android app there is nowhere to send her to buy credits,
      // so the message must not mention topping up. See lib/twa.ts.
      setError(
        inApp && /credit|[Tt]op up/.test(message) ? OUT_OF_CREDITS : message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-rule pt-4">
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onChange({ answerKey: e.target.checked })}
          className="accent-ink mt-1 w-4 h-4"
        />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <KeyRound size={15} className="text-pen" />
            Print an answer key
          </span>
          <span className="block text-xs text-graphite mt-0.5">
            Added on its own page at the end — never on the question paper the
            students get.
          </span>
        </span>
      </label>

      {on && (
        <div className="mt-4">
          {rows.length === 0 ? (
            <p className="text-xs text-graphite">
              Nothing here needs an answer yet. Add some questions first.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <p className="text-xs text-graphite">
                  {filled} of {rows.length} answered
                </p>
                <button
                  onClick={writeAnswers}
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-3 py-2.5 min-h-[44px] lg:min-h-0 lg:py-2 bg-ink text-white rounded-lg text-sm font-medium hover:bg-pen disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  {busy
                    ? "Writing the answers…"
                    : `Write them for me · ${CREDIT_COSTS.answers} credits`}
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-3">
                {rows.map((r) => (
                  <div key={r.id}>
                    <p className="text-xs text-graphite mb-1">
                      <span className="font-semibold text-ink">{r.label}.</span>{" "}
                      {r.text.length > 90 ? r.text.slice(0, 90) + "…" : r.text}
                    </p>
                    <input
                      value={valueFor(r.id)}
                      onChange={(e) => onSetAnswer(r.id, e.target.value)}
                      placeholder="Answer"
                      className="w-full px-3 py-2.5 min-h-[44px] lg:min-h-0 lg:py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
                    />
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-graphite mt-3">
                Check every answer before you print. The AI is usually right and
                occasionally confidently wrong.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
