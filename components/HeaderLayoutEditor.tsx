"use client";

import { ChevronUp, ChevronDown, X } from "lucide-react";
import {
  HEADER_FIELD_LABELS,
  DEFAULT_HEADER_ROWS,
  MAX_HEADER_ROWS,
  MAX_HEADER_SLOTS,
  type HeaderField,
} from "@/lib/types";

// Row-and-slot editor for the paper header. Built as stacked cards rather than a
// wide grid so it stays usable on a phone, where most teachers work.
export default function HeaderLayoutEditor({
  rows,
  onChange,
}: {
  rows: HeaderField[][];
  onChange: (rows: HeaderField[][]) => void;
}) {
  const setSlot = (ri: number, ci: number, value: HeaderField) => {
    const next = rows.map((r) => [...r]);
    next[ri][ci] = value;
    onChange(next);
  };

  const addSlot = (ri: number) => {
    const next = rows.map((r) => [...r]);
    if (next[ri].length >= MAX_HEADER_SLOTS) return;
    next[ri].push("blank");
    onChange(next);
  };

  const removeSlot = (ri: number, ci: number) => {
    const next = rows.map((r) => [...r]);
    next[ri].splice(ci, 1);
    // Dropping the last slot removes the row entirely.
    onChange(next[ri].length === 0 ? next.filter((_, i) => i !== ri) : next);
  };

  const addRow = () => {
    if (rows.length >= MAX_HEADER_ROWS) return;
    onChange([...rows.map((r) => [...r]), ["blank"]]);
  };

  const moveRow = (ri: number, dir: -1 | 1) => {
    const to = ri + dir;
    if (to < 0 || to >= rows.length) return;
    const next = rows.map((r) => [...r]);
    [next[ri], next[to]] = [next[to], next[ri]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {rows.map((row, ri) => (
        <div key={ri} className="border border-rule rounded-lg p-2.5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wide text-graphite">
              Row {ri + 1}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => moveRow(ri, -1)}
                disabled={ri === 0}
                aria-label="Move row up"
                className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] lg:min-h-0 lg:min-w-0 p-2 lg:p-1 text-graphite hover:text-ink disabled:opacity-30 rounded"
              >
                <ChevronUp size={15} />
              </button>
              <button
                onClick={() => moveRow(ri, 1)}
                disabled={ri === rows.length - 1}
                aria-label="Move row down"
                className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] lg:min-h-0 lg:min-w-0 p-2 lg:p-1 text-graphite hover:text-ink disabled:opacity-30 rounded"
              >
                <ChevronDown size={15} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {row.map((field, ci) => (
              <div key={ci} className="flex items-center gap-1 min-w-[46%] sm:min-w-[150px] flex-1">
                <select
                  value={field}
                  onChange={(e) => setSlot(ri, ci, e.target.value as HeaderField)}
                  className="w-full px-2 py-2 lg:py-1.5 min-h-[40px] lg:min-h-0 border border-rule rounded-lg text-xs bg-white focus:ring-2 focus:ring-ink focus:border-ink outline-none"
                >
                  {(Object.keys(HEADER_FIELD_LABELS) as HeaderField[]).map((f) => (
                    <option key={f} value={f}>
                      {HEADER_FIELD_LABELS[f]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeSlot(ri, ci)}
                  aria-label="Remove this slot"
                  className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] lg:min-h-0 lg:min-w-0 p-2 lg:p-1 text-graphite hover:text-red-600 shrink-0 rounded"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {row.length < MAX_HEADER_SLOTS && (
              <button
                onClick={() => addSlot(ri)}
                className="px-2.5 py-2 lg:py-1.5 min-h-[40px] lg:min-h-0 text-xs font-medium text-ink border border-dashed border-rule rounded-lg hover:border-ink shrink-0"
              >
                + Slot
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        {rows.length < MAX_HEADER_ROWS && (
          <button
            onClick={addRow}
            className="px-3 py-2 lg:py-1.5 min-h-[40px] lg:min-h-0 text-xs font-medium text-ink border border-dashed border-rule rounded-lg hover:border-ink"
          >
            + Add row
          </button>
        )}
        <button
          onClick={() => onChange(DEFAULT_HEADER_ROWS.map((r) => [...r]))}
          className="px-3 py-2 lg:py-1.5 min-h-[40px] lg:min-h-0 text-xs text-graphite hover:text-ink rounded-lg"
        >
          Reset to default
        </button>
      </div>
      <p className="text-[11px] text-graphite">
        Name, Roll No and Date print as blank rules for the student. The rest
        print the values you set above.
      </p>
    </div>
  );
}
