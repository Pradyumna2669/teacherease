"use client";

import { useState } from "react";
import { Plus, Trash2, X, Loader2 } from "lucide-react";
import {
  QUESTION_TYPE_LABELS,
  type Question,
  type QuestionType,
  type SubItem,
} from "@/lib/types";

// Manual question entry for the bank. Covers the types a teacher actually types
// out by hand; the richer layout-only types (custom blocks, draw boxes, image
// labelling) stay in the paper builder, where the live A4 preview makes them
// meaningful. Anything scanned or saved from a paper keeps its full payload.
const FORM_TYPES: QuestionType[] = [
  "fill-blanks",
  "mcq",
  "true-false",
  "match",
  "short-answer",
  "long-answer",
  "word-problem",
  "math-vertical",
  "comprehension",
];

const newId = () => Math.random().toString(36).slice(2, 10);

export interface BankFormValue {
  title: string;
  type: QuestionType;
  marks: number;
  question: Question;
}

interface Props {
  /** Editing an existing bank question; omit to add a new one. */
  initial?: { title: string; marks: number; payload: Question };
  busy?: boolean;
  onCancel: () => void;
  onSave: (value: BankFormValue) => void;
}

export default function BankQuestionForm({ initial, busy, onCancel, onSave }: Props) {
  const [type, setType] = useState<QuestionType>(
    (initial?.payload.type as QuestionType) ?? "fill-blanks"
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [marks, setMarks] = useState(initial?.marks ?? 1);
  const [items, setItems] = useState<SubItem[]>(
    initial?.payload.items?.length
      ? initial.payload.items
      : [{ id: newId(), content: "" }]
  );
  const [passage, setPassage] = useState(initial?.payload.passage ?? "");
  const [passageTitle, setPassageTitle] = useState(initial?.payload.passageTitle ?? "");
  const [operation, setOperation] = useState<"+" | "-" | "×" | "÷">(
    initial?.payload.operation ?? "+"
  );
  const [matchLeft, setMatchLeft] = useState<string[]>(
    initial?.payload.matchLeft?.length ? initial.payload.matchLeft : ["", ""]
  );
  const [matchRight, setMatchRight] = useState<string[]>(
    initial?.payload.matchRight?.length ? initial.payload.matchRight : ["", ""]
  );

  const isMatch = type === "match";
  const isMath = type === "math-vertical";
  const isMcq = type === "mcq";

  function patchItem(id: string, patch: Partial<SubItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: newId(), content: "", ...(isMcq ? { options: ["", "", "", ""] } : {}) },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));
  }

  function setMatchRow(i: number, side: "l" | "r", v: string) {
    const setter = side === "l" ? setMatchLeft : setMatchRight;
    setter((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  }

  function addMatchRow() {
    setMatchLeft((p) => [...p, ""]);
    setMatchRight((p) => [...p, ""]);
  }

  function removeMatchRow(i: number) {
    if (matchLeft.length <= 2) return;
    setMatchLeft((p) => p.filter((_, idx) => idx !== i));
    setMatchRight((p) => p.filter((_, idx) => idx !== i));
  }

  const valid =
    title.trim().length > 0 &&
    marks > 0 &&
    (isMatch
      ? matchLeft.some((x) => x.trim()) && matchRight.some((x) => x.trim())
      : isMath
        ? items.some((i) => (i.num1 ?? "").trim() && (i.num2 ?? "").trim())
        : items.some((i) => i.content.trim()));

  function submit() {
    if (!valid || busy) return;
    const cleanItems = isMatch
      ? []
      : items
          .filter((i) =>
            isMath ? (i.num1 ?? "").trim() || (i.num2 ?? "").trim() : i.content.trim()
          )
          .map((i) => ({
            ...i,
            content: i.content.trim(),
            ...(isMcq
              ? { options: (i.options ?? []).map((o) => o.trim()).filter(Boolean) }
              : {}),
          }));

    const question: Question = {
      id: initial?.payload.id ?? newId(),
      type,
      title: title.trim(),
      marks,
      items: cleanItems,
      ...(isMatch
        ? {
            matchLeft: matchLeft.map((x) => x.trim()).filter(Boolean),
            matchRight: matchRight.map((x) => x.trim()).filter(Boolean),
          }
        : {}),
      ...(isMath ? { operation } : {}),
      ...(type === "comprehension"
        ? {
            ...(passage.trim() ? { passage: passage.trim() } : {}),
            ...(passageTitle.trim() ? { passageTitle: passageTitle.trim() } : {}),
          }
        : {}),
    };

    onSave({ title: title.trim(), type, marks, question });
  }

  const field =
    "w-full px-3 py-2 text-sm border border-rule rounded-lg focus:ring-2 focus:ring-pen/20 focus:border-pen outline-none";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-graphite">Question type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType)}
            className={`${field} mt-1`}
          >
            {FORM_TYPES.map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-graphite">Marks</span>
          <input
            type="number"
            min={1}
            value={marks}
            onChange={(e) => setMarks(Math.max(1, Number(e.target.value) || 1))}
            className={`${field} mt-1`}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-graphite">
          Instruction line
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Fill in the blanks:"
          className={`${field} mt-1`}
        />
      </label>

      {type === "comprehension" && (
        <>
          <label className="block">
            <span className="text-xs font-medium text-graphite">Passage Title (optional - centered)</span>
            <input
              type="text"
              value={passageTitle}
              onChange={(e) => setPassageTitle(e.target.value)}
              placeholder="e.g. The Honest Woodcutter"
              className={`${field} mt-1`}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-graphite">Passage</span>
            <textarea
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              rows={4}
              placeholder="Paste the reading passage here"
              className={`${field} mt-1 resize-y`}
            />
          </label>
        </>
      )}

      {isMath && (
        <label className="block w-40">
          <span className="text-xs font-medium text-graphite">Operation</span>
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value as "+" | "-" | "×" | "÷")}
            className={`${field} mt-1`}
          >
            {(["+", "-", "×", "÷"] as const).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Match pairs */}
      {isMatch ? (
        <div>
          <span className="text-xs font-medium text-graphite">Pairs</span>
          <div className="mt-1 space-y-2">
            {matchLeft.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={l}
                  onChange={(e) => setMatchRow(i, "l", e.target.value)}
                  placeholder="Column A"
                  className={field}
                />
                <span className="text-graphite text-xs shrink-0">→</span>
                <input
                  value={matchRight[i] ?? ""}
                  onChange={(e) => setMatchRow(i, "r", e.target.value)}
                  placeholder="Column B"
                  className={field}
                />
                <button
                  type="button"
                  onClick={() => removeMatchRow(i)}
                  disabled={matchLeft.length <= 2}
                  className="p-2 text-graphite hover:text-red-600 disabled:opacity-30 shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addMatchRow}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-pen font-medium hover:underline"
          >
            <Plus size={14} /> Add pair
          </button>
        </div>
      ) : (
        <div>
          <span className="text-xs font-medium text-graphite">
            {isMath ? "Sums" : "Questions"}
          </span>
          <div className="mt-1 space-y-3">
            {items.map((it, idx) => (
              <div key={it.id} className="border border-rule rounded-lg p-3 bg-white">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-graphite mt-2.5 w-5 shrink-0">
                    {idx + 1}.
                  </span>
                  {isMath ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        value={it.num1 ?? ""}
                        onChange={(e) => patchItem(it.id, { num1: e.target.value })}
                        placeholder="345"
                        className={field}
                      />
                      <span className="text-graphite shrink-0">{operation}</span>
                      <input
                        value={it.num2 ?? ""}
                        onChange={(e) => patchItem(it.id, { num2: e.target.value })}
                        placeholder="218"
                        className={field}
                      />
                    </div>
                  ) : (
                    <input
                      value={it.content}
                      onChange={(e) => patchItem(it.id, { content: e.target.value })}
                      placeholder={
                        type === "fill-blanks"
                          ? "Use ___ for the blank"
                          : "Type the question"
                      }
                      className={field}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    disabled={items.length <= 1}
                    className="p-2 text-graphite hover:text-red-600 disabled:opacity-30 shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {isMcq && (
                  <div className="mt-2 ml-7 grid grid-cols-2 gap-2">
                    {[0, 1, 2, 3].map((oi) => (
                      <input
                        key={oi}
                        value={it.options?.[oi] ?? ""}
                        onChange={(e) => {
                          const opts = [...(it.options ?? ["", "", "", ""])];
                          opts[oi] = e.target.value;
                          patchItem(it.id, { options: opts });
                        }}
                        placeholder={`Option ${String.fromCharCode(97 + oi)}`}
                        className={`${field} text-xs`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-pen font-medium hover:underline"
          >
            <Plus size={14} /> Add {isMath ? "sum" : "question"}
          </button>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-rule">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-graphite hover:text-ink rounded-lg"
        >
          <X size={15} className="inline mr-1" /> Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!valid || busy}
          className="inline-flex items-center gap-2 bg-pen text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-ink transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {initial ? "Save changes" : "Add to bank"}
        </button>
      </div>
    </div>
  );
}
