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
  Layers,
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

interface FormatItem {
  id: string;
  name: string;
  total_marks: number;
  blueprint: any;
}

const FALLBACK_BLUEPRINTS: FormatItem[] = [
  {
    id: "end-sem-60",
    name: "Autonomous End Semester Examination (60 Marks)",
    total_marks: 60,
    blueprint: {
      groups: [
        {
          q_no: 1,
          title: "Solve the following questions (Unit 1 & Unit 2)",
          A: [
            { unit_no: 1, marks: 1, count: 2 },
            { unit_no: 2, marks: 1, count: 2 },
          ],
          B: [
            { unit_no: 1, marks: 4, count: 2 },
            { unit_no: 2, marks: 4, count: 2 },
          ],
        },
        {
          q_no: 2,
          title: "Solve the following questions (Unit 3 & Unit 4)",
          A: [
            { unit_no: 3, marks: 1, count: 2 },
            { unit_no: 4, marks: 1, count: 2 },
          ],
          B: [
            { unit_no: 3, marks: 4, count: 2 },
            { unit_no: 4, marks: 4, count: 2 },
          ],
        },
        {
          q_no: 3,
          title: "Solve the following questions (Unit 5 & Unit 6)",
          A: [
            { unit_no: 5, marks: 1, count: 2 },
            { unit_no: 6, marks: 1, count: 2 },
          ],
          B: [
            { unit_no: 5, marks: 4, count: 2 },
            { unit_no: 6, marks: 4, count: 2 },
          ],
        },
      ],
    },
  },
  {
    id: "mid-sem-30",
    name: "Mid-Semester Examination / Continuous Assessment (30 Marks)",
    total_marks: 30,
    blueprint: {
      groups: [
        {
          q_no: 1,
          title: "Unit 1 & Unit 2 Concepts",
          A: [
            { unit_no: 1, marks: 1, count: 3 },
            { unit_no: 2, marks: 1, count: 3 },
          ],
          B: [
            { unit_no: 1, marks: 4, count: 3 },
            { unit_no: 2, marks: 4, count: 3 },
          ],
        },
      ],
    },
  },
  {
    id: "unit-test-1",
    name: "Unit Test I (Units 1 & 2 - 20 Marks)",
    total_marks: 20,
    blueprint: {
      slots: [
        { unit_no: 1, marks: 1, count: 4 },
        { unit_no: 2, marks: 1, count: 4 },
        { unit_no: 1, marks: 4, count: 1 },
        { unit_no: 2, marks: 4, count: 2 },
      ],
    },
  },
  {
    id: "unit-test-2",
    name: "Unit Test II (Units 3 & 4 - 20 Marks)",
    total_marks: 20,
    blueprint: {
      slots: [
        { unit_no: 3, marks: 1, count: 4 },
        { unit_no: 4, marks: 1, count: 4 },
        { unit_no: 3, marks: 4, count: 1 },
        { unit_no: 4, marks: 4, count: 2 },
      ],
    },
  },
  {
    id: "unit-test-3",
    name: "Unit Test III (Units 5 & 6 - 20 Marks)",
    total_marks: 20,
    blueprint: {
      slots: [
        { unit_no: 5, marks: 1, count: 4 },
        { unit_no: 6, marks: 1, count: 4 },
        { unit_no: 5, marks: 4, count: 1 },
        { unit_no: 6, marks: 4, count: 2 },
      ],
    },
  },
  {
    id: "class-test-ds",
    name: "Class Test / Assessment (Data Structures Units 4 & 5 - 25 Marks)",
    total_marks: 25,
    blueprint: {
      slots: [
        { unit_no: 4, marks: 1, count: 5 },
        { unit_no: 5, marks: 1, count: 4 },
        { unit_no: 4, marks: 4, count: 2 },
        { unit_no: 5, marks: 4, count: 2 },
      ],
    },
  },
];

