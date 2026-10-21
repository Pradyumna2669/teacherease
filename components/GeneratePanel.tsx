"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Check, Sparkles, X, ChevronLeft } from "lucide-react";
import {
  listClasses,
  createClass,
  listCoverage,
  setCoveredMany,
  type TeacherClass,
} from "@/lib/coverage";
import { CONCEPTS, CONCEPT_BY_ID, SKILL_BY_ID, STRAND_LABELS } from "@/lib/curriculum/skills";
import { BOARDS, MVP_CLASSES, cumulativeScope } from "@/lib/curriculum/boards";
import { buildPaper } from "@/lib/curriculum/generate";
import { fetchBankItems } from "@/lib/curriculum/bank";
import { SUBJECTS, isGeneratable, subjectLabel } from "@/lib/curriculum/subjects";
import type { BoardId, Band } from "@/lib/curriculum/types";
import type { PaperLanguage, Question } from "@/lib/types";

// Generating a paper from what the teacher has taught.
//
// The whole thing runs in the browser: the skill graph and the templates are
// plain data and pure functions, with no secrets and no model call. So there is
// no round trip, no server cost, and nothing to meter — generating a paper is
// free and instant, and only the AI paths ever spend credits.
//
// Three screens, and after the first week she only ever sees the third.

type Screen = "class" | "coverage" | "make";

