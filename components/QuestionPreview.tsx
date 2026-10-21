"use client";

import type { Question } from "@/lib/types";
import { PAPER_LANGUAGE_FONT_STACK, dirOf, type PaperLanguage } from "@/lib/types";

// Read-only rendering of a whole bank question. The bank list used to show only
// the instruction line, which is useless for deciding whether to keep a question
// — a teacher needs to read the actual items before disabling or deleting one.
//
// This is deliberately not PrintPreview: that renders paper geometry (A4 columns,
// ruled answer space, marks gutter) and needs full PaperSettings. Here we only
// need the content, legibly.

interface Props {
  question: Question;
  /** Script for the question text. Auto-detected from the content when omitted. */
  language?: PaperLanguage;
}

// Bank rows store a Question but not the paper language it was written for, so
// pick the font stack off the script actually present in the text. First match
// wins; anything unmatched falls back to English.
const SCRIPT_RANGES: Array<[RegExp, PaperLanguage]> = [
  [/[ऀ-ॿ]/, "hindi"], // Devanagari — also Marathi/Nepali/Sanskrit
  [/[ঀ-৿]/, "bengali"],
  [/[਀-੿]/, "punjabi"],
  [/[઀-૿]/, "gujarati"],
  [/[଀-୿]/, "odia"],
  [/[஀-௿]/, "tamil"],
  [/[ఀ-౿]/, "telugu"],
  [/[ಀ-೿]/, "kannada"],
  [/[ഀ-ൿ]/, "malayalam"],
  [/[؀-ۿ]/, "urdu"],
];

function detectLanguage(q: Question): PaperLanguage {
  const sample = [
    q.title,
    q.passage ?? "",
    ...(q.items ?? []).map((i) => i.content ?? ""),
    ...(q.matchLeft ?? []),
  ]
    .join(" ")
    .slice(0, 400);
  for (const [re, lang] of SCRIPT_RANGES) if (re.test(sample)) return lang;
  return "english";
}

