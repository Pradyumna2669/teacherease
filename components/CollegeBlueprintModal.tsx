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
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { BankItem, BankSubject } from "@/lib/question-bank";
import {
  evaluateBlueprintReadiness,
  synthesizeCollegePaper,
} from "@/lib/college-blueprint";

interface Props {
  subject?: BankSubject;
  bankQuestions?: BankItem[];
  preselectedFormatId?: string;
  preselectedTemplateTitle?: string;
  onClose: () => void;
}

interface FormatItem {
  id: string;
  name: string;
  total_marks: number;
  time_allowed?: string;
  blueprint: any;
}

const FALLBACK_BLUEPRINTS: FormatItem[] = [
  {
    id: "end-sem-60",
    name: "Autonomous End Semester Examination (60 Marks)",
    total_marks: 60,
    time_allowed: "1.5 hrs",
    blueprint: {
      groups: [
        { q_no: 1, title: "Unit 1", A: [{ unit_no: 1, marks: 1, count: 2 }], B: [{ unit_no: 1, marks: 4, count: 4 }] },
        { q_no: 2, title: "Unit 2", A: [{ unit_no: 2, marks: 1, count: 2 }], B: [{ unit_no: 2, marks: 4, count: 4 }] },
        { q_no: 3, title: "Unit 3", A: [{ unit_no: 3, marks: 1, count: 2 }], B: [{ unit_no: 3, marks: 4, count: 4 }] },
        { q_no: 4, title: "Unit 4", A: [{ unit_no: 4, marks: 1, count: 2 }], B: [{ unit_no: 4, marks: 4, count: 4 }] },
        { q_no: 5, title: "Unit 5", A: [{ unit_no: 5, marks: 1, count: 2 }], B: [{ unit_no: 5, marks: 4, count: 4 }] },
        { q_no: 6, title: "Unit 6", A: [{ unit_no: 6, marks: 1, count: 2 }], B: [{ unit_no: 6, marks: 4, count: 4 }] },
      ],
    },
  },
  {
    id: "mid-sem-30",
    name: "Mid-Semester Examination / Continuous Assessment (30 Marks)",
    total_marks: 30,
    blueprint: {
      groups: [
        { q_no: 1, title: "Unit 1", A: [{ unit_no: 1, marks: 1, count: 2 }], B: [{ unit_no: 1, marks: 4, count: 4 }] },
        { q_no: 2, title: "Unit 2", A: [{ unit_no: 2, marks: 1, count: 2 }], B: [{ unit_no: 2, marks: 4, count: 4 }] },
        { q_no: 3, title: "Unit 3", A: [{ unit_no: 3, marks: 1, count: 2 }], B: [{ unit_no: 3, marks: 4, count: 4 }] },
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
  subject: initialSubject,
  bankQuestions: initialBankQuestions,
  preselectedFormatId,
  preselectedTemplateTitle,
  onClose,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [subjects, setSubjects] = useState<BankSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubject?.id || "");
  const [bankQuestions, setBankQuestions] = useState<BankItem[]>(initialBankQuestions || []);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [formats, setFormats] = useState<FormatItem[]>(FALLBACK_BLUEPRINTS);
  const [selectedFormatId, setSelectedFormatId] = useState<string>(
    preselectedFormatId || FALLBACK_BLUEPRINTS[0].id
  );

  const [cycles, setCycles] = useState<{ id: string; name: string }[]>([]);
  const [cycleId, setCycleId] = useState("");
  const [newCycleName, setNewCycleName] = useState("");
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [variant, setVariant] = useState<"normal" | "backlog">("normal");
  const [issuedIds, setIssuedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<{ id: string; name: string; affiliation?: string; address?: string } | null>(null);

  useEffect(() => {
    fetch("/api/school")
      .then((r) => r.json())
      .then((d) => {
        if (d?.school) {
          setSchoolInfo(d.school);
        }
      })
      .catch(() => {});
  }, []);

  // If no subject passed directly, load teacher's college subjects
  useEffect(() => {
    if (initialSubject) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("bank_subjects")
          .select("*")
          .not("code", "is", null)
          .order("name");
        if (data && data.length > 0) {
          setSubjects(data as BankSubject[]);
          const isDs =
            preselectedFormatId?.includes("ds") ||
            preselectedFormatId?.includes("25") ||
            preselectedTemplateTitle?.includes("Data Structures");
          const dsSubject = data.find(
            (s) =>
              s.name.toLowerCase().includes("data structure") ||
              s.code?.toLowerCase().includes("302")
          );
          const mathSubject = data.find((s) =>
            s.name.toLowerCase().includes("math")
          );

          if (isDs && dsSubject) {
            setSelectedSubjectId(dsSubject.id);
          } else if (mathSubject) {
            setSelectedSubjectId(mathSubject.id);
          } else {
            setSelectedSubjectId(data[0].id);
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, [initialSubject, preselectedFormatId, preselectedTemplateTitle, supabase]);

  const activeSubject = useMemo(() => {
    if (initialSubject) return initialSubject;
    return subjects.find((s) => s.id === selectedSubjectId) || null;
  }, [initialSubject, subjects, selectedSubjectId]);

  // Load questions for the selected subject if not already supplied
  useEffect(() => {
    if (initialBankQuestions && initialSubject?.id === selectedSubjectId) {
      setBankQuestions(initialBankQuestions);
      return;
    }
    if (!selectedSubjectId) return;

    (async () => {
      setLoadingQuestions(true);
      try {
        const { data } = await supabase
          .from("question_bank")
          .select("*")
          .eq("subject_id", selectedSubjectId)
          .eq("enabled", true);

        setBankQuestions(data || []);
      } catch {
        /* ignore */
      } finally {
        setLoadingQuestions(false);
      }
    })();
  }, [selectedSubjectId, initialBankQuestions, initialSubject, supabase]);

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
          if (preselectedFormatId) {
            const match = data.find(
              (f) =>
                f.id === preselectedFormatId ||
                (preselectedFormatId === "end-sem-60" && f.name.includes("60")) ||
                (preselectedFormatId === "mid-sem-30" && f.name.includes("30")) ||
                (preselectedFormatId === "class-test-ds" &&
                  (f.name.includes("25") || f.name.includes("Data Structures"))) ||
                (preselectedFormatId === "unit-test-1" && f.name.includes("Unit Test I (")) ||
                (preselectedFormatId === "unit-test-2" && f.name.includes("Unit Test II (")) ||
                (preselectedFormatId === "unit-test-3" && f.name.includes("Unit Test III (")) ||
                f.name.toLowerCase().includes(preselectedFormatId.toLowerCase())
            );
            if (match) setSelectedFormatId(match.id);
          } else {
            setSelectedFormatId(data[0].id);
          }
        }
      } catch {
        // Use fallbacks
      }
    })();
  }, [supabase, preselectedFormatId]);

  const activeFormat = useMemo(() => {
    if (!formats.length) return FALLBACK_BLUEPRINTS[0];
    const match = formats.find(
      (f) =>
        f.id === selectedFormatId ||
        (selectedFormatId === "end-sem-60" && f.name.includes("60")) ||
        (selectedFormatId === "mid-sem-30" && f.name.includes("30")) ||
        (selectedFormatId === "class-test-ds" &&
          (f.name.includes("25") || f.name.includes("Data Structures"))) ||
        (selectedFormatId === "unit-test-1" && f.name.includes("Unit Test I (")) ||
        (selectedFormatId === "unit-test-2" && f.name.includes("Unit Test II (")) ||
        (selectedFormatId === "unit-test-3" && f.name.includes("Unit Test III (")) ||
        f.name.toLowerCase().includes(selectedFormatId.toLowerCase())
    );
    return match || formats[0];
  }, [formats, selectedFormatId]);

  function handleSelectFormat(fmt: FormatItem) {
    setSelectedFormatId(fmt.id);
    if (!initialSubject && subjects.length > 0) {
      if (
        fmt.name.toLowerCase().includes("data structure") ||
        fmt.name.includes("25")
      ) {
        const ds = subjects.find(
          (s) =>
            s.name.toLowerCase().includes("data structure") ||
            s.code?.toLowerCase().includes("302")
        );
        if (ds) setSelectedSubjectId(ds.id);
      } else if (
        fmt.name.includes("60") ||
        fmt.name.includes("30") ||
        fmt.name.includes("Unit Test")
      ) {
        const math = subjects.find((s) =>
          s.name.toLowerCase().includes("math")
        );
        if (math) setSelectedSubjectId(math.id);
      }
    }
  }

  // Load existing cycles for active subject
  useEffect(() => {
    if (!activeSubject?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("exam_cycles")
          .select("id, name")
          .eq("subject_id", activeSubject.id)
          .order("created_at", { ascending: false });
        if (data && data.length > 0) {
          setCycles(data);
          setCycleId(data[0].id);
          setShowNewCycle(false);
        } else {
          setNewCycleName("Summer 2026 Examination");
          setShowNewCycle(true);
        }
      } catch {
        setShowNewCycle(true);
      }
    })();
  }, [activeSubject?.id, supabase]);

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

  // Compute live readiness analysis for the active format and subject bank
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
    if (!activeFormat || !activeSubject) return;
    setError(null);
    setBusy(true);

    try {
      let finalCycleId = cycleId;

      if (showNewCycle && newCycleName.trim()) {
        const { data: authData } = await supabase.auth.getUser();
        const { data: newCyc, error: cycErr } = await supabase
          .from("exam_cycles")
          .insert({
            subject_id: activeSubject.id,
            name: newCycleName.trim(),
            user_id: authData?.user?.id || null,
            school_id: activeSubject.school_id || null,
          })
          .select("id")
          .single();
        if (cycErr) throw cycErr;
        finalCycleId = newCyc.id;
      }

      // Synthesize questions using deterministic random picker with non-repetition
      const synthesizedQuestions = synthesizeCollegePaper(
        activeFormat.blueprint,
        bankQuestions,
        issuedIds,
        variant
      );

      const paperPayload = {
        title: `${activeSubject.code || activeSubject.name} — ${activeFormat.name} (${variant.toUpperCase()})`,
        subject: activeSubject.name,
        class_name: activeSubject.class_name || (activeSubject.semester ? `Semester ${activeSubject.semester}` : ""),
        course_code: activeSubject.code,
        semester: activeSubject.semester,
        department: activeSubject.department,
        total_marks: activeFormat.total_marks,
        time_allowed: (activeFormat as any).time_allowed || (activeFormat.total_marks === 60 ? "1.5 hrs" : "1 hr"),
        settings: {
          timeAllowed: (activeFormat as any).time_allowed || (activeFormat.total_marks === 60 ? "1.5 hrs" : "1 hr"),
        },
        layout_mode: "college_table",
        school_id: activeSubject.school_id || schoolInfo?.id || null,
        school_name: schoolInfo?.name,
        school_subtitle: schoolInfo?.affiliation || schoolInfo?.address,
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

      // Record audit log
      try {
        await supabase.from("audit_logs").insert({
          action: "paper.generate",
          entity: "paper",
          entity_id: data.id,
          summary: `Synthesized paper: ${paperPayload.title}`,
          details: {
            subject: activeSubject.name,
            code: activeSubject.code,
            variant,
            total_marks: activeFormat.total_marks,
          },
        });
      } catch {
        /* ignore audit err */
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
                Randomized question picking conforming to blueprint with zero repetition guarantee.
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

          {/* Subject / Course Selector (If not pre-locked from Bank) */}
          {!initialSubject && (
            <div>
              <label className="font-semibold text-ink text-xs block mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <BookOpen size={14} className="text-pen" /> 1. Select Course / Subject
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-rule rounded-lg focus:ring-2 focus:ring-pen/20 focus:border-pen outline-none font-sans"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `${s.code} · ` : ""}{s.name} {s.semester ? `(Semester ${s.semester})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Blueprint Template Selector */}
          <div>
            <label className="font-semibold text-ink text-xs block mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
              <Layers size={14} className="text-pen" /> {initialSubject ? "1" : "2"}. Examination Blueprint Template
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
              {formats.map((fmt) => (
                <label
                  key={fmt.id}
                  onClick={() => handleSelectFormat(fmt)}
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                    activeFormat?.id === fmt.id
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
              {initialSubject ? "2" : "3"}. Examination Cycle Sitting
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
              {initialSubject ? "3" : "4"}. Paper Variant
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
                    Draws randomly from question bank according to blueprint.
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
                {loadingQuestions ? (
                  <Loader2 size={13} className="animate-spin text-graphite" />
                ) : (
                  <span className="font-mono text-xs text-graphite">
                    ({readiness.totalActive} active questions in {activeSubject?.name || "course"})
                  </span>
                )}
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
                Add more questions matching the red slots in {activeSubject?.name} or switch to an alternate blueprint template.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-rule bg-paper/50 flex items-center justify-between">
          <p className="text-xs text-graphite">
            Randomly picks questions and formats into autonomous university table layout.
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
              disabled={busy || !readiness.isSufficient || !activeSubject}
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
