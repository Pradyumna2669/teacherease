"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { BankItem, BankSubject } from "@/lib/question-bank";
import {
  evaluateBlueprintReadiness,
  synthesizeCollegePaper,
} from "@/lib/college-blueprint";

interface Props {
  subject: BankSubject;
  bankQuestions: BankItem[];
  onClose: () => void;
}

const DEFAULT_COLLEGE_BLUEPRINT = {
  name: "End Sem 60 Marks (Autonomous Pattern)",
  total_marks: 60,
  blueprint: {
    groups: [
      {
        q_no: 1,
        title: "Solve the following questions (Unit 1 & 2)",
        A: [
          { unit_no: 1, marks: 2, count: 2 },
          { unit_no: 2, marks: 2, count: 1 },
        ],
        B: [
          { unit_no: 1, marks: 4, count: 3 },
          { unit_no: 2, marks: 4, count: 3 },
        ],
      },
      {
        q_no: 2,
        title: "Solve the following questions (Unit 3 & 4)",
        A: [
          { unit_no: 3, marks: 2, count: 2 },
          { unit_no: 4, marks: 2, count: 1 },
        ],
        B: [
          { unit_no: 3, marks: 4, count: 3 },
          { unit_no: 4, marks: 4, count: 3 },
        ],
      },
      {
        q_no: 3,
        title: "Solve the following questions (Unit 5 & 6)",
        A: [
          { unit_no: 5, marks: 2, count: 2 },
          { unit_no: 6, marks: 2, count: 1 },
        ],
        B: [
          { unit_no: 5, marks: 4, count: 3 },
          { unit_no: 6, marks: 4, count: 3 },
        ],
      },
    ],
  },
};

