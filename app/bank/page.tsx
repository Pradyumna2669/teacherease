"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Library,
  FileText,
  ArrowLeft,
  Loader2,
  Trash2,
  Search,
  Plus,
  FolderOpen,
  BookOpen,
  Sparkles,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Pencil,
  X,
  Filter,
  CheckSquare,
} from "lucide-react";
import {
  listBank,
  listSubjects,
  listUnits,
  createSubject,
  createUnit,
  deleteSubject,
  deleteUnit,
  deleteBankItem,
  setBankItemEnabled,
  saveQuestionsToBank,
  assignToUnit,
  unitStats,
  type BankItem,
  type BankSubject,
  type BankUnit,
} from "@/lib/question-bank";
import BankQuestionForm, { type BankFormValue } from "@/components/BankQuestionForm";
import ObeAnalyticsWidget from "@/components/ObeAnalyticsWidget";
import CollegeBlueprintModal from "@/components/CollegeBlueprintModal";
import {
  parseAndValidateSpreadsheet,
  downloadQuestionImportTemplate,
  exportBankToExcel,
  type ImportValidationResult,
} from "@/lib/question-import";
import {
  FileSpreadsheet,
  Download,
  Upload,
  BarChart2,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import GenerateQuestionsModal from "@/components/GenerateQuestionsModal";
import QuestionPreview from "@/components/QuestionPreview";
import { PromptModal, ConfirmModal } from "@/components/Modal";
import { JoinCommunityButton } from "@/components/JoinCommunity";
import { CREDIT_COSTS } from "@/lib/credit-packs";
import { inAndroidApp, OUT_OF_CREDITS } from "@/lib/twa";
import { QUESTION_TYPE_LABELS, type Question, type QuestionType } from "@/lib/types";

const UNFILED = "__unfiled__";

export default function BankPage() {
  const router = useRouter();
  const [items, setItems] = useState<BankItem[]>([]);
  const [subjects, setSubjects] = useState<BankSubject[]>([]);
  const [units, setUnits] = useState<BankUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Navigation + panels
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeUnit, setActiveUnit] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [marksFilter, setMarksFilter] = useState<string>("all");
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const [showObeAnalytics, setShowObeAnalytics] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [generatingSimilarId, setGeneratingSimilarId] = useState<string | null>(null);
  const [showDisabled, setShowDisabled] = useState(false);

  // Rows expand in place so a teacher can read the whole question before
  // deciding to disable or delete it.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  // In-app dialogs (window.prompt/confirm are unstyled and blocked on some
  // mobile browsers).
  const [dialog, setDialog] = useState<
    | { kind: "subject" }
    | { kind: "unit"; subjectId: string }
    | { kind: "delSubject"; subject: BankSubject }
    | { kind: "delUnit"; unit: BankUnit }
    | { kind: "delQuestion"; item: BankItem }
    | null
  >(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [b, s, u] = await Promise.all([listBank(), listSubjects(), listUnits()]);
      setItems(b);
      setSubjects(s);
      setUnits(u);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load your bank.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const subjectUnits = useMemo(
    () => units.filter((u) => u.subject_id === activeSubject),
    [units, activeSubject]
  );

  const stats = useMemo(() => unitStats(items), [items]);

  const activeUnitObj = units.find((u) => u.id === activeUnit) ?? null;
  const activeSubjectObj = subjects.find((s) => s.id === activeSubject) ?? null;
  const isCollegeCourse = useMemo(() => {
    if (activeSubjectObj?.code || activeSubjectObj?.semester) return true;
    return items.some((it) => it.bt_level || it.co_no);
  }, [activeSubjectObj, items]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (activeUnit === UNFILED) {
        if (it.unit_id) return false;
      } else if (activeUnit) {
        if (it.unit_id !== activeUnit) return false;
      } else if (activeSubject) {
        if (it.subject_id !== activeSubject) return false;
      }
      if (!showDisabled && !it.enabled) return false;
      if (typeFilter !== "all" && it.type !== typeFilter) return false;
      if (marksFilter !== "all") {
        if (marksFilter === "5+") {
          if (it.marks < 5) return false;
        } else if (String(it.marks) !== marksFilter) {
          return false;
        }
      }
      if (needle && !(it.title || "").toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, activeSubject, activeUnit, q, showDisabled, typeFilter, marksFilter]);

  const availableTypes = useMemo(() => {
    const s = new Set<string>();
    items.forEach((it) => {
      if (it.type) s.add(it.type);
    });
    return Array.from(s).sort();
  }, [items]);

  const selectedMarks = useMemo(() => {
    return items
      .filter((i) => selected.has(i.id))
      .reduce((sum, i) => sum + (Number(i.marks) || 0), 0);
  }, [items, selected]);

  const unfiledCount = items.filter((i) => !i.unit_id).length;

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  }

  /* ------------------------------------------------------ syllabus edits */

  async function addSubject(values: Record<string, string>) {
    try {
      const s = await createSubject(values.name, values.class_name);
      setSubjects((p) => [...p, s].sort((a, b) => a.name.localeCompare(b.name)));
      setActiveSubject(s.id);
      setActiveUnit(null);
      setDialog(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not add subject.");
      setDialog(null);
    }
  }

  async function addUnit(subjectId: string, values: Record<string, string>) {
    try {
      const u = await createUnit(
        subjectId,
        values.name,
        values.book_name,
        units.filter((x) => x.subject_id === subjectId).length
      );
      setUnits((p) => [...p, u]);
      setActiveUnit(u.id);
      setDialog(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not add unit.");
      setDialog(null);
    }
  }

  async function removeSubject(s: BankSubject) {
    try {
      await deleteSubject(s.id);
      setActiveSubject(null);
      setActiveUnit(null);
      setDialog(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete subject.");
      setDialog(null);
    }
  }

  async function removeUnit(u: BankUnit) {
    try {
      await deleteUnit(u.id);
      setActiveUnit(null);
      setDialog(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete unit.");
      setDialog(null);
    }
  }

  /* ------------------------------------------------------ question edits */

  async function handleAdd(v: BankFormValue) {
    setSaving(true);
    try {
      await saveQuestionsToBank([
        {
          title: v.title,
          type: v.type,
          marks: v.marks,
          subject: activeSubjectObj?.name ?? null,
          class_name: activeSubjectObj?.class_name ?? null,
          subject_id: activeSubject,
          unit_id: activeUnit === UNFILED ? null : activeUnit,
          source: "manual",
          payload: v.question,
        },
      ]);
      setShowAdd(false);
      await load();
      flash("Question added to your bank.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerated(questions: Question[], cost: number) {
    try {
      await saveQuestionsToBank(
        questions.map((qq) => ({
          title: qq.title,
          type: qq.type,
          marks: qq.marks,
          subject: activeSubjectObj?.name ?? null,
          class_name: activeSubjectObj?.class_name ?? null,
          subject_id: activeSubject,
          unit_id: activeUnit === UNFILED ? null : activeUnit,
          source: "ai" as const,
          payload: qq,
        }))
      );
      setShowGen(false);
      await load();
      flash(
        `${questions.length} question${questions.length === 1 ? "" : "s"} added · ${cost} credits used. Review them and disable anything you don't want.`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generated, but could not save.");
    }
  }

  async function toggleEnabled(it: BankItem) {
    // Optimistic — a failed write is re-synced by the reload in the catch.
    setItems((p) =>
      p.map((x) => (x.id === it.id ? { ...x, enabled: !x.enabled } : x))
    );
    try {
      await setBankItemEnabled(it.id, !it.enabled);
    } catch {
      await load();
      setError("Could not update that question.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBankItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDialog(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete.");
      setDialog(null);
    }
  }

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function fileSelectedInto(unitId: string) {
    const u = units.find((x) => x.id === unitId);
    if (!u) return;
    try {
      await assignToUnit(Array.from(selected), u.id, u.subject_id);
      setSelected(new Set());
      await load();
      flash(`Filed into ${u.name}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not file those questions.");
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const visibleIds = visible.map((v) => v.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleGenerateSimilar(it: BankItem) {
    setGeneratingSimilarId(it.id);
    setError(null);
    try {
      const res = await fetch("/api/questions/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: it.payload,
          subject: it.subject || activeSubjectObj?.name || "General",
          className: it.class_name || activeSubjectObj?.class_name || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        if (inAndroidApp()) {
          setError(OUT_OF_CREDITS);
          return;
        }
        setError(data.error || "Not enough credits to generate similar question.");
        router.push("/topup");
        return;
      }
      if (!res.ok || !data.question) {
        throw new Error(data.error || "Could not generate similar question.");
      }
      await saveQuestionsToBank([
        {
          title: data.question.title,
          type: data.question.type,
          marks: data.question.marks,
          subject: it.subject || activeSubjectObj?.name || null,
          class_name: it.class_name || activeSubjectObj?.class_name || null,
          subject_id: it.subject_id || activeSubject,
          unit_id: it.unit_id || (activeUnit === UNFILED ? null : activeUnit),
          source: "ai",
          payload: data.question,
        },
      ]);
      await load();
      flash(`Generated a similar ${data.question.type} question and added it to your bank.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not generate similar question.");
    } finally {
      setGeneratingSimilarId(null);
    }
  }

  async function createFromSelected() {
    const chosen = items.filter((i) => selected.has(i.id));
    if (!chosen.length) return;
    setCreating(true);
    setError(null);
    try {
      const first = chosen[0];
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeUnitObj ? `Paper — ${activeUnitObj.name}` : "Paper from bank",
          subject: activeSubjectObj?.name ?? first.subject,
          class_name: activeSubjectObj?.class_name ?? first.class_name,
          questions: chosen.map((c) => ({
            ...c.payload,
            id: crypto.randomUUID().slice(0, 8),
          })),
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        // Inside the app there is nowhere to send them — Play forbids pointing
        // at our own checkout, so say it and stop.
        if (inAndroidApp()) {
          setError(OUT_OF_CREDITS);
          setCreating(false);
          return;
        }
        setError(data.error || "Not enough credits.");
        router.push("/topup");
        return;
      }
      if (!res.ok || !data.id) throw new Error(data.error || "Could not create paper.");
      router.push(`/builder?id=${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create paper.");
      setCreating(false);
    }
  }

  const canGenerate = !!activeUnitObj && !!activeSubjectObj;

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      const buffer = await file.arrayBuffer();
      const result = parseAndValidateSpreadsheet(buffer);
      setImportPreview(result);
    } catch (err: any) {
      setError(err.message || "Could not read spreadsheet.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmImport() {
    if (!importPreview?.validRows.length) return;
    setImporting(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const questionsToSave = importPreview.validRows.map((r) => {
        const payload: Question = {
          id: Math.random().toString(36).slice(2, 10),
          type: (r.type as QuestionType) || (r.marks <= 2 ? "short-answer" : "long-answer"),
          title: r.text,
          marks: r.marks,
          unit_no: r.unit_no,
          co_no: r.co_no || r.unit_no,
          bt_level: r.bt_level || 1,
          difficulty: r.difficulty,
          items: [{ id: "item1", content: r.text }],
        };

        return {
          user_id: user?.id || null,
          title: r.text,
          type: payload.type,
          subject: activeSubjectObj?.name || "General",
          class_name: activeSubjectObj?.class_name || (activeSubjectObj?.semester ? `Sem ${activeSubjectObj.semester}` : null),
          subject_id: activeSubject || null,
          unit_id: activeUnit !== UNFILED ? activeUnit : null,
          marks: r.marks,
          unit_no: r.unit_no,
          co_no: r.co_no || r.unit_no,
          bt_level: r.bt_level || 1,
          difficulty: r.difficulty,
          source: "manual" as const,
          payload,
        };
      });

      const { error: insErr } = await supabase.from("question_bank").insert(questionsToSave);
      if (insErr) throw insErr;

      setNotice(`Successfully imported ${importPreview.validRows.length} questions!`);
      setImportPreview(null);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to import questions.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-paper">
      <header className="bg-white border-b border-rule sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-pen rounded-lg flex items-center justify-center">
              <FileText size={18} className="text-white" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight text-ink">
              Teacher<span className="ink-blank">Ease</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <JoinCommunityButton />
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-graphite hover:text-ink px-3 py-2 hover:bg-rule rounded-lg transition-colors"
            >
              <ArrowLeft size={16} /> My Papers
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-28">
        <div className="flex items-center gap-2 mb-1">
          <Library size={22} className="text-pen" />
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Question Bank
          </h1>
        </div>
        <p className="text-sm text-graphite mb-6">
          Set up your subjects and units, then fill them with questions — type
          them, save them from a paper, or have AI write a unit&apos;s worth.
          Building papers from your bank is free.
        </p>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}>
              <X size={15} />
            </button>
          </div>
        )}
        {notice && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 mb-4">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 text-graphite">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-[280px_1fr] gap-6">
            {/* ===== Syllabus sidebar ===== */}
            <aside className="space-y-4">
              <div className="bg-white border border-rule rounded-xl p-3">
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-graphite">
                    Subjects
                  </span>
                  <button
                    onClick={() => setDialog({ kind: "subject" })}
                    title="Add subject"
                    className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1.5 text-graphite hover:text-pen rounded-md"
                  >
                    <FolderPlus size={15} />
                  </button>
                </div>

                {subjects.length === 0 && (
                  <p className="text-xs text-graphite px-1 py-2">
                    No subjects yet. Add one to start organising.
                  </p>
                )}

                <div className="space-y-0.5">
                  {subjects.map((s) => {
                    const on = activeSubject === s.id;
                    return (
                      <div key={s.id}>
                        <div
                          className={`group flex items-center gap-1 rounded-lg ${
                            on ? "bg-pen/5" : "hover:bg-rule/40"
                          }`}
                        >
                          <button
                            onClick={() => {
                              setActiveSubject(on ? null : s.id);
                              setActiveUnit(null);
                            }}
                            className="flex-1 flex items-center gap-1.5 px-2 py-2 text-left"
                          >
                            <ChevronRight
                              size={14}
                              className={`text-graphite transition-transform ${
                                on ? "rotate-90" : ""
                              }`}
                            />
                            <span
                              className={`text-sm ${
                                on ? "text-ink font-semibold" : "text-graphite"
                              }`}
                            >
                              {s.code ? `${s.code} · ${s.name}` : s.name}
                              {s.class_name && (
                                <span className="text-xs font-normal text-graphite">
                                  {" "}
                                  · {s.class_name}
                                </span>
                              )}
                            </span>
                          </button>
                          <button
                            onClick={() => setDialog({ kind: "delSubject", subject: s })}
                            className="p-2 text-graphite hover:text-red-600 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {on && (
                          <div className="ml-4 pl-2 border-l border-rule space-y-0.5 py-1">
                            {subjectUnits.map((u) => {
                              const st = stats.get(u.id);
                              const uon = activeUnit === u.id;
                              return (
                                <div
                                  key={u.id}
                                  className={`group flex items-center gap-1 rounded-lg ${
                                    uon ? "bg-pen/10" : "hover:bg-rule/40"
                                  }`}
                                >
                                  <button
                                    onClick={() => setActiveUnit(uon ? null : u.id)}
                                    className="flex-1 px-2 py-1.5 text-left"
                                  >
                                    <span
                                      className={`text-sm ${
                                        uon ? "text-ink font-medium" : "text-graphite"
                                      }`}
                                    >
                                      {u.name}
                                    </span>
                                    <span className="block text-[11px] text-graphite">
                                      {st?.enabled ?? 0} live · {st?.marks ?? 0} marks
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => setDialog({ kind: "delUnit", unit: u })}
                                    className="p-2 text-graphite hover:text-red-600 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              onClick={() => setDialog({ kind: "unit", subjectId: s.id })}
                              className="w-full text-left px-2 py-1.5 text-xs text-pen font-medium hover:underline"
                            >
                              + Add unit
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {unfiledCount > 0 && (
                  <button
                    onClick={() => {
                      setActiveSubject(null);
                      setActiveUnit(activeUnit === UNFILED ? null : UNFILED);
                    }}
                    className={`w-full mt-2 px-2 py-2 rounded-lg text-left text-sm ${
                      activeUnit === UNFILED
                        ? "bg-pen/5 text-ink font-semibold"
                        : "text-graphite hover:bg-rule/40"
                    }`}
                  >
                    Unfiled
                    <span className="block text-[11px] text-graphite">
                      {unfiledCount} question{unfiledCount === 1 ? "" : "s"}
                    </span>
                  </button>
                )}
              </div>
            </aside>

            {/* ===== Questions ===== */}
            <section>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative flex-1 min-w-[180px]">
                  <Search
                    size={15}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-graphite"
                  />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search questions"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-rule rounded-lg focus:ring-2 focus:ring-pen/20 focus:border-pen outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowDisabled((v) => !v)}
                  className="flex items-center gap-1.5 text-sm text-graphite hover:text-ink border border-rule rounded-lg px-3 py-2 bg-white"
                >
                  {showDisabled ? <Eye size={15} /> : <EyeOff size={15} />}
                  {showDisabled ? "All" : "Live only"}
                </button>
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-ink border border-rule rounded-lg px-3 py-2 bg-white hover:border-pen/40"
                >
                  <Plus size={15} /> Add question
                </button>

                {/* Spreadsheet Import & Export Tools */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileImport}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Bulk upload questions via Excel or CSV"
                  className="flex items-center gap-1.5 text-sm font-medium text-ink border border-rule rounded-lg px-3 py-2 bg-white hover:border-pen/40 transition-colors"
                >
                  <Upload size={15} className="text-pen" /> Import Excel/CSV
                </button>

                <button
                  onClick={() => exportBankToExcel(activeSubjectObj?.name || "Question_Bank", visible)}
                  title="Export current questions to Excel"
                  className="flex items-center gap-1.5 text-sm font-medium text-ink border border-rule rounded-lg px-3 py-2 bg-white hover:border-pen/40 transition-colors"
                >
                  <Download size={15} className="text-graphite" /> Export .xlsx
                </button>

                <button
                  onClick={() => downloadQuestionImportTemplate(isCollegeCourse ? "college" : "school")}
                  title="Download sample spreadsheet template"
                  className="flex items-center gap-1.5 text-xs text-graphite hover:text-ink border border-rule rounded-lg px-2.5 py-2 bg-white hover:bg-paper transition-colors"
                >
                  Template
                </button>

                {/* OBE Analytics Toggle */}
                {isCollegeCourse && (
                  <button
                    onClick={() => setShowObeAnalytics((v) => !v)}
                    className={`flex items-center gap-1.5 text-sm font-medium border rounded-lg px-3 py-2 transition-colors ${
                      showObeAnalytics
                        ? "bg-pen text-white border-pen"
                        : "bg-white text-ink border-rule hover:border-pen/40"
                    }`}
                  >
                    <BarChart2 size={15} /> OBE Analytics
                  </button>
                )}

                {/* Generation Logic: College Mode (Deterministic Blueprint) vs School Mode (AI) */}
                {isCollegeCourse && activeSubjectObj ? (
                  <button
                    onClick={() => setShowBlueprintModal(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-white bg-pen rounded-lg px-3 py-2 hover:bg-ink transition-colors"
                  >
                    <FileCheck2 size={15} /> Synthesize College Paper
                  </button>
                ) : (
                  <button
                    onClick={() => setShowGen(true)}
                    disabled={!canGenerate}
                    title={canGenerate ? undefined : "Pick a unit first"}
                    className="flex items-center gap-1.5 text-sm font-semibold text-white bg-pen rounded-lg px-3 py-2 hover:bg-ink transition-colors disabled:opacity-40"
                  >
                    <Sparkles size={15} /> Generate with AI
                  </button>
                )}
              </div>

              {/* Zero-Leakage Policy Banner for College Courses */}
              {isCollegeCourse && (
                <div className="mb-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
                    <span>
                      <b>Institutional Confidentiality Active:</b> College examination data is air-gapped from external LLMs. Papers are synthesized algorithmically.
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase bg-emerald-200/60 px-2 py-0.5 rounded font-bold">
                    Zero Leakage
                  </span>
                </div>
              )}

              {/* Render OBE Analytics Widget if toggled */}
              {showObeAnalytics && <ObeAnalyticsWidget items={visible} />}

              <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                <div className="flex items-center gap-1.5 text-graphite bg-white border border-rule rounded-lg px-2.5 py-1.5">
                  <Filter size={13} className="text-pen" />
                  <span className="font-medium">Filter:</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-transparent text-ink font-medium outline-none cursor-pointer"
                  >
                    <option value="all">All types</option>
                    {availableTypes.map((t) => (
                      <option key={t} value={t}>
                        {QUESTION_TYPE_LABELS[t as QuestionType] || t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-graphite bg-white border border-rule rounded-lg px-2.5 py-1.5">
                  <span className="font-medium">Marks:</span>
                  <select
                    value={marksFilter}
                    onChange={(e) => setMarksFilter(e.target.value)}
                    className="bg-transparent text-ink font-medium outline-none cursor-pointer"
                  >
                    <option value="all">All marks</option>
                    <option value="1">1 Mark</option>
                    <option value="2">2 Marks</option>
                    <option value="3">3 Marks</option>
                    <option value="4">4 Marks</option>
                    <option value="5+">5+ Marks</option>
                  </select>
                </div>

                {(typeFilter !== "all" || marksFilter !== "all" || q) && (
                  <button
                    onClick={() => {
                      setTypeFilter("all");
                      setMarksFilter("all");
                      setQ("");
                    }}
                    className="text-pen hover:underline px-1.5 py-1 font-medium"
                  >
                    Reset filters
                  </button>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-graphite">
                    Showing {visible.length} question{visible.length === 1 ? "" : "s"}
                  </span>
                  {visible.length > 0 && (
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-1 border border-rule bg-white hover:bg-rule/40 text-ink px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      <CheckSquare size={13} className="text-pen" />
                      {visible.every((v) => selected.has(v.id))
                        ? "Deselect visible"
                        : "Select all visible"}
                    </button>
                  )}
                </div>
              </div>

              {activeUnitObj && (
                <div className="mb-4 flex items-center gap-2 text-sm text-graphite bg-white border border-rule rounded-lg px-3 py-2">
                  <BookOpen size={15} className="text-pen" />
                  <b className="text-ink">{activeUnitObj.name}</b>
                  {activeUnitObj.book_name && <span>· {activeUnitObj.book_name}</span>}
                  <span className="ml-auto text-xs">
                    {stats.get(activeUnitObj.id)?.marks ?? 0} marks available
                  </span>
                </div>
              )}

              {showAdd && (
                <div className="mb-4 bg-white border border-rule rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Pencil size={16} className="text-pen" />
                    <h3 className="font-semibold text-ink text-sm">
                      New question
                      {activeUnitObj ? ` in ${activeUnitObj.name}` : " (unfiled)"}
                    </h3>
                  </div>
                  <BankQuestionForm
                    busy={saving}
                    onCancel={() => setShowAdd(false)}
                    onSave={handleAdd}
                  />
                </div>
              )}

              {visible.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-rule">
                  <FolderOpen size={38} className="mx-auto text-rule" />
                  <h3 className="mt-3 font-semibold text-ink text-sm">
                    {items.length === 0 ? "Your bank is empty" : "Nothing here yet"}
                  </h3>
                  <p className="text-sm text-graphite mt-1 max-w-sm mx-auto">
                    {canGenerate
                      ? "Add a question by hand, or let AI write a unit's worth from your textbook."
                      : "Pick a unit on the left, then add questions or generate them."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visible.map((it) => {
                    const on = selected.has(it.id);
                    const open = openIds.has(it.id);
                    const itemCount =
                      it.payload.items?.length ||
                      it.payload.matchLeft?.length ||
                      it.payload.compositionSentences?.length ||
                      0;
                    return (
                      <div
                        key={it.id}
                        className={`bg-white rounded-xl border transition-colors ${
                          on ? "border-pen/40 ring-1 ring-pen/10" : "border-rule"
                        } ${it.enabled ? "" : "opacity-55"}`}
                      >
                        <div className="flex items-start gap-3 p-4">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(it.id)}
                            className="mt-1 h-4 w-4 accent-pen shrink-0"
                          />
                          <button
                            onClick={() => toggleOpen(it.id)}
                            className="flex-1 text-left min-w-0"
                            aria-expanded={open}
                          >
                            <p className="text-sm font-medium text-ink flex items-start gap-1.5">
                              {open ? (
                                <ChevronDown size={15} className="mt-0.5 shrink-0 text-graphite" />
                              ) : (
                                <ChevronRight size={15} className="mt-0.5 shrink-0 text-graphite" />
                              )}
                              <span className={open ? "" : "line-clamp-2"}>
                                {it.title || it.type}
                              </span>
                            </p>
                            <div className="mt-1.5 ml-[21px] flex flex-wrap gap-1.5 items-center">
                              <span className="text-xs bg-pen/5 text-ink px-2 py-0.5 rounded-full">
                                {it.type}
                              </span>
                              <span className="text-xs bg-rule text-graphite px-2 py-0.5 rounded-full font-mono">
                                {it.marks} mark{it.marks === 1 ? "" : "s"}
                              </span>
                              {it.unit_no && (
                                <span className="text-xs bg-paper border border-rule text-ink font-semibold px-2 py-0.5 rounded-full">
                                  Unit {it.unit_no}
                                </span>
                              )}
                              {it.bt_level && (
                                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full font-mono">
                                  BTL {it.bt_level}
                                </span>
                              )}
                              {it.co_no && (
                                <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full font-mono">
                                  CO {it.co_no}
                                </span>
                              )}
                              {it.difficulty && (
                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                                  it.difficulty === "easy"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : it.difficulty === "hard"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}>
                                  {it.difficulty}
                                </span>
                              )}
                              {it.image_url && (
                                <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                                  📷 Diagram
                                </span>
                              )}
                              {itemCount > 0 && (
                                <span className="text-xs text-graphite">
                                  {itemCount} item{itemCount === 1 ? "" : "s"}
                                </span>
                              )}
                              {it.source === "ai" && (
                                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                  <Sparkles size={10} /> AI
                                </span>
                              )}
                              {!it.enabled && (
                                <span className="text-xs bg-rule text-graphite px-2 py-0.5 rounded-full">
                                  Disabled
                                </span>
                              )}
                              {it.times_used > 0 && (
                                <span className="text-xs text-graphite">
                                  used {it.times_used}×
                                </span>
                              )}
                            </div>
                          </button>
                          {!isCollegeCourse && (
                          <button
                            onClick={() => handleGenerateSimilar(it)}
                            disabled={generatingSimilarId === it.id}
                            title="Generate similar question with AI"
                            className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-2 text-pen hover:text-ink hover:bg-pen/10 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {generatingSimilarId === it.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Sparkles size={16} />
                            )}
                          </button>
                        )}
                          <button
                            onClick={() => toggleEnabled(it)}
                            title={it.enabled ? "Disable" : "Enable"}
                            className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-2 text-graphite hover:text-ink hover:bg-rule/50 rounded-lg transition-colors"
                          >
                            {it.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                          <button
                            onClick={() => setDialog({ kind: "delQuestion", item: it })}
                            title="Remove"
                            className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-2 text-graphite hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {open && (
                          <div className="px-4 pb-4 pl-[52px] border-t border-rule pt-3">
                            <QuestionPreview question={it.payload} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {showGen && canGenerate && (
        <GenerateQuestionsModal
          ctx={{
            unitId: activeUnitObj!.id,
            unitName: activeUnitObj!.name,
            bookName: activeUnitObj!.book_name,
            subject: activeSubjectObj!.name,
            className: activeSubjectObj!.class_name,
          }}
          onClose={() => setShowGen(false)}
          onGenerated={handleGenerated}
        />
      )}

      {dialog?.kind === "subject" && (
        <PromptModal
          title="New subject"
          subtitle="Group your units under a subject, e.g. Maths for Class 4."
          fields={[
            { name: "name", label: "Subject name", placeholder: "Maths", required: true },
            { name: "class_name", label: "Class", placeholder: "4" },
          ]}
          submitLabel="Add subject"
          onCancel={() => setDialog(null)}
          onSubmit={addSubject}
        />
      )}

      {dialog?.kind === "unit" && (
        <PromptModal
          title="New unit"
          subtitle="A chapter or unit from the textbook. Questions live inside units."
          fields={[
            {
              name: "name",
              label: "Unit name",
              placeholder: "Unit 3 — Multiplication",
              required: true,
            },
            { name: "book_name", label: "Textbook", placeholder: "NCERT Math-Magic" },
          ]}
          submitLabel="Add unit"
          onCancel={() => setDialog(null)}
          onSubmit={(v) => addUnit(dialog.subjectId, v)}
        />
      )}

      {dialog?.kind === "delSubject" && (
        <ConfirmModal
          title={`Delete "${dialog.subject.name}"?`}
          body="Its units are deleted too. The questions themselves stay in your bank and move to Unfiled, so nothing you generated is lost."
          confirmLabel="Delete subject"
          onCancel={() => setDialog(null)}
          onConfirm={() => removeSubject(dialog.subject)}
        />
      )}

      {dialog?.kind === "delUnit" && (
        <ConfirmModal
          title={`Delete "${dialog.unit.name}"?`}
          body="The questions in this unit stay in your bank and move to Unfiled."
          confirmLabel="Delete unit"
          onCancel={() => setDialog(null)}
          onConfirm={() => removeUnit(dialog.unit)}
        />
      )}

      {dialog?.kind === "delQuestion" && (
        <ConfirmModal
          title="Remove this question?"
          body={`"${(dialog.item.title || dialog.item.type).slice(0, 120)}" will be deleted from your bank permanently. To keep it but leave it out of papers, disable it instead.`}
          confirmLabel="Delete question"
          onCancel={() => setDialog(null)}
          onConfirm={() => handleDelete(dialog.item.id)}
        />
      )}

      {/* Sticky action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-rule z-40 safe-bottom">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-graphite">
                <b className="text-ink">{selected.size}</b> selected{" "}
                <span className="text-xs text-graphite">({selectedMarks} marks)</span>
              </span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-pen hover:underline font-medium"
              >
                Deselect all
              </button>
            </div>
            <div className="flex items-center gap-2">
              {units.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) fileSelectedInto(e.target.value);
                    e.target.value = "";
                  }}
                  className="py-2 px-2 text-sm border border-rule rounded-lg"
                >
                  <option value="">File into unit…</option>
                  {subjects.map((s) => (
                    <optgroup key={s.id} label={s.name}>
                      {units
                        .filter((u) => u.subject_id === s.id)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              )}
              <button
                onClick={createFromSelected}
                disabled={creating}
                className="flex items-center gap-2 bg-pen text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-ink transition-colors disabled:opacity-60"
              >
                {creating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Make paper (Free)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
