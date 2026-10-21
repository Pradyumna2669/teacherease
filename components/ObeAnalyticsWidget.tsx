"use client";

import React, { useMemo } from "react";
import type { BankItem } from "@/lib/question-bank";

interface Props {
  items: BankItem[];
}

const BT_NAMES: Record<number, string> = {
  1: "L1: Remember",
  2: "L2: Understand",
  3: "L3: Apply",
  4: "L4: Analyze",
  5: "L5: Evaluate",
  6: "L6: Create",
};

export default function ObeAnalyticsWidget({ items }: Props) {
  const stats = useMemo(() => {
    const total = items.length;
    if (total === 0) return null;

    const btCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const coCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const diffCounts: Record<string, number> = { easy: 0, medium: 0, hard: 0 };

    let totalMarks = 0;
    let obeTagged = 0;

    items.forEach((it) => {
      const m = it.marks ?? it.payload?.marks ?? 1;
      totalMarks += m;

      const bt = it.bt_level ?? it.payload?.bt_level;
      if (bt && bt >= 1 && bt <= 6) {
        btCounts[bt] = (btCounts[bt] || 0) + 1;
        obeTagged++;
      }

      const co = it.co_no ?? it.payload?.co_no;
      if (co && co >= 1 && co <= 6) {
        coCounts[co] = (coCounts[co] || 0) + 1;
      }

      const d = (it.difficulty ?? it.payload?.difficulty ?? "medium").toLowerCase();
      if (d in diffCounts) {
        diffCounts[d]++;
      } else {
        diffCounts.medium++;
      }
    });

    return {
      total,
      totalMarks,
      obeTagged,
      btCounts,
      coCounts,
      diffCounts,
    };
  }, [items]);

  if (!stats) return null;

  return (
    <div className="bg-white border border-rule rounded-xl p-4 mb-4 space-y-4">
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <div>
          <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
            <span>📊 NBA / NAAC Outcome-Based Analytics</span>
            <span className="text-[11px] font-normal bg-pen/10 text-pen px-2 py-0.5 rounded-full">
              {stats.obeTagged} / {stats.total} tagged
            </span>
          </h3>
          <p className="text-xs text-graphite">
            Distribution across Bloom&apos;s Taxonomy (BTL 1–6) and Course Outcomes (CO1–CO6).
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium text-ink">
            {stats.totalMarks} Total Marks in View
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 text-xs">
        {/* Bloom's Taxonomy Levels */}
        <div className="space-y-1.5">
          <span className="font-semibold text-graphite uppercase tracking-wider text-[10px]">
            Bloom&apos;s Taxonomy Levels
          </span>
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6].map((lvl) => {
              const count = stats.btCounts[lvl] || 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={lvl} className="flex items-center gap-2">
                  <span className="w-24 truncate text-graphite">{BT_NAMES[lvl]}</span>
                  <div className="flex-1 bg-rule/50 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-pen h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-graphite">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Course Outcomes Coverage */}
        <div className="space-y-1.5">
          <span className="font-semibold text-graphite uppercase tracking-wider text-[10px]">
            Course Outcomes (CO) Coverage
          </span>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {[1, 2, 3, 4, 5, 6].map((co) => {
              const count = stats.coCounts[co] || 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div
                  key={co}
                  className="bg-paper border border-rule rounded-lg p-2 text-center"
                >
                  <span className="font-bold text-ink block text-[11px]">CO{co}</span>
                  <span className="text-xs font-mono text-pen font-semibold">{count}</span>
                  <span className="text-[10px] text-graphite block">({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Difficulty Ratio */}
        <div className="space-y-1.5">
          <span className="font-semibold text-graphite uppercase tracking-wider text-[10px]">
            Difficulty Ratio
          </span>
          <div className="space-y-2 pt-1">
            <div>
              <div className="flex justify-between text-graphite mb-1">
                <span className="text-emerald-700 font-medium">Easy</span>
                <span>{stats.diffCounts.easy} ({stats.total > 0 ? Math.round((stats.diffCounts.easy / stats.total) * 100) : 0}%)</span>
              </div>
              <div className="bg-rule/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{
                    width: `${stats.total > 0 ? (stats.diffCounts.easy / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-graphite mb-1">
                <span className="text-amber-700 font-medium">Medium</span>
                <span>{stats.diffCounts.medium} ({stats.total > 0 ? Math.round((stats.diffCounts.medium / stats.total) * 100) : 0}%)</span>
              </div>
              <div className="bg-rule/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{
                    width: `${stats.total > 0 ? (stats.diffCounts.medium / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-graphite mb-1">
                <span className="text-red-700 font-medium">Hard</span>
                <span>{stats.diffCounts.hard} ({stats.total > 0 ? Math.round((stats.diffCounts.hard / stats.total) * 100) : 0}%)</span>
              </div>
              <div className="bg-rule/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-full rounded-full"
                  style={{
                    width: `${stats.total > 0 ? (stats.diffCounts.hard / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