export default function GeneratePanel({
  language,
  onGenerated,
  onClose,
}: {
  language: PaperLanguage;
  /** Questions to append to the paper being built. */
  onGenerated: (questions: Question[], note: string) => void;
  onClose: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("class");
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [active, setActive] = useState<TeacherClass | null>(null);
  const [covered, setCovered] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New-class form
  const [label, setLabel] = useState("");
  const [board, setBoard] = useState<BoardId>("cbse");
  const [cls, setCls] = useState(3);
  const [subject, setSubject] = useState("maths");

  // Make-a-paper form
  const [marks, setMarks] = useState(40);
  const [level, setLevel] = useState<Band | "mixed">("mixed");

  useEffect(() => {
    listClasses()
      .then((rows) => {
        setClasses(rows);
        if (rows.length) {
          setActive(rows[0]);
          setScreen("make");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load your classes."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!active) return;
    listCoverage(active.id)
      .then((ids) => setCovered(new Set(ids)))
      .catch(() => setCovered(new Set()));
  }, [active]);

  /** Concepts this board teaches by this class, with their skills. */
  const topics = useMemo(() => {
    if (!active || !isGeneratable(active.subject)) return [];
    const scope = cumulativeScope(active.board, active.class);
    return CONCEPTS.map((concept) => {
      const skills = Array.from(scope)
        .filter((id) => SKILL_BY_ID.get(id)?.concept === concept.id)
        .sort();
      return { concept, skills };
    }).filter((t) => t.skills.length > 0);
  }, [active]);

  const coveredCount = topics.reduce(
    (n, t) => n + t.skills.filter((s) => covered.has(s)).length,
    0
  );
  const totalSkills = topics.reduce((n, t) => n + t.skills.length, 0);

  const toggleTopic = useCallback(
    async (skills: string[], on: boolean) => {
      if (!active) return;
      // Optimistic: a checklist that lags every tap feels broken.
      setCovered((prev) => {
        const next = new Set(prev);
        for (const s of skills) on ? next.add(s) : next.delete(s);
        return next;
      });
      try {
        await setCoveredMany(active.id, skills, on);
      } catch {
        setError("That tick did not save. Check your connection.");
      }
    },
    [active]
  );

  async function addClass() {
    if (!label.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const row = await createClass({ label: label.trim(), board, class: cls, subject });
      setClasses((c) => [row, ...c]);
      setActive(row);
      setScreen("coverage");
      setLabel("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the class.");
    } finally {
      setBusy(false);
    }
  }

  async function makePaper() {
    if (!active) return;
    const skills = Array.from(covered);
    if (!skills.length) {
      setError("Tick what you have taught first, so the paper only asks that.");
      setScreen("coverage");
      return;
    }
    setError(null);
    setBusy(true);
    // One round trip for the curated questions; the assembly itself stays a
    // pure function running here on her phone.
    const bankItems = await fetchBankItems({
      board: active.board,
      class: active.class,
      subject: active.subject,
      skills,
    });
    setBusy(false);
    const result = buildPaper({
      board: active.board,
      class: active.class,
      skills,
      marks,
      level,
      language,
      bankItems,
    });
    if (!result.questions.length) {
      setError("Nothing could be generated for those topics yet. Try ticking a few more.");
      return;
    }
    const short = result.marksPlaced < marks;
    onGenerated(
      result.questions,
      short
        ? `Added ${result.marksPlaced} marks of ${marks} — some topics have no questions yet.`
        : `Added a ${result.marksPlaced}-mark paper.`
    );
  }

  const field =
    "w-full px-3 py-3 min-h-[48px] border border-rule rounded-lg text-base bg-white focus:ring-2 focus:ring-ink focus:border-ink outline-none";

  return (
    <div className="fixed inset-0 z-50 bg-paper overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            {screen !== "make" && classes.length > 0 && (
              <button
                onClick={() => setScreen("make")}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center -ml-2 text-graphite hover:text-ink"
                aria-label="Back"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <h2 className="font-display text-xl font-semibold text-ink">
              {screen === "class" ? "Which class?" : screen === "coverage" ? "What have you taught?" : "Make a paper"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-graphite hover:text-ink"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-graphite inline-flex items-center gap-2">
            <Loader2 size={15} className="animate-spin" /> Loading your classes…
          </p>
        ) : screen === "class" ? (
          <div className="space-y-4">
            <p className="text-sm text-graphite">
              Set this up once. After that, making a paper takes three taps.
            </p>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Name it</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Class 3 A"
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Board</label>
              <select value={board} onChange={(e) => setBoard(e.target.value as BoardId)} className={field}>
                {BOARDS.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Class</label>
              <select value={cls} onChange={(e) => setCls(Number(e.target.value))} className={field}>
                {MVP_CLASSES.map((c) => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={field}
              >
                {SUBJECTS.map((sub) => (
                  <option key={sub.id} value={sub.id} disabled={!sub.ready}>
                    {sub.label}
                    {sub.ready ? "" : " — coming soon"}
                  </option>
                ))}
              </select>
              <p className="text-xs text-graphite mt-1.5">
                Only Maths can be generated so far, Classes 3 to 5. You can still
                scan or type a paper for any subject.
              </p>
            </div>
            <button
              onClick={addClass}
              disabled={busy || !label.trim()}
              className="w-full bg-ink text-white rounded-lg px-4 py-3 min-h-[48px] font-semibold hover:bg-pen disabled:opacity-40"
            >
              {busy ? "Adding…" : "Next"}
            </button>
          </div>
        ) : screen === "coverage" ? (
          <div>
            {active && !isGeneratable(active.subject) ? (
              <p className="text-sm text-graphite">
                There are no topics to tick for {subjectLabel(active.subject)}
                {" "}yet — only Maths is ready, for Classes 3 to 5.
              </p>
            ) : (
            <>
            <p className="text-sm text-graphite mb-1">
              Tick the topics you have finished. Papers only ask what is ticked.
            </p>
            <p className="font-mono text-xs text-graphite mb-4">
              {coveredCount} of {totalSkills} ticked
            </p>

            <div className="flex flex-col gap-2">
              {topics.map(({ concept, skills }) => {
                const done = skills.filter((s) => covered.has(s)).length;
                const all = done === skills.length;
                return (
                  <button
                    key={concept.id}
                    onClick={() => toggleTopic(skills, !all)}
                    className={`flex items-center gap-3 text-left border rounded-xl px-4 py-3 min-h-[56px] ${
                      all ? "border-ink bg-ink/5" : "border-rule bg-white hover:bg-ink/5"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-md border shrink-0 inline-flex items-center justify-center ${
                        all ? "bg-ink border-ink text-white" : done ? "border-ink text-ink" : "border-rule"
                      }`}
                    >
                      {all ? <Check size={15} /> : done ? <span className="text-[10px] font-bold">{done}</span> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{concept.label}</span>
                      <span className="block text-xs text-graphite">
                        {STRAND_LABELS[CONCEPT_BY_ID.get(concept.id)!.strand]} · {skills.length} skill
                        {skills.length > 1 ? "s" : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            </>
            )}

            <button
              onClick={() => setScreen("make")}
              className="w-full mt-5 bg-ink text-white rounded-lg px-4 py-3 min-h-[48px] font-semibold hover:bg-pen"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {classes.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Class</label>
                <select
                  value={active?.id ?? ""}
                  onChange={(e) => setActive(classes.find((c) => c.id === e.target.value) ?? null)}
                  className={field}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="border border-rule rounded-xl bg-white px-4 py-3">
              <p className="text-sm text-ink font-medium">{active?.label}</p>
              <p className="text-xs text-graphite mt-0.5">
                {BOARDS.find((b) => b.id === active?.board)?.label} · Class {active?.class} ·{" "}
                {subjectLabel(active?.subject ?? "")}
                {active && isGeneratable(active.subject)
                  ? ` · ${coveredCount} of ${totalSkills} topics ticked`
                  : ""}
              </p>
              <button
                onClick={() => setScreen("coverage")}
                className="text-xs text-pen underline underline-offset-2 mt-1.5"
              >
                Change what you have taught
              </button>
            </div>

            {active && !isGeneratable(active.subject) ? (
              <div className="border border-rule rounded-xl bg-white px-4 py-4">
                <p className="text-sm text-ink font-medium">
                  Questions cannot be made for {subjectLabel(active.subject)} yet.
                </p>
                <p className="text-sm text-graphite mt-1.5">
                  Only Maths is ready so far, for Classes 3 to 5. Showing you
                  maths topics for a {subjectLabel(active.subject)} class would
                  be worse than saying so.
                </p>
                <p className="text-sm text-graphite mt-3">
                  You can still build this paper the usual ways — photograph a
                  paper you already have, or type the questions yourself.
                </p>
                <button
                  onClick={onClose}
                  className="w-full mt-4 bg-ink text-white rounded-lg px-4 py-3 min-h-[48px] font-semibold hover:bg-pen"
                >
                  Back to the paper
                </button>
              </div>
            ) : (
            <>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Marks</label>
              <div className="flex flex-wrap gap-2">
                {[20, 30, 40, 50, 80].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarks(m)}
                    className={`px-4 py-2.5 min-h-[44px] rounded-lg border text-sm font-medium ${
                      marks === m ? "bg-ink text-white border-ink" : "border-rule bg-white text-ink hover:bg-ink/5"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-2">How hard?</label>
              <div className="flex flex-wrap gap-2">
                {(["easy", "mixed", "hard"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`px-4 py-2.5 min-h-[44px] rounded-lg border text-sm font-medium capitalize ${
                      level === l ? "bg-ink text-white border-ink" : "border-rule bg-white text-ink hover:bg-ink/5"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={makePaper}
              disabled={coveredCount === 0 || busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-pen text-white rounded-xl px-4 py-4 min-h-[56px] text-base font-semibold hover:bg-ink disabled:opacity-40"
            >
              {busy ? <Loader2 size={19} className="animate-spin" /> : <Sparkles size={19} />}
              {busy ? "Making the paper…" : "Make the paper"}
            </button>

            <p className="text-xs text-graphite text-center">
              {coveredCount === 0
                ? "Tick what you have taught first — papers only ask what is ticked."
                : "Free — the questions are worked out on your phone, not by AI. Every sum is checked before it reaches the page."}
            </p>
            </>
            )}

            {classes.length > 0 && (
              <button
                onClick={() => setScreen("class")}
                className="w-full text-sm text-graphite underline underline-offset-2 py-2"
              >
                Add another class
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