export default function QuestionPreview({ question: q, language }: Props) {
  const lang = language ?? detectLanguage(q);
  const font = PAPER_LANGUAGE_FONT_STACK[lang]?.serif;
  const dir = dirOf(lang);
  const textStyle = { fontFamily: font } as const;

  return (
    <div
      className="text-[15px] leading-relaxed text-ink space-y-3"
      dir={dir}
      lang={lang}
      style={textStyle}
    >
      {q.passageTitle && (
        <div className="text-center font-bold text-ink text-[15px]">
          {q.passageTitle}
        </div>
      )}
      {q.passage && (
        <div className="bg-paper border border-rule rounded-lg p-3 whitespace-pre-wrap text-[14px] text-graphite">
          {q.passage}
        </div>
      )}

      {/* match: two aligned columns */}
      {q.type === "match" && (!!q.matchLeft?.length || !!q.matchRight?.length) && (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-1.5 max-w-md">
          {Array.from({ length: Math.max(q.matchLeft?.length || 0, q.matchRight?.length || 0) }).map((_, i) => (
            <div key={i} className="contents">
              <span className="text-ink">{q.matchLeft?.[i] || ""}</span>
              <span className="text-graphite">{q.matchLeft?.[i] || q.matchRight?.[i] ? "—" : ""}</span>
              <span className="text-ink">{q.matchRight?.[i] || ""}</span>
            </div>
          ))}
        </div>
      )}

      {/* table / grid */}
      {q.type === "table" && !!q.tableRows?.length && (
        <div className="overflow-x-auto">
          {q.tableCaption && (
            <p className="text-[13px] text-graphite mb-1">{q.tableCaption}</p>
          )}
          <table className="border-collapse text-[14px] w-full table-fixed">
            <colgroup>
              {Array.from({ length: q.tableRows?.[0]?.length || 0 }).map((_, ci) => {
                const colCount = q.tableRows?.[0]?.length || 0;
                const w = q.tableColWidths?.[ci] ?? (q.tableHeaderCol && colCount === 2 ? (ci === 0 ? "22%" : "78%") : undefined);
                return <col key={ci} style={w ? { width: w } : undefined} />;
              })}
            </colgroup>
            <tbody>
              {q.tableRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    const head =
                      (q.tableHeaderRow !== false && ri === 0) ||
                      (q.tableHeaderCol && ci === 0);
                    const isBlank = !cell.trim();
                    const colW = q.tableColWidths?.[ci] ?? (q.tableHeaderCol && row.length === 2 ? (ci === 0 ? "22%" : "78%") : undefined);
                    return (
                      <td
                        key={ci}
                        style={{ width: colW }}
                        className={`${
                          q.tableHideBorders ? "" : "border border-rule"
                        } px-2.5 py-1.5 min-w-[54px] ${
                          head ? "bg-paper font-semibold" : ""
                        }`}
                      >
                        {isBlank ? (
                          q.tableBlankLine ? (
                            <span className="inline-block border-b-2 border-rule w-8 h-4 align-bottom" />
                          ) : (
                            <span className="text-rule">—</span>
                          )
                        ) : (
                          cell
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* draw box & writing lines preview */}
      {q.type === "draw" && (
        <div className="space-y-2">
          {(q.drawLinesPosition === "above" || q.drawOrder === "lines-first") && !!q.writingLines && (
            <div className="space-y-1.5 max-w-md">
              {Array.from({ length: q.writingLines }).map((_, li) => (
                <div key={li} className="border-b border-rule h-4" />
              ))}
            </div>
          )}
          <div
            className="border border-rule rounded bg-white w-full max-w-md flex items-center justify-center text-xs text-graphite"
            style={{ height: `${Math.min(q.boxHeight || 100, 140)}px` }}
          >
            [ Drawing / Illustration Box ]
          </div>
          {q.drawLinesPosition !== "above" && q.drawOrder !== "lines-first" && !!q.writingLines && (
            <div className="space-y-1.5 max-w-md">
              {Array.from({ length: q.writingLines }).map((_, li) => (
                <div key={li} className="border-b border-rule h-4" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* sub-items — the body of most question types */}
      {!!q.items?.length && (
        <ol className="space-y-2.5">
          {q.items.map((it, i) => {
            const nums = it.nums?.length
              ? it.nums
              : [it.num1, it.num2].filter(Boolean as unknown as (x: unknown) => x is string);
            return (
              <li key={it.id || i} className="flex gap-2.5">
                <span className="text-graphite text-[13px] pt-0.5 shrink-0 w-5 text-right">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  {nums.length > 0 ? (
                    <span className="font-mono text-[15px] text-ink">
                      {nums.join(` ${q.operation ?? "+"} `)} =
                    </span>
                  ) : (
                    <span className="text-ink">{it.content}</span>
                  )}

                  {!!it.options?.length && (
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {it.options.map((o, oi) => (
                        <span key={oi} className="text-graphite text-[14px]">
                          <span className="text-rule">
                            ({String.fromCharCode(97 + oi)})
                          </span>{" "}
                          {o}
                        </span>
                      ))}
                    </div>
                  )}

                  {!!it.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.image}
                      alt=""
                      className="mt-1.5 max-h-24 rounded border border-rule"
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!!q.images?.length && (
        <div className="flex flex-wrap gap-2">
          {q.images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className="max-h-28 rounded border border-rule"
            />
          ))}
        </div>
      )}

      {/* Types that carry no items still deserve an honest note. */}
      {!q.items?.length &&
        !q.matchLeft?.length &&
        !q.tableRows?.length &&
        !q.compositionSentences?.length &&
        q.type !== "draw" && (
          <p className="text-[13px] text-graphite italic">
            No sub-questions — this is a single prompt with writing space.
          </p>
        )}
    </div>
  );
}
