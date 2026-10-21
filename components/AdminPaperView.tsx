"use client";

import { useState } from "react";
import PrintPreview from "@/components/PrintPreview";
import ScaledPaper from "@/components/ScaledPaper";
import PageGuides from "@/components/PageGuides";
import { isStructuralQuestion, type PaperSettings, type Question } from "@/lib/types";

/**
 * Read-only admin view of a teacher's paper.
 *
 * Renders through the same PrintPreview the teacher sees, because the point is
 * to reproduce a layout bug exactly — a simplified viewer would hide the very
 * thing being investigated. Page guides are on for the same reason.
 *
 * The JSON tab matters as much as the render: a scan that came back wrong is
 * usually wrong in the data, and the shape tells you which renderer or which
 * part of the extraction to look at.
 */
export default function AdminPaperView({
  settings,
  questions,
}: {
  settings: PaperSettings;
  questions: Question[];
}) {
  const [tab, setTab] = useState<"paper" | "data">("paper");

  const typeCounts = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.type] = (acc[q.type] ?? 0) + 1;
    return acc;
  }, {});
  const imageCount = questions.reduce(
    (n, q) => n + (q.images?.length ?? 0) + (q.items?.filter((i) => i.image).length ?? 0),
    0
  );
  let questionNumber = 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["paper", "data"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-ink text-white" : "bg-white text-graphite border border-rule"
            }`}
          >
            {t === "paper" ? "Rendered paper" : "Question data"}
          </button>
        ))}
        <span className="text-xs text-graphite ml-auto">
          {questions.length} questions · {Object.entries(typeCounts).map(([k, v]) => `${k}×${v}`).join(", ") || "none"}
          {imageCount > 0 && ` · ${imageCount} image${imageCount === 1 ? "" : "s"}`}
          {" · "}
          {settings?.language ?? "english"}
        </span>
      </div>

      {tab === "paper" ? (
        <div className="bg-white border border-rule rounded-lg p-3 sm:p-6 overflow-x-auto">
          <ScaledPaper fit>
            <div className="paper-container" style={{ width: "210mm", minHeight: "297mm" }}>
              <PageGuides
                margin={settings?.margin ?? "normal"}
                contentKey={questions.length}
              >
                {/* watermark left off: this is for reading the layout, and the
                    teacher's paid status is not the question here. */}
                <PrintPreview settings={settings} questions={questions} />
              </PageGuides>
            </div>
          </ScaledPaper>
        </div>
      ) : (
        <div className="space-y-3">
          <details className="bg-white border border-rule rounded-lg p-4" open>
            <summary className="cursor-pointer font-medium text-ink text-sm">
              Settings
            </summary>
            <pre className="mt-3 text-[11px] leading-relaxed overflow-x-auto text-graphite">
              {JSON.stringify(settings, null, 2)}
            </pre>
          </details>
          {questions.map((q, i) => {
            const structural = isStructuralQuestion(q);
            if (!structural) questionNumber += 1;
            return (
            <details key={q.id ?? i} className="bg-white border border-rule rounded-lg p-4">
              <summary className="cursor-pointer font-medium text-ink text-sm">
                {structural ? "Section / instructions" : `Q${questionNumber}`} · {q.type} · {q.marks}M
                <span className="font-normal text-graphite"> — {q.title}</span>
              </summary>
              <pre className="mt-3 text-[11px] leading-relaxed overflow-x-auto text-graphite">
                {JSON.stringify(
                  q,
                  (key, value) =>
                    // Base64 images run to megabytes and drown the useful
                    // fields; the render tab is where you look at them.
                    (key === "image" || key === "images") && value
                      ? `[image data omitted — ${
                          Array.isArray(value) ? value.length : 1
                        } shown in the rendered tab]`
                      : value,
                  2
                )}
              </pre>
            </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