export default function CollegeBlueprintModal({
  subject,
  bankQuestions,
  onClose,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [cycles, setCycles] = useState<{ id: string; name: string }[]>([]);
  const [cycleId, setCycleId] = useState("");
  const [newCycleName, setNewCycleName] = useState("");
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [variant, setVariant] = useState<"normal" | "backlog">("normal");
  const [issuedIds, setIssuedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing cycles for this subject
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("exam_cycles")
          .select("id, name")
          .eq("subject_id", subject.id)
          .order("created_at", { ascending: false });
        if (data && data.length > 0) {
          setCycles(data);
          setCycleId(data[0].id);
        } else {
          // Pre-populate Summer 2026 as default
          setNewCycleName("Summer 2026 Examination");
          setShowNewCycle(true);
        }
      } catch {
        setShowNewCycle(true);
      }
    })();
  }, [subject.id, supabase]);

  // When cycleId changes, load question IDs already issued under this cycle (for backlog non-repetition)
  useEffect(() => {
    if (!cycleId) {
      setIssuedIds(new Set());
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("papers")
          .select("questions")
          .eq("cycle_id", cycleId);
        const set = new Set<string>();
        (data || []).forEach((row: any) => {
          if (Array.isArray(row.questions)) {
            row.questions.forEach((q: any) => {
              if (q.id) set.add(q.id);
              if (Array.isArray(q.items)) {
                q.items.forEach((it: any) => {
                  if (it.id) set.add(it.id);
                });
              }
            });
          }
        });
        setIssuedIds(set);
      } catch {
        setIssuedIds(new Set());
      }
    })();
  }, [cycleId, supabase]);

  // Compute live readiness analysis
  const readiness = useMemo(() => {
    return evaluateBlueprintReadiness(
      DEFAULT_COLLEGE_BLUEPRINT.blueprint,
      bankQuestions,
      issuedIds,
      variant
    );
  }, [bankQuestions, issuedIds, variant]);

  async function handleGenerate() {
    setError(null);
    setBusy(true);

    try {
      let finalCycleId = cycleId;

      if (showNewCycle && newCycleName.trim()) {
        const { data: newCyc, error: cycErr } = await supabase
          .from("exam_cycles")
          .insert({
            subject_id: subject.id,
            name: newCycleName.trim(),
          })
          .select("id")
          .single();
        if (cycErr) throw cycErr;
        finalCycleId = newCyc.id;
      }

      // Synthesize questions using deterministic non-repetition algorithm
      const synthesizedQuestions = synthesizeCollegePaper(
        DEFAULT_COLLEGE_BLUEPRINT.blueprint,
        bankQuestions,
        issuedIds,
        variant
      );

      const paperPayload = {
        title: `${subject.code || subject.name} — ${DEFAULT_COLLEGE_BLUEPRINT.name} (${variant.toUpperCase()})`,
        subject: subject.name,
        class_name: subject.class_name || (subject.semester ? `Semester ${subject.semester}` : ""),
        course_code: subject.code,
        semester: subject.semester,
        department: subject.department,
        total_marks: DEFAULT_COLLEGE_BLUEPRINT.total_marks,
        layout_mode: "college_table",
        variant,
        cycle_id: finalCycleId || null,
        questions: synthesizedQuestions,
      };

      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paperPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.id) {
        throw new Error(data.error || "Could not synthesize college question paper.");
      }

      router.push(`/builder?id=${data.id}`);
    } catch (err: any) {
      setError(err.message || "Paper synthesis failed.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90dvh] flex flex-col shadow-2xl border border-rule overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between bg-paper/50">
          <div className="flex items-center gap-2">
            <FileCheck2 className="text-pen" size={20} />
            <div>
              <h2 className="font-semibold text-ink text-base">
                Autonomous Paper Synthesis
              </h2>
              <p className="text-xs text-graphite">
                {subject.code ? `${subject.code} · ` : ""}{subject.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-graphite hover:text-ink hover:bg-rule/40 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Exam Cycle Selector */}
          <div>
            <label className="font-semibold text-ink text-xs block mb-1.5 uppercase tracking-wide">
              1. Examination Cycle Sitting
            </label>
            {showNewCycle ? (
              <div className="flex items-center gap-2">
                <input
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  placeholder="e.g. Summer 2026 Examination"
                  className="flex-1 px-3 py-2 text-sm border border-rule rounded-lg focus:ring-2 focus:ring-pen/20 focus:border-pen outline-none"
                />
                {cycles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowNewCycle(false)}
                    className="text-xs text-graphite hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={cycleId}
                  onChange={(e) => setCycleId(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-rule rounded-lg focus:ring-2 focus:ring-pen/20 focus:border-pen outline-none"
                >
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCycle(true)}
                  className="flex items-center gap-1 text-xs text-pen font-medium px-2 py-2 border border-rule rounded-lg hover:bg-paper"
                >
                  <Plus size={14} /> New
                </button>
              </div>
            )}
          </div>

          {/* Paper Variant Selector */}
          <div>
            <label className="font-semibold text-ink text-xs block mb-1.5 uppercase tracking-wide">
              2. Paper Variant
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  variant === "normal"
                    ? "border-pen bg-pen/5 text-ink ring-1 ring-pen/20"
                    : "border-rule bg-white text-graphite hover:border-graphite"
                }`}
              >
                <input
                  type="radio"
                  name="variant"
                  value="normal"
                  checked={variant === "normal"}
                  onChange={() => setVariant("normal")}
                  className="mt-0.5 accent-pen"
                />
                <div>
                  <b className="block text-ink text-xs">Regular Exam Sitting</b>
                  <span className="text-[11px] leading-tight block">
                    Draws freshly from active question bank.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  variant === "backlog"
                    ? "border-pen bg-pen/5 text-ink ring-1 ring-pen/20"
                    : "border-rule bg-white text-graphite hover:border-graphite"
                }`}
              >
                <input
                  type="radio"
                  name="variant"
                  value="backlog"
                  checked={variant === "backlog"}
                  onChange={() => setVariant("backlog")}
                  className="mt-0.5 accent-pen"
                />
                <div>
                  <b className="block text-ink text-xs">Backlog Examination</b>
                  <span className="text-[11px] leading-tight block">
                    Zero repetition: guarantees no question overlap with Regular paper.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Blueprint Readiness Pre-Flight Check */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-ink text-xs uppercase tracking-wide">
                3. Blueprint Readiness Pre-Flight Check
              </label>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  readiness.isSufficient
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {readiness.isSufficient
                  ? "✓ All Slots Satisfied"
                  : "⚠ Insufficient Pool"}
              </span>
            </div>

            <div className="bg-paper border border-rule rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5 text-xs">
              {readiness.slots.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between py-0.5 border-b border-rule/50 last:border-0">
                  <div className="flex items-center gap-1.5">
                    {s.ok ? (
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    )}
                    <span>
                      Unit {s.unit} ({s.marks} Marks): Needed <b>{s.needed}</b>
                    </span>
                  </div>
                  <span className={s.ok ? "text-emerald-700 font-mono" : "text-amber-700 font-bold font-mono"}>
                    {s.available} available
                  </span>
                </div>
              ))}
            </div>

            {variant === "backlog" && issuedIds.size > 0 && (
              <p className="text-[11px] text-graphite mt-1.5 flex items-center gap-1">
                <ShieldAlert size={12} className="text-pen" />
                <span>
                  {issuedIds.size} questions from regular sitting excluded to guarantee non-repetition.
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-rule flex items-center justify-between bg-paper/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-graphite hover:text-ink transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy || !readiness.isSufficient}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-pen rounded-xl hover:bg-ink transition-colors disabled:opacity-40"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
            Synthesize Paper ({DEFAULT_COLLEGE_BLUEPRINT.total_marks} Marks)
          </button>
        </div>
      </div>
    </div>
  );
}
