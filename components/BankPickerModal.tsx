"use client";

import { useEffect, useMemo, useState } from "react";
import { Library, Loader2, X, Shuffle, Check, AlertTriangle } from "lucide-react";
import {
  listBank,
  listSubjects,
  listUnits,
  pickQuestions,
  markQuestionsUsed,
  unitStats,
  type BankItem,
  type BankSubject,
  type BankUnit,
} from "@/lib/question-bank";
import type { Question } from "@/lib/types";
import { useModalHistory } from "@/components/Modal";

// Pull questions out of the bank into the paper being built. The teacher picks
// units and a marks target; the rotation picker in lib/question-bank favours
// least-used questions, so building the same unit twice gives a different paper.
interface Props {
  onClose: () => void;
  onPick: (questions: Question[]) => void;
  /** Questions already in the paper — never offered again. */
  existingBankIds?: string[];
}

export default function BankPickerModal({ onClose, onPick, existingBankIds = [] }: Props) {
  const [items, setItems] = useState<BankItem[]>([]);
  const [subjects, setSubjects] = useState<BankSubject[]>([]);
  const [units, setUnits] = useState<BankUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chosenUnits, setChosenUnits] = useState<Set<string>>(new Set());
  const [targetMarks, setTargetMarks] = useState(20);
  const [preview, setPreview] = useState<BankItem[] | null>(null);
  const [short, setShort] = useState(false);
  const [adding, setAdding] = useState(false);

  // Android Back closes the sheet instead of leaving the paper.
  useModalHistory(true, onClose);

  useEffect(() => {
    (async () => {
      try {
        const [b, s, u] = await Promise.all([
          listBank({ enabled: true }),
          listSubjects(),
          listUnits(),
        ]);
        setItems(b);
        setSubjects(s);
        setUnits(u);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Could not load your bank.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => unitStats(items), [items]);

  const availableMarks = useMemo(() => {
    if (chosenUnits.size === 0) {
      return items.reduce((n, i) => n + (i.enabled ? i.marks : 0), 0);
    }
    let n = 0;
    chosenUnits.forEach((id) => {
      n += stats.get(id)?.marks ?? 0;
    });
    return n;
  }, [chosenUnits, stats, items]);

  function toggleUnit(id: string) {
    setPreview(null);
    setChosenUnits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runPick() {
    const res = pickQuestions(items, {
      unitIds: Array.from(chosenUnits),
      targetMarks,
      excludeIds: existingBankIds,
    });
    setPreview(res.items);
    setShort(res.short);
  }

  async function confirm() {
    if (!preview?.length) return;
    setAdding(true);
    try {
      // Fresh ids so the same bank question can appear in two papers safely.
      onPick(
        preview.map((p) => ({
          ...p.payload,
          id: crypto.randomUUID().slice(0, 8),
        }))
      );
      // Rotation bookkeeping — best-effort, never blocks the add.
      await markQuestionsUsed(preview.map((p) => p.id)).catch(() => {});
    } finally {
      setAdding(false);
    }
  }

  const previewMarks = preview?.reduce((n, p) => n + p.marks, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-paper w-full sm:max-w-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col">
        <div className="border-b border-rule px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Library size={18} className="text-pen" />
            <div>
              <h2 className="font-display text-lg font-semibold text-ink leading-tight">
                Add from question bank
              </h2>
              <p className="text-xs text-graphite">
                Pick units and a marks target — least-used questions come first.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-graphite hover:text-ink rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-14 text-graphite">
              <Loader2 size={26} className="animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-graphite text-center py-12">
              Your bank has no live questions yet. Add some in the Question Bank
              first.
            </p>
          ) : (
            <>
              <div>
                <span className="text-xs font-medium text-graphite">
                  Units{" "}
                  <span className="font-normal">(none selected = whole bank)</span>
                </span>
                <div className="mt-2 space-y-3">
                  {subjects.map((s) => {
                    const su = units.filter((u) => u.subject_id === s.id);
                    if (!su.length) return null;
                    return (
                      <div key={s.id}>
                        <p className="text-xs font-semibold text-ink mb-1.5">
                          {s.name}
                          {s.class_name ? ` · Class ${s.class_name}` : ""}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {su.map((u) => {
                            const on = chosenUnits.has(u.id);
                            const st = stats.get(u.id);
                            return (
                              <button
                                key={u.id}
                                onClick={() => toggleUnit(u.id)}
                                className={`text-sm lg:text-xs px-3.5 lg:px-2.5 py-2.5 lg:py-1.5 rounded-full border transition-colors ${
                                  on
                                    ? "bg-pen text-white border-pen"
                                    : "bg-white text-graphite border-rule hover:border-pen/40"
                                }`}
                              >
                                {u.name}
                                <span className={on ? "text-white/80" : "text-graphite"}>
                                  {" "}
                                  · {st?.marks ?? 0}m
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-end gap-3">
                <label className="block w-40">
                  <span className="text-xs font-medium text-graphite">
                    Marks wanted
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={targetMarks}
                    onChange={(e) => {
                      setPreview(null);
                      setTargetMarks(Math.max(1, Number(e.target.value) || 1));
                    }}
                    className="w-full mt-1 px-3 py-2 text-sm border border-rule rounded-lg focus:ring-2 focus:ring-pen/20 focus:border-pen outline-none"
                  />
                </label>
                <span className="text-xs text-graphite pb-2.5">
                  {availableMarks} marks available
                </span>
                <button
                  onClick={runPick}
                  className="ml-auto inline-flex items-center gap-2 bg-white border border-rule text-ink px-4 py-2 rounded-lg font-medium text-sm hover:border-pen/40"
                >
                  <Shuffle size={15} />
                  {preview ? "Shuffle again" : "Pick questions"}
                </button>
              </div>

              {preview && (
                <div>
                  {short && (
                    <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                      <span>
                        Only {previewMarks} of {targetMarks} marks available in
                        these units. Add more questions, or generate some.
                      </span>
                    </div>
                  )}
                  <p className="text-xs font-medium text-graphite mb-2">
                    {preview.length} question{preview.length === 1 ? "" : "s"} ·{" "}
                    {previewMarks} marks
                  </p>
                  <div className="space-y-1.5">
                    {preview.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 bg-white border border-rule rounded-lg px-3 py-2"
                      >
                        <Check size={14} className="text-pen shrink-0" />
                        <span className="text-sm text-ink flex-1 line-clamp-1">
                          {p.title || p.type}
                        </span>
                        <span className="text-xs text-graphite shrink-0">
                          {p.marks}m
                          {p.times_used > 0 && ` · used ${p.times_used}×`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-rule bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-graphite hover:text-ink rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!preview?.length || adding}
            className="inline-flex items-center gap-2 bg-pen text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-ink transition-colors disabled:opacity-50"
          >
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Add {preview?.length ?? 0} to paper
          </button>
        </div>
      </div>
    </div>
  );
}