export default function CollegeBlueprintModal({
  subject,
  bankQuestions,
  onClose,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [formats, setFormats] = useState<FormatItem[]>(FALLBACK_BLUEPRINTS);
  const [selectedFormatId, setSelectedFormatId] = useState<string>(FALLBACK_BLUEPRINTS[0].id);

  const [cycles, setCycles] = useState<{ id: string; name: string }[]>([]);
  const [cycleId, setCycleId] = useState("");
  const [newCycleName, setNewCycleName] = useState("");
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [variant, setVariant] = useState<"normal" | "backlog">("normal");
  const [issuedIds, setIssuedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load formats from DB (or fallback to presets)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("paper_formats")
          .select("id, name, total_marks, blueprint")
          .eq("is_active", true)
          .order("total_marks", { ascending: false });

        if (data && data.length > 0) {
          setFormats(data as FormatItem[]);
          setSelectedFormatId(data[0].id);
        }
      } catch {
        // Use fallbacks
      }
    })();
  }, [supabase]);

  const activeFormat = useMemo(() => {
    return formats.find((f) => f.id === selectedFormatId) || formats[0];
  }, [formats, selectedFormatId]);

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
          setNewCycleName("Summer 2026 Examination");
          setShowNewCycle(true);
        }
      } catch {
        setShowNewCycle(true);
      }
    })();
  }, [subject.id, supabase]);

  // Load questions already issued under this cycle
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

  // Compute live readiness analysis for the active format
  const readiness = useMemo(() => {
    if (!activeFormat) {
      return { isSufficient: false, totalActive: bankQuestions.length, slots: [] };
    }
    return evaluateBlueprintReadiness(
      activeFormat.blueprint,
      bankQuestions,
      issuedIds,
      variant
    );
  }, [activeFormat, bankQuestions, issuedIds, variant]);

  async function handleGenerate() {
    if (!activeFormat) return;
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
        activeFormat.blueprint,
        bankQuestions,
        issuedIds,
        variant
      );

      const paperPayload = {
        title: `${subject.code || subject.name} — ${activeFormat.name} (${variant.toUpperCase()})`,
        subject: subject.name,
        class_name: subject.class_name || (subject.semester ? `Semester ${subject.semester}` : ""),
        course_code: subject.code,
        semester: subject.semester,
        department: subject.department,
        total_marks: activeFormat.total_marks,
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
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90dvh] flex flex-col shadow-2xl border border-rule overflow-hidden">
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

          {/* Blueprint Template Selector */}
          <div>
            <label className="font-semibold text-ink text-xs block mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
              <Layers size={14} className="text-pen" /> 1. Examination Blueprint Template
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
              {formats.map((fmt) => (
                <label
                  key={fmt.id}
                  onClick={() => setSelectedFormatId(fmt.id)}
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedFormatId === fmt.id
                      ? "border-pen bg-pen/5 text-ink ring-1 ring-pen/20 shadow-sm"
                      : "border-rule bg-white text-graphite hover:border-graphite"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink">{fmt.name}</span>
                    <span className="font-mono text-xs font-semibold text-pen shrink-0 ml-1">
                      {fmt.total_marks}M
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Exam Cycle Selector */}
          <div>
            <label className="font-semibold text-ink text-xs block mb-1.5 uppercase tracking-wide">
              2. Examination Cycle Sitting
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
              3. Paper Variant
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
                  className="mt-0.5 text-pen focus:ring-pen"
                />
                <div>
                  <span className="font-semibold text-xs text-ink block">Regular Examination</span>
                  <span className="text-[11px] text-graphite block mt-0.5">
                    Draws from all enabled questions in bank.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  variant === "backlog"
                    ? "border-amber-600 bg-amber-50 text-amber-950 ring-1 ring-amber-300"
                    : "border-rule bg-white text-graphite hover:border-graphite"
                }`}
              >
                <input
                  type="radio"
                  name="variant"
                  value="backlog"
                  checked={variant === "backlog"}
                  onChange={() => setVariant("backlog")}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-semibold text-xs text-ink block">Backlog Examination</span>
                  <span className="text-[11px] text-graphite block mt-0.5">
                    <b>Zero Question Repetition:</b> Excludes all questions used in regular cycle.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Pre-Flight Blueprint Readiness Analyzer */}
          <div className="bg-paper/60 border border-rule rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-ink uppercase tracking-wide">
                  Bank Sufficiency Pre-Check
                </span>
                <span className="font-mono text-xs text-graphite">
                  ({readiness.totalActive} eligible questions)
                </span>
              </div>
              {readiness.isSufficient ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 size={13} /> Blueprint Satisfied
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                  <AlertTriangle size={13} /> Insufficient Slots
                </span>
              )}
            </div>

            {/* Slots breakdown table */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {readiness.slots.map((s, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border flex items-center justify-between ${
                    s.ok
                      ? "border-emerald-200 bg-emerald-50/50 text-emerald-950"
                      : "border-red-200 bg-red-50 text-red-950"
                  }`}
                >
                  <span className="font-medium">
                    Unit {s.unit} ({s.marks}M)
                  </span>
                  <span className="font-mono font-semibold">
                    {s.available}/{s.needed} {s.ok ? "✓" : "✗"}
                  </span>
                </div>
              ))}
            </div>

            {!readiness.isSufficient && (
              <p className="mt-3 text-xs text-red-600 leading-relaxed">
                Add more questions matching the red slots or switch to an alternate blueprint template.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-rule bg-paper/50 flex items-center justify-between">
          <p className="text-xs text-graphite">
            Synthesizes publication-ready university layout table.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm text-graphite hover:text-ink border border-rule rounded-lg bg-white"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={busy || !readiness.isSufficient}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-pen rounded-lg hover:bg-ink transition-colors disabled:opacity-40 shadow-sm"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
              Generate Paper
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
