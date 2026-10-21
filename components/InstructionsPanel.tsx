"use client";

import { useState } from "react";
import { ListOrdered, Plus, Trash2, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import type { PaperSettings } from "@/lib/types";

interface Props {
  settings: PaperSettings;
  onChange: (updates: Partial<PaperSettings>) => void;
}

const PRESET_CBSE = [
  "This question paper contains 5 sections: A, B, C, D, and E.",
  "Section A comprises 20 Multiple Choice Questions carrying 1 mark each.",
  "Section B comprises 5 Short Answer Questions carrying 2 marks each.",
  "Section C comprises 6 Short Answer Questions carrying 3 marks each.",
  "Section D comprises 3 Long Answer Questions carrying 5 marks each.",
  "Section E comprises 3 Case-Based Questions carrying 4 marks each.",
  "All questions are compulsory. Internal choice has been provided in some questions.",
  "Use of calculators is not permitted.",
];

const PRESET_STANDARD = [
  "All questions are compulsory.",
  "Read each question carefully before attempting.",
  "Marks for each question are indicated against it.",
  "Write your answers neatly and legibly in the space provided.",
  "Use of calculators or electronic devices is not permitted.",
];

export default function InstructionsPanel({ settings, onChange }: Props) {
  const instructions = settings.instructions || [];
  const [isOpen, setIsOpen] = useState(instructions.length > 0);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const updateList = (newList: string[]) => {
    onChange({ instructions: newList });
  };

  const handleToggle = (checked: boolean) => {
    setIsOpen(checked);
    if (!checked) {
      updateList([]);
    } else if (instructions.length === 0) {
      updateList([...PRESET_STANDARD]);
    }
  };

  const handleAddLine = () => {
    updateList([...instructions, ""]);
  };

  const handleChangeLine = (index: number, text: string) => {
    const next = [...instructions];
    next[index] = text;
    updateList(next);
  };

  const handleDeleteLine = (index: number) => {
    const next = instructions.filter((_, i) => i !== index);
    updateList(next);
  };

  const handleMove = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= instructions.length) return;
    const next = [...instructions];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    updateList(next);
  };

  const handleApplyPreset = (preset: string[]) => {
    updateList([...preset]);
    setBulkMode(false);
  };

  const startBulkEdit = () => {
    setBulkText(instructions.join("\n"));
    setBulkMode(true);
  };

  const saveBulkEdit = () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => l.replace(/^\d+[\.\)]\s*/, ""));
    updateList(lines);
    setBulkMode(false);
  };

  return (
    <div className="border-t border-rule pt-4">
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isOpen && instructions.length > 0}
          onChange={(e) => handleToggle(e.target.checked)}
          className="accent-pen mt-1 w-4 h-4 rounded"
        />
        <div className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <ListOrdered size={16} className="text-pen" />
            General Instructions
          </span>
          <span className="block text-xs text-graphite mt-0.5">
            Numbered guidelines printed between header and questions
          </span>
        </div>
      </label>

      {isOpen && (
        <div className="mt-3 pl-6 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-graphite mr-1 text-[11px] font-medium">Presets:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset(PRESET_CBSE)}
              className="px-2 py-1 rounded bg-rule/50 hover:bg-rule text-ink font-medium text-[11px] transition-colors flex items-center gap-1"
            >
              <Sparkles size={11} className="text-pen" />
              CBSE (5 Sections)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(PRESET_STANDARD)}
              className="px-2 py-1 rounded bg-rule/50 hover:bg-rule text-ink font-medium text-[11px] transition-colors"
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => {
                if (bulkMode) saveBulkEdit();
                else startBulkEdit();
              }}
              className="ml-auto text-pen hover:underline text-[11px] font-medium"
            >
              {bulkMode ? "Done editing" : "Paste multiple lines"}
            </button>
          </div>

          {bulkMode ? (
            <div className="space-y-2">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Paste instructions here, one per line..."
                rows={6}
                className="w-full text-xs p-2 border border-rule rounded-lg focus:ring-1 focus:ring-pen outline-none font-mono"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkMode(false)}
                  className="px-2.5 py-1 text-xs text-graphite hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveBulkEdit}
                  className="px-3 py-1 bg-ink text-white rounded text-xs font-medium hover:bg-ink/90"
                >
                  Apply Lines
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {instructions.map((line, idx) => (
                <div key={idx} className="flex items-center gap-1.5 group">
                  <span className="text-xs font-semibold text-graphite w-5 text-right shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={line}
                    onChange={(e) => handleChangeLine(idx, e.target.value)}
                    placeholder={`Instruction ${idx + 1}`}
                    className="flex-1 min-w-0 text-xs px-2.5 py-1.5 border border-rule rounded-lg focus:border-pen focus:ring-1 focus:ring-pen outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 text-graphite hover:text-ink disabled:opacity-20"
                    title="Move up"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 1)}
                    disabled={idx === instructions.length - 1}
                    className="p-1 text-graphite hover:text-ink disabled:opacity-20"
                    title="Move down"
                  >
                    <ChevronDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLine(idx)}
                    className="p-1 text-graphite hover:text-red-500 opacity-60 hover:opacity-100 transition-opacity"
                    title="Delete instruction"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddLine}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-pen font-medium hover:underline py-1"
              >
                <Plus size={14} />
                Add instruction line
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
