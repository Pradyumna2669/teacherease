"use client";

import CollegeExamTable from "./CollegeExamTable";

import {
  PaperSettings,
  Question,
  HeaderStyle,
  LineStyle,
  BlankLineStyle,
  DENSITY_METRICS,
  PAPER_LANGUAGE_FONT_STACK,
  PaperLanguage,
  MARGIN_VALUES,
  copyFor,
  dirOf,
  type HeaderField,
  type MatchLabel,
  HEADER_WRITE_IN,
  DEFAULT_HEADER_ROWS,
  matchLabelFor,
  romanNumeral,
  AR_DEFAULT_OPTIONS,
  keepsTogether,
  type CellAlign,
  isStructuralQuestion,
  localizeNumber,
  answerPrefixFor,
} from "@/lib/types";
import { splitTitleAndHints } from "@/lib/hints";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Bare host for the printed footer. Derived from SITE_URL rather than written
// out, so it can never drift from the live domain again.
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

interface Props {
  settings: PaperSettings;
  questions: Question[];
  // When true (free/unpaid user) the paper carries a repeating "TeacherEase"
  // watermark across every page plus a footer CTA. Cleared once the user pays.
  watermark?: boolean;
}

// Faint diagonal repeating "TeacherEase" watermark, inlined as an SVG data URI so it
// survives the innerHTML copy used for printing and is rasterized by html2pdf.
const WATERMARK_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'>" +
      "<text x='20' y='110' font-size='30' font-family='sans-serif' " +
      "fill='rgba(0,0,0,0.06)' transform='rotate(-30 150 100)'>TeacherEase</text></svg>"
  );

function formatBoldText(str: string): React.ReactNode {
  if (!str.includes("**")) return str;
  const parts = str.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Question text may carry manual line breaks (Shift+Enter in the editor), so it
// has to keep its newlines on the printed sheet. Scoped to the text node on
// purpose: making the whole sheet pre-wrap would preserve JSX indentation too.
function Lines({ children }: { children?: React.ReactNode }) {
  let content = children;
  if (typeof children === "string") {
    const normalized = children.replace(/_{14,}/g, "____________");
    return (
      <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word" }}>
        {formatBoldText(normalized)}
      </span>
    );
  }
  return <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word" }}>{content}</span>;
}

export default function PrintPreview({
  settings,
  questions,
  watermark = false,
}: Props) {
  const style = settings.headerStyle || "clean";
  const lineStyle: LineStyle = settings.lineStyle || "single";
  const language = settings.language || "english";

  const metrics = DENSITY_METRICS[settings.density || "comfortable"];
  const fontStack = PAPER_LANGUAGE_FONT_STACK[language][settings.fontFamily || "serif"];
  const fontSize = settings.fontSize || 12;
  const pageColumns = settings.pageColumns || 1;
  const padding = (MARGIN_VALUES[settings.margin || "normal"]).preview;

  // CSS custom properties consumed by inline styles below + by question CSS
  // (globals.css and the print-window stylesheet). Defined on the root so they
  // survive the innerHTML copy used for printing.
  const rootVars = {
    padding,
    fontFamily: fontStack,
    fontSize: `${fontSize}pt`,
    lineHeight: metrics.lineHeight,
    "--pp-q-gap": `${metrics.qGap}pt`,
    "--pp-item-gap": `${metrics.itemGap}pt`,
    "--pp-ans-h": `${metrics.ansHeight}pt`,
    "--pp-title-gap": `${metrics.titleGap}pt`,
    "--pp-line-h": String(metrics.lineHeight),
    ...(watermark
      ? {
          backgroundImage: `url("${WATERMARK_SVG}")`,
          backgroundRepeat: "repeat",
          // Force the watermark to actually print (browsers drop backgrounds
          // unless print-color-adjust is exact).
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }
      : {}),
  } as React.CSSProperties;

  if (settings.layoutMode === "college_table") {
    return (
      <div
        className="paper-preview bg-white"
        dir={dirOf(language)}
        style={rootVars}
      >
        <CollegeExamTable settings={settings} questions={questions} watermark={watermark} />
      </div>
    );
  }

  return (
    <div
      className={`paper-preview bg-white${settings.showAnswerSpace === false ? " pp-question-only" : ""}`}
      dir={dirOf(language)}
      style={rootVars}
    >
      {/* Header - style-dependent */}
      <PaperHeader settings={settings} style={style} language={language} />

      {/* Separator after header */}
      {style === "clean" && (
        <div style={{ borderBottom: "1.5px solid #000", marginTop: "8pt" }} />
      )}

      {/* General Instructions */}
      {settings.instructions?.some((line) => line.trim()) && (
        <div style={{ marginTop: "8pt", marginBottom: "12pt", fontSize: "0.95em", lineHeight: "1.45" }}>
          <div style={{ fontWeight: 700, marginBottom: "3pt", fontSize: "1.02em" }}>
            {copyFor(language).instructionsTitle}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2pt" }}>
            {settings.instructions
              .filter((line) => line.trim())
              .map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "5pt" }}>
                  <span style={{ fontWeight: 700, flexShrink: 0 }}>
                    {localizeNumber(i + 1, language)}.
                  </span>
                  <span>{line}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Questions — flowed into one or two columns for page efficiency */}
      <div
        style={{
          columnCount: pageColumns,
          columnGap: "20pt",
        }}
      >
        {(() => {
          let questionNumber = 0;
          return questions.map((q) => {
            const structural = isStructuralQuestion(q);
            if (!structural) questionNumber += 1;
            const sp = q.spacing || {};
            const qVars: React.CSSProperties = {
              marginTop: sp.qGap != null ? `${sp.qGap}pt` : "var(--pp-q-gap)",
            };
            if (sp.itemGap != null) (qVars as Record<string, string>)["--pp-item-gap"] = `${sp.itemGap}pt`;
            if (sp.ansHeight != null) (qVars as Record<string, string>)["--pp-ans-h"] = `${sp.ansHeight}pt`;
            const atomic = keepsTogether(q);
            return (
              <div
                key={q.id}
                className={`pp-question${atomic ? " pp-keep" : ""}${q.pageBreakBefore ? " pp-break-before html2pdf__page-break-before" : ""}`}
                style={{
                  ...qVars,
                  ...(q.pageBreakBefore ? { breakBefore: "page", pageBreakBefore: "always" } : {}),
                }}
              >
                {structural ? (
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        textAlign: "center",
                        fontSize: "1.08em",
                        letterSpacing: "0.4px",
                        marginTop: "var(--pp-q-gap)",
                        marginBottom: "var(--pp-title-gap)",
                        breakAfter: "avoid",
                        pageBreakAfter: "avoid",
                      }}
                    >
                      <Lines>{q.title}</Lines>
                    </div>
                    {q.images && q.images.length > 0 && (
                      <QuestionRenderer
                        question={q}
                        number={0}
                        lineStyle={lineStyle}
                        language={language}
                        showMcqBox={settings.mcqOptionBox === true}
                        ansHeight={sp.ansHeight != null ? sp.ansHeight : metrics.ansHeight}
                        subject={settings.subject}
                      />
                    )}
                  </div>
                ) : (
                  <QuestionRenderer
                    question={q}
                    number={questionNumber}
                    lineStyle={lineStyle}
                    language={language}
                    showMcqBox={settings.mcqOptionBox === true}
                    ansHeight={sp.ansHeight != null ? sp.ansHeight : metrics.ansHeight}
                    subject={settings.subject}
                  />
                )}
              </div>
            );
          });
        })()}
      </div>

      {settings.answerKey && (
        <AnswerKey questions={questions} language={language} />
      )}

      {questions.length === 0 && (
        <div
          style={{
            textAlign: "center",
            color: "#999",
            marginTop: "60pt",
            fontFamily: "sans-serif",
            fontSize: "11pt",
          }}
        >
          Your questions will appear here as you add them.
        </div>
      )}

      {/* Free-tier footer CTA — removed once the user buys any pack/plan. */}
      {watermark && questions.length > 0 && (
        <div
          style={{
            marginTop: "24pt",
            paddingTop: "8pt",
            borderTop: "1px dashed #bbb",
            textAlign: "center",
            fontFamily: "sans-serif",
            fontSize: "9pt",
            color: "#9ca3af",
          }}
        >
          Made with <b>{SITE_NAME}</b> — buy any credit pack to remove this
          watermark · {SITE_HOST}
        </div>
      )}
    </div>
  );
}

/* ===== Answer key ===== */

// Printed only when settings.answerKey is on, and always on a fresh sheet — the
// question paper is what gets handed out, and a key sharing a page with the
// last question is how a class ends up holding both.
function AnswerKey({
  questions,
  language,
}: {
  questions: Question[];
  language: PaperLanguage;
}) {
  const rows: { label: string; answer: string }[] = [];
  let questionNumber = 0;
  questions.forEach((q) => {
    if (isStructuralQuestion(q)) return;
    questionNumber += 1;
    if (q.answerNote?.trim()) {
      rows.push({ label: localizeNumber(questionNumber, language), answer: q.answerNote.trim() });
    }
    (q.items || []).forEach((item, ii) => {
      if (!item.answer?.trim()) return;
      rows.push({
        label: `${localizeNumber(questionNumber, language)}${String.fromCharCode(97 + ii)}`,
        answer: item.answer.trim(),
      });
    });
  });

  if (!rows.length) return null;

  return (
    // Both mechanisms on purpose: html2pdf runs pagebreak mode ["css","legacy"],
    // where "css" reads page-break-before and "legacy" looks for this class. The
    // key starting on its own sheet is the whole safety promise, so it does not
    // rest on one of them.
    <div
      className="html2pdf__page-break"
      style={{ breakBefore: "page", pageBreakBefore: "always", paddingTop: "6pt" }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: "13pt",
          textAlign: "center",
          borderBottom: "1.5px solid #000",
          paddingBottom: "4pt",
          marginBottom: "8pt",
        }}
      >
        {copyFor(language).answerKeyTitle}
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{ display: "flex", gap: "8pt", marginBottom: "var(--pp-item-gap)" }}
        >
          <span style={{ fontWeight: 700, minWidth: "26pt" }}>{r.label}.</span>
          <Lines>{r.answer}</Lines>
        </div>
      ))}
    </div>
  );
}

/* ===== Paper Header Styles ===== */

function PaperHeader({
  settings,
  style,
  language,
}: {
  settings: PaperSettings;
  style: HeaderStyle;
  language: PaperLanguage;
}) {
  const copy = copyFor(language);
  const schoolName = settings.schoolName || "School Name";
  const assessmentTitle = settings.assessmentTitle || "Assessment Title";
  // These stand in for fields the teacher has not filled. They must read as
  // obviously blank: "2025-26" and "I" were plausible enough to print on a real
  // exam unnoticed, and the year was wrong besides.
  const academicYear = settings.academicYear || "Year";
  const subject = settings.subject || "Subject";
  const className = settings.className || "Class";
  const totalMarks = settings.totalMarks || 40;
  const section = settings.section || "";
  const timeAllowed = settings.timeAllowed || "";
  // Older saved papers predate headerRows — fall back to the original layout.
  const rows =
    settings.headerRows?.length ? settings.headerRows : DEFAULT_HEADER_ROWS;

  const schoolSubtitle = settings.schoolSubtitle;
  const logoUrl = settings.logoUrl;

  const titleBlock = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14pt" }}>
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          style={{ width: "40pt", height: "40pt", objectFit: "contain" }}
        />
      )}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "16pt", fontWeight: 700, letterSpacing: "0.5pt" }}>
          {schoolName}
        </div>
        {schoolSubtitle && (
          <div style={{ fontSize: "9.5pt", color: "#333", marginTop: "1pt", fontWeight: 500 }}>
            {schoolSubtitle}
          </div>
        )}
        <div style={{ fontSize: "13pt", fontWeight: 700, marginTop: "2pt" }}>
          {assessmentTitle}
        </div>
        <div style={{ fontSize: "12pt", marginTop: "2pt" }}>
          {academicYear}
        </div>
      </div>
    </div>
  );

  // Width of the write-in rule per field. Names need room; a roll number does not.
  const RULE_WIDTH: Partial<Record<HeaderField, string>> = {
    name: "200pt",
    rollNo: "60pt",
    date: "80pt",
  };

  function renderField(field: HeaderField, key: number) {
    if (field === "blank") return <span key={key} />;

    if (HEADER_WRITE_IN.includes(field)) {
      const label =
        field === "name" ? copy.name : field === "rollNo" ? copy.rollNo : copy.date;
      return (
        <span key={key}>
          <b>{label}</b>{" "}
          <span
            style={{
              display: "inline-block",
              borderBottom: "1.5px solid #000",
              width: RULE_WIDTH[field] ?? "80pt",
            }}
          >
            &nbsp;
          </span>
        </span>
      );
    }

    // Value fields — the teacher already filled these in Settings.
    switch (field) {
      case "marks":
        return <span key={key}><b>{copy.marks}: {localizeNumber(totalMarks, language)}</b></span>;
      case "subject":
        return <span key={key}><b>{copy.subject} {subject}</b></span>;
      case "className":
        return <span key={key}><b>{copy.classLabel} {className}</b></span>;
      case "section":
        return <span key={key}><b>{copy.sectionLabel} {section}</b></span>;
      case "time":
        return <span key={key}><b>{copy.timeLabel} {timeAllowed}</b></span>;
      default:
        return <span key={key} />;
    }
  }

  const studentInfoRows = (
    <>
      {rows.map((row, ri) => (
        <div
          key={ri}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "10pt",
            fontSize: "11.5pt",
            marginTop: ri === 0 ? "10pt" : "6pt",
          }}
        >
          {row.map((f, ci) => renderField(f, ci))}
        </div>
      ))}
    </>
  );

  switch (style) {
    case "boxed":
      return (
        <div>
          <div
            style={{
              border: "2px solid #000",
              padding: "12pt 16pt 10pt",
            }}
          >
            <div style={{ textAlign: "center" }}>{titleBlock}</div>
            {studentInfoRows}
          </div>
        </div>
      );

    case "double-border":
      return (
        <div>
          <div
            style={{
              border: "3px double #000",
              padding: "14pt 18pt 12pt",
            }}
          >
            <div style={{ textAlign: "center" }}>{titleBlock}</div>
            {studentInfoRows}
          </div>
        </div>
      );

    case "formal":
      return (
        <div>
          <div style={{ borderTop: "3px solid #000", borderBottom: "1px solid #000", padding: "10pt 12pt 8pt" }}>
            <div style={{ textAlign: "center" }}>{titleBlock}</div>
            {studentInfoRows}
          </div>
          <div style={{ borderTop: "1px solid #000", borderBottom: "3px solid #000", height: "4pt" }} />
        </div>
      );

    case "rounded":
      return (
        <div>
          <div
            style={{
              border: "2px solid #000",
              borderRadius: "12pt",
              padding: "14pt 18pt 10pt",
            }}
          >
            <div style={{ textAlign: "center" }}>{titleBlock}</div>
            {studentInfoRows}
          </div>
        </div>
      );

    case "banner":
      return (
        <div>
          <div
            style={{
              border: "1.5px solid #000",
            }}
          >
            <div
              style={{
                background: "#000",
                color: "#fff",
                padding: "10pt 18pt 8pt",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "16pt", fontWeight: 700, letterSpacing: "0.5pt", color: "#fff" }}>
                {schoolName}
              </div>
            </div>
            <div
              style={{
                padding: "6pt 16pt 8pt",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "13pt", fontWeight: 700 }}>{assessmentTitle}</div>
              <div style={{ fontSize: "12pt", marginTop: "2pt" }}>{academicYear}</div>
            </div>
            <div style={{ padding: "0 16pt 10pt" }}>{studentInfoRows}</div>
          </div>
        </div>
      );

    case "clean":
    default:
      return (
        <div>
          <div style={{ textAlign: "center" }}>{titleBlock}</div>
          {studentInfoRows}
        </div>
      );
  }
}

function sanitizeImageSrc(src: string): string {
  if (!src || !src.startsWith("data:image/svg+xml")) return src;
  try {
    let svgText = "";
    if (src.startsWith("data:image/svg+xml;base64,")) {
      svgText = atob(src.replace("data:image/svg+xml;base64,", ""));
    } else if (src.startsWith("data:image/svg+xml;utf8,")) {
      svgText = decodeURIComponent(src.replace("data:image/svg+xml;utf8,", ""));
    }
    if (svgText && (svgText.includes('width="100%"') || !svgText.includes("width="))) {
      const viewBoxMatch = svgText.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/);
      if (viewBoxMatch) {
        const vbWidth = viewBoxMatch[3];
        const vbHeight = viewBoxMatch[4];
        let fixedSvg = svgText;
        if (fixedSvg.includes('width="100%"')) {
          fixedSvg = fixedSvg.replace(/width=["']100%["']/, `width="${vbWidth}"`);
        } else if (!fixedSvg.includes("width=")) {
          fixedSvg = fixedSvg.replace("<svg", `<svg width="${vbWidth}"`);
        }
        if (fixedSvg.includes('height="100%"')) {
          fixedSvg = fixedSvg.replace(/height=["']100%["']/, `height="${vbHeight}"`);
        } else if (!fixedSvg.includes("height=")) {
          fixedSvg = fixedSvg.replace("<svg", `<svg height="${vbHeight}"`);
        }
        return "data:image/svg+xml;base64," + btoa(fixedSvg);
      }
    }
  } catch {
    // Return original on any decoding / parsing issue
  }
  return src;
}

/* ===== Question Renderer ===== */

function QuestionRenderer({
  question: q,
  number,
  lineStyle,
  language,
  showMcqBox,
  ansHeight,
  subject,
}: {
  question: Question;
  number: number;
  lineStyle: LineStyle;
  language: PaperLanguage;
  showMcqBox: boolean;
  ansHeight?: number;
  subject?: string;
}) {
  const qImages = q.images || [];
  const imgCols = q.imageColumns || 2;
  const showImageNumbers = q.imageNumbers ?? qImages.length > 1;
  const showImageCaptionLine = q.imageCaptionLine === true;
  // Never reserve more columns than there are pictures. With the default of 2
  // per row, a single image landed in the left column and "centre" then centred
  // it inside that half — visibly left of the page centre, which is not what the
  // teacher asked for.
  const imgColsUsed = Math.max(1, Math.min(imgCols, qImages.length));
  const imageAlign: CellAlign = q.imageAlign ?? "center";
  const imageMaxHeight = q.imageMaxHeight ?? 240;

  const { title: cleanTitle, hints: inlineHints } = splitTitleAndHints(q.title);
  const effectiveTitle = q.hints ? q.title : cleanTitle;
  const effectiveHints = q.hints || inlineHints;

  const hasExplicitNum = /^(Q\.?|प्र\.?|प्रश्न|Question|किंवा|\([०-९0-9ivxlcdmIVXLCDM]+\)|[०-९0-9ivxlcdmIVXLCDM]+[\.\)]|[०-९0-9]+\s*(?:ला|वा|वी|वे|थी|th|st|nd|rd))/i.test(effectiveTitle.trim());

  const isMarathi = language === "marathi" || subject?.toLowerCase() === "marathi";
  const marksBadge = isMarathi
    ? `(${localizeNumber(q.marks, language)}\u00A0गुण)`
    : language === "hindi"
    ? `(${localizeNumber(q.marks, language)}\u00A0अंक)`
    : `(${localizeNumber(q.marks, language)}M)`;

  return (
    <>
      <div className="question-title">
        <span style={{ flex: 1, minWidth: 0 }}>
          {hasExplicitNum ? effectiveTitle : `Q.${localizeNumber(number, language)}) ${effectiveTitle}`}
        </span>
        <span style={{ whiteSpace: "nowrap", flexShrink: 0, marginLeft: "auto", paddingLeft: "8pt" }}>
          {marksBadge}
        </span>
      </div>

      {effectiveHints && (
        <div
          className="question-hints"
          style={{
            fontWeight: 400,
            fontSize: "0.92em",
            marginTop: "1.5pt",
            marginBottom: "var(--pp-title-gap, 4pt)",
            marginLeft: "14pt",
            marginRight: "14pt",
            lineHeight: 1.35,
          }}
        >
          {effectiveHints}
        </div>
      )}

      {/* Question-level images grid */}
      {/* Numbering placed on the left side of diagrams */}
      {qImages.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${imgColsUsed}, 1fr)`,
            gap: "10pt",
            marginLeft: imageAlign === "center" ? 0 : "14pt",
            marginTop: "6pt",
            marginBottom: "var(--pp-item-gap)",
          }}
        >
          {qImages.map((img, i) => (
            <div
              key={i}
              className="pp-row"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8pt",
                width: "100%",
                marginBottom: "4pt",
              }}
            >
              {showImageNumbers && (
                <span
                  style={{
                    fontSize: "11.5pt",
                    fontWeight: 700,
                    minWidth: "18pt",
                    paddingTop: "2pt",
                    flexShrink: 0,
                  }}
                >
                  {localizeNumber(i + 1, language)})
                </span>
              )}
              <div style={{ flex: 1, textAlign: imageAlign }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sanitizeImageSrc(img)}
                  alt={`Q${number} image ${i + 1}`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: `${imageMaxHeight}pt`,
                    objectFit: "contain",
                    display: "block",
                    marginTop: "2pt",
                    marginBottom: "2pt",
                    marginLeft: imageAlign === "left" ? 0 : "auto",
                    marginRight: imageAlign === "right" ? 0 : "auto",
                  }}
                />
                {showImageCaptionLine && (
                  <div
                    style={{
                      borderBottom: "1.5px solid #000",
                      width: "80%",
                      margin: "0 auto",
                      minHeight: "16pt",
                    }}
                  >
                    &nbsp;
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {q.type === "fill-blanks" && (
        <FillBlanks
          items={q.items}
          columns={q.columnsPerRow || 1}
          blankLineStyle={q.blankLineStyle || "inline"}
          blankLines={q.blankLines || 1}
          language={language}
          ansHeight={ansHeight}
          hideItemNumbering={q.hideItemNumbering}
        />
      )}
      {q.type === "short-answer" && (
        <ShortAnswer
          items={q.items}
          lineStyle={lineStyle}
          language={language}
          ansHeight={ansHeight}
          subject={subject}
          columns={q.columnsPerRow || 1}
          inline={
            q.answerLinePlacement === "inline" ||
            (q.answerLinePlacement !== "below" && (
              (q.columnsPerRow && q.columnsPerRow > 1) ||
              (q.items?.length > 0 && q.items.every((it) => (it.content || "").length <= 35))
            ))
          }
        />
      )}
      {q.type === "long-answer" && <LongAnswer items={q.items} lineStyle={lineStyle} language={language} ansHeight={ansHeight} subject={subject} />}
      {q.type === "mcq" && <MCQ items={q.items} columns={q.columnsPerRow || 2} language={language} showBox={showMcqBox} />}
      {q.type === "match" && (
        <MatchFollowing
          left={q.matchLeft || []}
          right={q.matchRight || []}
          leftHeader={q.matchLeftHeader}
          rightHeader={q.matchRightHeader}
          leftLabel={q.matchLeftLabel ?? "numbers"}
          rightLabel={q.matchRightLabel ?? "none"}
          divider={q.matchDivider ?? false}
          language={language}
        />
      )}
      {q.type === "true-false" && (
        <TrueFalse
          items={q.items}
          columns={q.columnsPerRow || 1}
          answerPosition={q.tfAnswerPosition ?? "inline"}
          blankWidth={q.tfBlankWidth ?? 70}
          format={q.tfFormat ?? "bracket"}
          language={language}
        />
      )}
      {q.type === "math-vertical" && (
        <MathVertical
          items={q.items}
          operation={q.operation || "+"}
          columnsPerRow={q.columnsPerRow || (q.operation === "÷" ? 2 : 4)}
          autoFit={q.operation === "÷" ? false : (q.mathAutoFit !== false)}
          gap={q.mathGap ?? (q.operation === "÷" ? 16 : 12)}
          problemWidth={q.mathProblemWidth ?? (q.operation === "÷" ? 120 : 90)}
          answerSpace={q.mathAnswerSpace ?? (q.operation === "÷" ? 45 : 0)}
          border={q.mathBorder ?? false}
          digitSpacing={q.mathDigitSpacing ?? 3}
          indexGap={q.mathIndexGap}
          language={language}
          quotientRemainder={q.mathQuotientRemainder}
          questionTitle={q.title}
        />
      )}
      {q.type === "comprehension" && (
        <Comprehension
          passage={q.passage || ""}
          passageTitle={q.passageTitle}
          passageColumns={q.passageColumns}
          passageBorder={q.passageBorder}
          items={q.items}
          lineStyle={lineStyle}
          language={language}
          ansHeight={ansHeight}
          subject={subject}
        />
      )}
      {q.type === "word-problem" && (
        <WordProblem
          items={q.items}
          showBox={q.wpOperationBox !== false}
          boxPosition={q.wpBoxPosition || "right"}
          boxWidth={q.wpBoxWidth ?? 150}
          boxHeight={q.wpBoxHeight ?? 70}
          boxLabel={q.wpBoxLabel !== false}
          boxGrid={q.wpBoxGrid === true}
          boxRows={q.wpBoxRows ?? 4}
          boxCols={q.wpBoxCols ?? 5}
          boxShowNumbers={q.wpBoxShowNumbers}
          boxOperation={q.wpBoxOperation}
          lineStyle={lineStyle}
          language={language}
          ansHeight={ansHeight}
          subject={subject}
        />
      )}
      {q.type === "custom" && <CustomQuestion blocks={q.customBlocks || []} lineStyle={lineStyle} ansHeight={ansHeight} />}
      {q.type === "composition" && (
        <Composition
          sentences={q.compositionSentences || []}
          numbered={q.compositionNumbered ?? true}
          writingLines={q.writingLines ?? 0}
          lineStyle={lineStyle}
          language={language}
          ansHeight={ansHeight}
        />
      )}
      {q.type === "picture-composition" && (
        <PictureComposition writingLines={q.writingLines || 6} lineStyle={lineStyle} ansHeight={ansHeight} />
      )}
      {q.type === "handwriting" && (
        <Handwriting items={q.items} lineStyle={lineStyle} ansHeight={ansHeight} />
      )}
      {q.type === "dictation" && (
        <Dictation count={q.writingLines || 8} columns={q.columnsPerRow || 1} lineStyle={lineStyle} language={language} ansHeight={ansHeight} />
      )}
      {q.type === "draw" && (
        <DrawBox
          items={q.items}
          boxHeight={q.boxHeight || 120}
          columns={q.columnsPerRow || 1}
          writingLines={q.writingLines}
          linesPosition={q.drawLinesPosition ?? (q.drawOrder === "lines-first" ? "above" : "below")}
          lineStyle={lineStyle}
          language={language}
          ansHeight={ansHeight}
        />
      )}
      {q.type === "label-image" && (
        <LabelImage items={q.items} columns={q.columnsPerRow || 2} language={language} ansHeight={ansHeight} />
      )}
      {q.type === "assertion-reason" && (
        <AssertionReason items={q.items} options={q.arOptions ?? AR_DEFAULT_OPTIONS} language={language} subject={subject} />
      )}
      {q.type === "case-study" && (
        <CaseStudy
          passage={q.passage || ""}
          sourceLabel={q.caseSourceLabel || ""}
          items={q.items}
          roman={q.caseRomanNumerals !== false}
          lineStyle={lineStyle}
          language={language}
          ansHeight={ansHeight}
        />
      )}
      {q.type === "diagram-label" && (
        <DiagramLegend items={q.items} columns={q.columnsPerRow || 2} language={language} />
      )}
      {q.type === "odd-one-out" && (
        <OddOneOut items={q.items} columns={q.columnsPerRow || 1} language={language} />
      )}
      {q.type === "rearrange" && (
        <Rearrange items={q.items} lineStyle={lineStyle} language={language} ansHeight={ansHeight} />
      )}
      {q.type === "word-search" && (
        <WordSearch grid={q.puzzleGrid || []} items={q.items} columns={q.columnsPerRow || 3} language={language} />
      )}
      {q.type === "table" && (
        <TableQuestion
          rows={q.tableRows || []}
          caption={q.tableCaption || ""}
          headerRow={q.tableHeaderRow !== false}
          headerCol={q.tableHeaderCol === true}
          cellMinHeight={q.tableCellMinHeight ?? 22}
          hideBorders={q.tableHideBorders}
          blankLine={q.tableBlankLine}
          align={q.tableAlign ?? []}
          alignDefault={q.tableAlignDefault ?? "center"}
          colWidths={q.tableColWidths}
          items={q.items}
          lineStyle={lineStyle}
          language={language}
          ansHeight={ansHeight}
          subject={subject}
        />
      )}
    </>
  );
}

/* ===== Reasoning / source-based types ===== */

// Assertion & Reason. Each item is a pair; the four choices are printed once
// under the pair, which is how CBSE prints them.
function AssertionReason({
  items,
  options,
  language,
  subject,
}: {
  items: Question["items"];
  options: string[];
  language: PaperLanguage;
  subject?: string;
}) {
  const ansPrefix = answerPrefixFor(language, subject);
  return (
    <div style={{ marginLeft: "14pt" }}>
      {items.map((item, i) => (
        <div key={item.id} className="pp-row" style={{ marginBottom: "var(--pp-q-gap)", breakInside: "avoid", pageBreakInside: "avoid" }}>
          <div style={{ marginBottom: "2pt" }}>
            {localizeNumber(i + 1, language)}) <b>Assertion (A):</b> <Lines>{item.content}</Lines>
          </div>
          <div style={{ marginLeft: "14pt", marginBottom: "3pt" }}>
            <b>Reason (R):</b> {item.secondary || ""}
          </div>
          <div style={{ marginLeft: "14pt" }}>
            {options.map((o, oi) => (
              <div key={oi} style={{ marginBottom: "1pt" }}>
                ({String.fromCharCode(97 + oi)}) {o}
              </div>
            ))}
          </div>
          <div
            style={{
              marginLeft: "14pt",
              marginTop: "3pt",
              display: "flex",
              alignItems: "baseline",
              gap: "6pt",
            }}
          >
            <span>{ansPrefix}.</span>
            <span
              style={{
                display: "inline-block",
                borderBottom: "1px solid #000",
                width: "60pt",
              }}
            >
              &nbsp;
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function stripLeadingItemNumber(text?: string): string {
  if (!text) return "";
  return text.replace(/^(\([०-९0-9a-zA-Z\u0900-\u097FivxlcdmIVXLCDM]+\)|[०-९0-9a-zA-Z\u0900-\u097FivxlcdmIVXLCDM]+[\.\)])\s*/, "").trim();
}

const SUBITEM_MARKS_REGEX =
  /\s*([(\[](?:[०-९0-9]+(?:\.[०-९0-9]+)?\s*(?:गुण|गु\.|Marks?|marks?|M|m)?|[०-९0-9]+\s*(?:गुण|गु\.|Marks?|marks?|M|m))[)\]])\s*$/;

function parseSubItemContent(
  item: { content?: string; marks?: number | string },
  language: PaperLanguage,
  subject?: string
) {
  const raw = item.content || "";
  const firstNewline = raw.indexOf("\n");
  const rawFirstLine = firstNewline === -1 ? raw : raw.slice(0, firstNewline);
  const rest = firstNewline === -1 ? "" : raw.slice(firstNewline + 1);

  const cleanFirstLine = stripLeadingItemNumber(rawFirstLine);
  const match = cleanFirstLine.match(SUBITEM_MARKS_REGEX);

  let titleLine = cleanFirstLine;
  let marks: string | null = null;
  const isMarathi = language === "marathi" || subject?.toLowerCase() === "marathi";

  if (item.marks != null && item.marks !== "") {
    const marksNum = typeof item.marks === "number" ? item.marks : parseFloat(String(item.marks));
    const formattedNum = !isNaN(marksNum) ? localizeNumber(marksNum, language) : String(item.marks);
    const unit = isMarathi ? "गुण" : language === "hindi" ? "अंक" : "M";
    marks = `(${formattedNum}\u00A0${unit})`.replace(/\s+M\)/, "M)");
    if (match) {
      titleLine = cleanFirstLine.slice(0, match.index).trim();
    }
  } else if (match) {
    marks = match[1];
    if (isMarathi) {
      marks = marks.replace(/[Mm](?:arks?)?/, "गुण");
    }
    marks = marks.replace(/\s+/g, "\u00A0");
    titleLine = cleanFirstLine.slice(0, match.index).trim();
  }

  return { titleLine, marks, rest };
}

// Case study / source-based: a boxed source, then sub-questions numbered in
// roman numerals so they read as parts of one question rather than new ones.
function CaseStudy({
  passage,
  sourceLabel,
  items,
  roman,
  lineStyle,
  language,
  ansHeight,
  subject,
}: {
  passage: string;
  sourceLabel: string;
  items: Question["items"];
  roman: boolean;
  lineStyle: LineStyle;
  language: PaperLanguage;
  ansHeight?: number;
  subject?: string;
}) {
  return (
    <div style={{ marginLeft: "14pt" }}>
      {sourceLabel && (
        <div style={{ fontWeight: 700, marginBottom: "3pt" }}>{sourceLabel}</div>
      )}
      {passage && (
        <div
          style={{
            border: "1px solid #000",
            padding: "6pt 8pt",
            marginBottom: "6pt",
            textAlign: "justify",
            lineHeight: "1.6",
          }}
        >
          {passage
            .split(/\r?\n\s*\r?\n+/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((para, pIdx, arr) => (
              <p
                key={pIdx}
                style={{
                  margin: 0,
                  marginBottom: pIdx === arr.length - 1 ? 0 : "6pt",
                  textIndent: "20pt",
                  whiteSpace: "pre-line",
                }}
              >
                {para}
              </p>
            ))}
        </div>
      )}
      {items.map((item, i) => {
        const { titleLine, marks, rest } = parseSubItemContent(item, language, subject);
        return (
          <div key={item.id} className="pp-row" style={{ marginBottom: "var(--pp-item-gap)", breakInside: "avoid", pageBreakInside: "avoid" }}>
            <div
              style={{
                display: marks ? "flex" : "block",
                justifyContent: marks ? "space-between" : undefined,
                alignItems: "baseline",
                gap: "8pt",
              }}
            >
              <div>
                ({roman ? romanNumeral(i + 1) : localizeNumber(i + 1, language)}) <Lines>{titleLine}</Lines>
              </div>
              {marks && (
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "0.95em",
                    whiteSpace: "nowrap",
                    marginLeft: "auto",
                    flexShrink: 0,
                    paddingLeft: "6pt",
                  }}
                >
                  {marks}
                </span>
              )}
            </div>
            {rest ? (
              <div style={{ marginLeft: "14pt", marginTop: "2pt" }}>
                <Lines>{rest}</Lines>
              </div>
            ) : null}
            <WritingRows count={item.lines || 1} lineStyle={lineStyle} ansHeight={ansHeight} />
          </div>
        );
      })}
    </div>
  );
}

// Diagram with a numbered legend. The picture itself comes from the shared
// image block above; this prints the numbered blanks the student fills in.
function DiagramLegend({
  items,
  columns,
  language,
}: {
  items: Question["items"];
  columns: number;
  language: PaperLanguage;
}) {
  return (
    <div
      style={{
        marginLeft: "14pt",
        marginTop: "4pt",
        display: columns > 1 ? "grid" : "block",
        gridTemplateColumns: columns > 1 ? `repeat(${columns}, 1fr)` : undefined,
        columnGap: "24pt",
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.id}
          className="pp-row"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "6pt",
            marginBottom: "var(--pp-item-gap)",
            breakInside: "avoid",
            pageBreakInside: "avoid",
          }}
        >
          <span style={{ flexShrink: 0 }}>{localizeNumber(i + 1, language)}.</span>
          {item.content ? (
            <span><Lines>{item.content}</Lines></span>
          ) : (
            <span style={{ flex: 1, borderBottom: "1px solid #000" }}>&nbsp;</span>
          )}
        </div>
      ))}
    </div>
  );
}

// Odd one out: the group prints on one line, the student circles the stray.
function OddOneOut({
  items,
  columns,
  language,
}: {
  items: Question["items"];
  columns: number;
  language: PaperLanguage;
}) {
  return (
    <div
      style={{
        marginLeft: "14pt",
        display: columns > 1 ? "grid" : "block",
        gridTemplateColumns: columns > 1 ? `repeat(${columns}, 1fr)` : undefined,
        columnGap: "20pt",
      }}
    >
      {items.map((item, i) => (
        <div key={item.id} className="pp-row" style={{ marginBottom: "var(--pp-item-gap)", breakInside: "avoid", pageBreakInside: "avoid" }}>
          {localizeNumber(i + 1, language)}){" "}
          {(item.options ?? []).map((o, oi) => (
            <span key={oi}>
              {oi > 0 && <span style={{ padding: "0 4pt" }}>,</span>}
              {o}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

// Rearrange: the jumbled words, then a rule to write the sentence on.
function Rearrange({
  items,
  lineStyle,
  language,
  ansHeight,
}: {
  items: Question["items"];
  lineStyle: LineStyle;
  language: PaperLanguage;
  ansHeight?: number;
}) {
  return (
    <div style={{ marginLeft: "14pt" }}>
      {items.map((item, i) => (
        <div key={item.id} className="pp-row" style={{ marginBottom: "var(--pp-item-gap)", breakInside: "avoid", pageBreakInside: "avoid" }}>
          <div>
            {localizeNumber(i + 1, language)}) <Lines>{item.content}</Lines>
          </div>
          <WritingRows count={item.lines || 1} lineStyle={lineStyle} ansHeight={ansHeight} />
        </div>
      ))}
    </div>
  );
}

// Word search: the stored letter grid plus the list of words to find.
function WordSearch({
  grid,
  items,
  columns,
  language,
}: {
  grid: string[][];
  items: Question["items"];
  columns: number;
  language: PaperLanguage;
}) {
  return (
    <div style={{ marginLeft: "14pt", marginTop: "4pt" }}>
      {grid.length > 0 && (
        <table
          style={{
            borderCollapse: "collapse",
            fontFamily: '"Courier New", monospace',
            marginBottom: "8pt",
          }}
        >
          <tbody>
            {grid.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      border: "0.5px solid #999",
                      width: "18pt",
                      height: "18pt",
                      textAlign: "center",
                      verticalAlign: "middle",
                      fontSize: "11pt",
                      letterSpacing: "0",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {items.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(1, columns)}, 1fr)`,
            columnGap: "16pt",
          }}
        >
          {items.map((item, i) => (
            <div key={item.id} style={{ marginBottom: "2pt" }}>
              {localizeNumber(i + 1, language)}. <Lines>{item.content}</Lines>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== Writing-line helpers ===== */

// One four-line English handwriting band (red / blue / blue / red),
// the standard ruling used for class 1, 2, etc. handwriting practice.
function FourLineBand() {
  const red = "#e11d48";
  const blue = "#3b82f6";
  const lines = [
    { top: 0, color: red },
    { top: 9, color: blue },
    { top: 18, color: blue },
    { top: 27, color: red },
  ];
  return (
    <div style={{ position: "relative", height: "27pt", marginBottom: "9pt" }}>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${l.top}pt`,
            borderTop: `1px solid ${l.color}`,
          }}
        />
      ))}
    </div>
  );
}

// Renders `count` writing rows in the chosen ruling style.
function WritingRows({
  count,
  lineStyle,
  ansHeight,
}: {
  count: number;
  lineStyle: LineStyle;
  ansHeight?: number;
}) {
  const lineH = ansHeight != null ? `${ansHeight}pt` : "var(--pp-ans-h)";
  return (
    <div className="pp-answer-space">
      {Array.from({ length: Math.max(count, 1) }).map((_, i) =>
        lineStyle === "four-line" ? (
          <FourLineBand key={i} />
        ) : (
          <div
            key={i}
            style={{
              borderBottom: "1px solid #000",
              minHeight: lineH,
              height: lineH,
            }}
          >
            &nbsp;
          </div>
        )
      )}
    </div>
  );
}

/* ===== Question Type Renderers ===== */

function FillBlanks({
  items,
  columns,
  blankLineStyle,
  blankLines,
  language,
  ansHeight,
  hideItemNumbering,
}: {
  items: Question["items"];
  columns: number;
  blankLineStyle: BlankLineStyle;
  blankLines: number;
  language: PaperLanguage;
  ansHeight?: number;
  hideItemNumbering?: boolean;
}) {
  const labels = "abcdefghijklmnopqrstuvwxyz";
  const ruled = blankLineStyle !== "inline";
  return (
    <div
      style={{
        marginLeft: hideItemNumbering ? "10pt" : "14pt",
        display: columns > 1 ? "grid" : "block",
        gridTemplateColumns: columns > 1 ? `repeat(${columns}, 1fr)` : undefined,
        columnGap: "16pt",
      }}
    >
      {items.map((item, i) => (
        <div key={item.id} className="pp-row" style={{ marginBottom: "var(--pp-item-gap)", lineHeight: "1.8" }}>
          {!hideItemNumbering && `${labels[i]}) `}<Lines>{renderBlankText(item.content)}</Lines>
          {item.image && <SubItemImage src={item.image} width={item.imageWidth} />}
          {ruled && (
            <div style={{ marginTop: "2pt" }}>
              <WritingRows count={blankLines} lineStyle={blankLineStyle as LineStyle} ansHeight={ansHeight} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ShortAnswer({
  items,
  lineStyle,
  language,
  ansHeight,
  subject,
  columns = 1,
  inline = false,
}: {
  items: Question["items"];
  lineStyle: LineStyle;
  language: PaperLanguage;
  ansHeight?: number;
  subject?: string;
  columns?: number;
  inline?: boolean;
}) {
  const ansPrefix = answerPrefixFor(language, subject);
  const lineH = ansHeight != null ? `${ansHeight}pt` : "var(--pp-ans-h)";
  const cols = Math.max(1, columns);
  return (
    <div
      style={{
        marginLeft: "10pt",
        display: cols > 1 ? "grid" : "block",
        gridTemplateColumns: cols > 1 ? `repeat(${cols}, minmax(0, 1fr))` : undefined,
        columnGap: "20pt",
        rowGap: "var(--pp-item-gap)",
        minWidth: 0,
      }}
    >
      {items.map((item, i) => {
        const lines = item.lines ?? 1;
        const cleanContent = stripLeadingItemNumber(item.content);
        const hasEmbeddedBlanks = /_{2,}/.test(cleanContent);
        const contentForInline = cleanContent.replace(/\s*_{2,}\s*$/, "");
        const hasInternalBlanks = /_{2,}/.test(contentForInline);

        // Division with Quotient and Remainder
        const divMatch = cleanContent.match(/(\d+)\s*(?:÷|\/)\s*(\d+)/);
        const hasQR = /q\s*=\s*.*r\s*=/i.test(cleanContent);
        if (divMatch && hasQR) {
          const dividend = divMatch[1];
          const divisor = divMatch[2];
          return (
            <div
              key={item.id}
              className="pp-row"
              style={{
                marginBottom: cols > 1 ? "0" : "var(--pp-item-gap)",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                minWidth: 0,
                paddingTop: "16pt",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "6pt" }}>
                <span style={{ fontWeight: "bold", fontSize: "1.05em" }}>
                  {localizeNumber(i + 1, language)})
                </span>
                <div style={{ display: "inline-flex", alignItems: "flex-start", marginTop: "1pt" }}>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "1.15em",
                      paddingRight: "5pt",
                      letterSpacing: "2pt",
                      lineHeight: 1.2,
                    }}
                  >
                    {divisor}
                  </span>
                  <div
                    style={{
                      borderLeft: "1.5pt solid #000",
                      borderTop: "1.5pt solid #000",
                      borderTopLeftRadius: "3pt",
                      paddingLeft: "6pt",
                      paddingRight: "10pt",
                      paddingTop: "2pt",
                      paddingBottom: "2pt",
                      minWidth: "32pt",
                      fontWeight: 600,
                      fontSize: "1.15em",
                      letterSpacing: "2pt",
                      lineHeight: 1.2,
                    }}
                  >
                    {dividend}
                  </div>
                </div>
              </div>

              <div style={{ height: "45pt", width: "100%" }} />

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "14pt",
                  marginTop: "2pt",
                  fontSize: "1em",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: "3pt" }}>
                  <span>Q =</span>
                  <span
                    style={{
                      display: "inline-block",
                      borderBottom: "1.2pt solid #000",
                      width: "45pt",
                      height: "1em",
                    }}
                  >
                    &nbsp;
                  </span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: "3pt" }}>
                  <span>R =</span>
                  <span
                    style={{
                      display: "inline-block",
                      borderBottom: "1.2pt solid #000",
                      width: "45pt",
                      height: "1em",
                    }}
                  >
                    &nbsp;
                  </span>
                </span>
              </div>
            </div>
          );
        }

        if (inline && lines > 0 && lineStyle !== "four-line" && !item.image) {
          return (
            <div
              key={item.id}
              className="pp-row"
              style={{
                marginBottom: cols > 1 ? "0" : "var(--pp-item-gap)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                minWidth: 0,
                wordBreak: "break-word",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "6pt", width: "100%", minWidth: 0 }}>
                <span style={{ flexShrink: 0 }}>
                  {localizeNumber(i + 1, language)}) <Lines>{contentForInline}</Lines>
                </span>
                {!hasInternalBlanks && (
                  <span
                    style={{
                      flex: 1,
                      minWidth: "40pt",
                      borderBottom: "1px solid #000",
                      minHeight: lineH,
                      height: lineH,
                    }}
                  >
                    &nbsp;
                  </span>
                )}
              </div>
              {lines > 1 &&
                Array.from({ length: lines - 1 }).map((_, li) => (
                  <div
                    key={li}
                    style={{
                      borderBottom: "1px solid #000",
                      minHeight: lineH,
                      height: lineH,
                      marginLeft: "26pt",
                    }}
                  >
                    &nbsp;
                  </div>
                ))}
            </div>
          );
        }

        if (item.image && cols > 1) {
          return (
            <div
              key={item.id}
              className="pp-row"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                marginBottom: "var(--pp-item-gap)",
                minWidth: 0,
                wordBreak: "break-word",
              }}
            >
              {contentForInline ? (
                <div style={{ marginBottom: "3pt", width: "100%", fontSize: "0.95em", minWidth: 0 }}>
                  <span>{localizeNumber(i + 1, language)}) <Lines>{contentForInline}</Lines></span>
                </div>
              ) : null}
              <div style={{ marginTop: "2pt" }}>
                <SubItemImage src={item.image} width={item.imageWidth || 80} marginLeft="0" />
              </div>
              <div style={{ marginTop: "4pt", width: "100%", display: "flex", justifyContent: "center", alignItems: "baseline", gap: "4pt" }}>
                {!contentForInline && <span style={{ fontWeight: 600 }}>{localizeNumber(i + 1, language)})</span>}
                <span
                  style={{
                    display: "inline-block",
                    borderBottom: "1.2pt solid #000",
                    width: contentForInline ? "75%" : "70pt",
                    minWidth: "60pt",
                    maxWidth: "130pt",
                    height: "1em",
                  }}
                >
                  &nbsp;
                </span>
              </div>
            </div>
          );
        }

        const showAnswerSpaceBelow = lines > 0 && (!hasEmbeddedBlanks || (item.lines != null && item.lines > 1));

        return (
          <div
            key={item.id}
            className="pp-row"
            style={{ marginBottom: cols > 1 ? "0" : "var(--pp-item-gap)", minWidth: 0, wordBreak: "break-word" }}
          >
            {cleanContent ? (
              <div style={{ marginBottom: "2pt" }}>
                {localizeNumber(i + 1, language)}) <Lines>{cleanContent}</Lines>
              </div>
            ) : null}
            {item.image && <SubItemImage src={item.image} width={item.imageWidth} />}
            {!cleanContent && item.image && (
              <div style={{ marginTop: "4pt", display: "flex", alignItems: "baseline", gap: "6pt", marginLeft: "16pt" }}>
                <span style={{ fontWeight: 600 }}>{localizeNumber(i + 1, language)})</span>
                <span style={{ borderBottom: "1px solid #000", width: "120pt", height: "1em" }}>&nbsp;</span>
              </div>
            )}
            {showAnswerSpaceBelow && (
              <div className="pp-answer-space">
                {lineStyle === "four-line" ? (
                  <>
                    <div style={{ marginBottom: "2pt" }}>{ansPrefix}&#x27A1;</div>
                    <WritingRows count={lines} lineStyle={lineStyle} ansHeight={ansHeight} />
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "4pt" }}>
                      <span>{ansPrefix}&#x27A1;</span>
                      <span
                        style={{
                          flex: 1,
                          borderBottom: "1px solid #000",
                          minHeight: lineH,
                          height: lineH,
                        }}
                      >
                        &nbsp;
                      </span>
                    </div>
                    {lines > 1 &&
                      Array.from({ length: lines - 1 }).map((_, li) => (
                        <div
                          key={li}
                          style={{
                            borderBottom: "1px solid #000",
                            minHeight: lineH,
                            height: lineH,
                            marginLeft: "26pt",
                          }}
                        >
                          &nbsp;
                        </div>
                      ))}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LongAnswer({
  items,
  lineStyle,
  language,
  ansHeight,
  subject,
}: {
  items: Question["items"];
  lineStyle: LineStyle;
  language: PaperLanguage;
  ansHeight?: number;
  subject?: string;
}) {
  const ansPrefix = answerPrefixFor(language, subject);
  const lineH = ansHeight != null ? `${ansHeight}pt` : "var(--pp-ans-h)";
  return (
    <div style={{ marginLeft: "10pt" }}>
      {items.map((item, i) => {
        const lines = item.lines ?? 3;
        return (
          <div key={item.id} className="pp-row" style={{ marginBottom: "var(--pp-item-gap)" }}>
            <div style={{ marginBottom: "2pt" }}>{localizeNumber(i + 1, language)}) <Lines>{item.content}</Lines></div>
            {lines > 0 && (
              <div className="pp-answer-space">
                {lineStyle === "four-line" ? (
                  <>
                    <div style={{ marginBottom: "2pt" }}>{ansPrefix}&#x27A1;</div>
                    <WritingRows count={lines} lineStyle={lineStyle} ansHeight={ansHeight} />
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "4pt" }}>
                      <span>{ansPrefix}&#x27A1;</span>
                      <span style={{ flex: 1, borderBottom: "1px solid #000", minHeight: lineH, height: lineH }}>&nbsp;</span>
                    </div>
                    {lines > 1 &&
                      Array.from({ length: lines - 1 }).map((_, li) => (
                        <div key={li} style={{ borderBottom: "1px solid #000", minHeight: lineH, height: lineH }}>&nbsp;</div>
                      ))}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MCQ({ items, columns, language, showBox }: { items: Question["items"]; columns: number; language: PaperLanguage; showBox?: boolean }) {
  return (
    <div style={{ marginLeft: "10pt" }}>
      {items.map((item, i) => (
        <div key={item.id} className="pp-row" style={{ marginBottom: "var(--pp-item-gap)" }}>
          <div style={{ marginBottom: "3pt" }}>{localizeNumber(i + 1, language)}) <Lines>{item.content}</Lines></div>
          {item.image && <SubItemImage src={item.image} width={item.imageWidth} />}
          <div className="mcq-options" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {(item.options || []).map((opt, oi) => (
              <div key={oi} style={{ display: "flex", alignItems: "center", gap: "4pt" }}>
                <span>({String.fromCharCode(97 + oi)}) {opt}</span>
                {showBox && <span className="mcq-option-box" />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchFollowing({
  left,
  right,
  leftHeader,
  rightHeader,
  leftLabel,
  rightLabel,
  divider,
  language,
}: {
  left: string[];
  right: string[];
  leftHeader?: string;
  rightHeader?: string;
  leftLabel: MatchLabel;
  rightLabel: MatchLabel;
  divider: boolean;
  language: PaperLanguage;
}) {
  const maxLen = Math.max(left.length, right.length);
  return (
    <div style={{ marginLeft: "14pt" }}>
      <table className="match-table" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <td style={{ fontWeight: 700, paddingBottom: "4pt", width: "45%" }}>{leftHeader || "Column A"}</td>
            <td
              style={{
                fontWeight: 700,
                paddingBottom: "4pt",
                width: "45%",
                borderLeft: divider ? "1px solid #000" : undefined,
                paddingLeft: divider ? "12pt" : undefined,
              }}
            >
              {rightHeader || "Column B"}
            </td>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxLen }).map((_, i) => {
            const hasLeft = Boolean(left[i]?.trim() || left[i]?.startsWith("data:image/"));
            const hasRight = Boolean(right[i]?.trim() || right[i]?.startsWith("data:image/"));
            return (
              <tr key={i} className="pp-row" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                <td style={{ padding: "3pt 8pt", verticalAlign: "middle" }}>
                  {hasLeft && matchLabelFor(leftLabel, i, language)}
                  {left[i]?.startsWith("data:image/") ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={left[i]}
                      alt={`Item ${i + 1}`}
                      style={{ height: "28pt", objectFit: "contain", verticalAlign: "middle", display: "inline-block" }}
                    />
                  ) : (
                    left[i] || ""
                  )}
                </td>
                <td
                  style={{
                    padding: "3pt 8pt",
                    verticalAlign: "middle",
                    borderLeft: divider ? "1px solid #000" : undefined,
                    paddingLeft: divider ? "12pt" : undefined,
                  }}
                >
                  {hasRight && matchLabelFor(rightLabel, i, language)}
                  {right[i]?.startsWith("data:image/") ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={right[i]}
                      alt={`Item ${i + 1}`}
                      style={{ height: "28pt", objectFit: "contain", verticalAlign: "middle", display: "inline-block" }}
                    />
                  ) : (
                    right[i] || ""
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TrueFalse({
  items,
  columns,
  answerPosition,
  blankWidth,
  format = "bracket",
  language,
}: {
  items: Question["items"];
  columns: number;
  answerPosition: "inline" | "right";
  blankWidth: number;
  format?: "bracket" | "box";
  language: PaperLanguage;
}) {
  const marker =
    format === "box" ? (
      <span
        style={{
          display: "inline-block",
          width: "14pt",
          height: "14pt",
          border: "1.2pt solid #000",
          verticalAlign: "middle",
          marginLeft: "6pt",
          flexShrink: 0,
        }}
      />
    ) : (
      <span style={{ whiteSpace: "nowrap" }}>
        ({" "}
        <span
          style={{
            display: "inline-block",
            borderBottom: "1px solid #000",
            width: `${blankWidth}pt`,
          }}
        >
          &nbsp;
        </span>{" "}
        )
      </span>
    );

  return (
    <div
      style={{
        marginLeft: "10pt",
        display: columns > 1 ? "grid" : "block",
        gridTemplateColumns: columns > 1 ? `repeat(${columns}, 1fr)` : undefined,
        columnGap: "16pt",
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.id}
          className="pp-row"
          style={{
            marginBottom: "var(--pp-item-gap)",
            display: "flex",
            justifyContent: answerPosition === "right" ? "space-between" : "flex-start",
            alignItems: format === "box" ? "center" : "baseline",
            gap: "8pt",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6pt" }}>
            <span>
              {localizeNumber(i + 1, language)}) <Lines>{item.content}</Lines>
            </span>
            {answerPosition === "inline" && marker}
          </span>
          {answerPosition === "right" && marker}
        </div>
      ))}
    </div>
  );
}

function MathVertical({
  items,
  operation,
  columnsPerRow,
  autoFit,
  gap,
  problemWidth,
  answerSpace,
  border,
  digitSpacing,
  indexGap = 6,
  language,
  quotientRemainder,
  questionTitle,
}: {
  items: Question["items"];
  operation: string;
  columnsPerRow: number;
  autoFit: boolean;
  gap: number;
  problemWidth: number;
  answerSpace: number;
  border: boolean;
  digitSpacing: number;
  indexGap?: number;
  language: PaperLanguage;
  quotientRemainder?: boolean;
  questionTitle?: string;
}) {
  const isDivision = operation === "÷" || operation === "/";
  // Auto-fit packs problems to their natural width (no wasted stretch); the
  // fixed-column mode keeps the classic N-per-row textbook grid.
  const gridTemplateColumns = autoFit
    ? `repeat(auto-fill, minmax(${problemWidth}pt, max-content))`
    : `repeat(${columnsPerRow}, 1fr)`;

  return (
    <div
      className="math-grid"
      style={{
        gridTemplateColumns,
        gap: `${gap}pt`,
        justifyContent: autoFit ? "start" : "stretch",
        marginLeft: "14pt",
        marginTop: "6pt",
      }}
    >
      {items.map((item, i) => {
        if (isDivision) {
          let dividend = item.num1 || "00";
          let divisor = item.num2 || "0";
          if (item.nums && item.nums.length >= 2) {
            dividend = item.nums[0];
            divisor = item.nums[1];
          }
          const content = item.content || "";
          const divMatch = content.match(/(\d+)\s*(?:÷|\/)\s*(\d+)/);
          const bracketMatch = content.match(/(\d+)\s*\)\s*(\d+)/);
          if (divMatch) {
            dividend = divMatch[1];
            divisor = divMatch[2];
          } else if (bracketMatch) {
            divisor = bracketMatch[1];
            dividend = bracketMatch[2];
          } else if (Number(dividend) < Number(divisor) && Number(dividend) > 0) {
            const tmp = dividend;
            dividend = divisor;
            divisor = tmp;
          }

          const showQR = quotientRemainder ?? (/quotient/i.test(questionTitle || "") || /q\s*=\s*.*r\s*=/i.test(content));
          const workingGap = answerSpace > 0 ? answerSpace : 45;

          return (
            <div
              key={item.id}
              className="math-problem pp-row"
              style={{
                width: autoFit ? `${problemWidth}pt` : undefined,
                minWidth: `${problemWidth}pt`,
                border: border ? "1px solid #000" : undefined,
                padding: border ? "18pt 6pt 4pt" : undefined,
                borderRadius: border ? "2pt" : undefined,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                paddingTop: border ? undefined : "16pt",
                breakInside: "avoid",
                pageBreakInside: "avoid",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: `${indexGap}pt` }}>
                <span className="math-number" style={{ fontWeight: "bold", fontSize: "1.05em", marginRight: 0 }}>
                  {localizeNumber(i + 1, language)})
                </span>
                <div style={{ display: "inline-flex", alignItems: "flex-start", marginTop: "1pt" }}>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "1.15em",
                      paddingRight: "5pt",
                      letterSpacing: `${digitSpacing}pt`,
                      lineHeight: 1.2,
                    }}
                  >
                    {divisor}
                  </span>
                  <div
                    style={{
                      borderLeft: "1.5pt solid #000",
                      borderTop: "1.5pt solid #000",
                      borderTopLeftRadius: "3pt",
                      paddingLeft: "6pt",
                      paddingRight: "10pt",
                      paddingTop: "2pt",
                      paddingBottom: "2pt",
                      minWidth: "32pt",
                      fontWeight: 600,
                      fontSize: "1.15em",
                      letterSpacing: `${digitSpacing}pt`,
                      lineHeight: 1.2,
                    }}
                  >
                    {dividend}
                  </div>
                </div>
              </div>

              {workingGap > 0 && <div style={{ height: `${workingGap}pt`, width: "100%" }} />}

              {showQR && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "14pt",
                    marginTop: "2pt",
                    fontSize: "1em",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "baseline", gap: "3pt" }}>
                    <span>Q =</span>
                    <span
                      style={{
                        display: "inline-block",
                        borderBottom: "1.2pt solid #000",
                        width: "45pt",
                        height: "1em",
                      }}
                    >
                      &nbsp;
                    </span>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "baseline", gap: "3pt" }}>
                    <span>R =</span>
                    <span
                      style={{
                        display: "inline-block",
                        borderBottom: "1.2pt solid #000",
                        width: "45pt",
                        height: "1em",
                      }}
                    >
                      &nbsp;
                    </span>
                  </span>
                </div>
              )}
            </div>
          );
        }
        // Operands: the nums[] array (3+ numbers) wins; otherwise fall back to
        // the classic two-operand num1/num2.
        const operands =
          item.nums && item.nums.length >= 2
            ? item.nums
            : [item.num1 || "000", item.num2 || "000"];
        const last = operands.length - 1;
        return (
          <div
            key={item.id}
            className="math-problem pp-row"
            style={{
              width: autoFit ? `${problemWidth}pt` : undefined,
              minWidth: `${problemWidth}pt`,
              border: border ? "1px solid #000" : undefined,
              padding: border ? "4pt 6pt" : undefined,
              borderRadius: border ? "2pt" : undefined,
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            {/* Problem number, inline on the left side of the sum (aligned with the first operand). */}
            <span className="math-number" style={{ marginRight: `${indexGap}pt` }}>
              {localizeNumber(i + 1, language)})
            </span>
            {/* Operands stacked and right-aligned inside math-body so digit columns line up.
                The operator sits in a fixed left gutter on the last operand. */}
            <div className="math-body">
              {operands.map((n, idx) => (
                <div
                  key={idx}
                  className="math-operand"
                  style={{ display: "flex", width: "100%", alignItems: "baseline" }}
                >
                  <span style={{ width: "1.4em", textAlign: "left", flexShrink: 0 }}>
                    {idx === last ? operation : ""}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      textAlign: "right",
                      letterSpacing: `${digitSpacing}pt`,
                      // letter-spacing also applies after the final digit, which
                      // shifts right-aligned numbers left by one gap and breaks
                      // place-value alignment. Pull that trailing space back.
                      marginRight: `-${digitSpacing}pt`,
                    }}
                  >
                    {n}
                  </span>
                </div>
              ))}
              <div className="math-line" />
              {answerSpace > 0 && <div style={{ height: `${answerSpace}pt`, width: "100%" }} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Comprehension({
  passage,
  passageTitle,
  passageColumns,
  passageBorder,
  items,
  lineStyle,
  language,
  ansHeight,
  subject,
}: {
  passage: string;
  passageTitle?: string;
  passageColumns?: number;
  passageBorder?: boolean;
  items: Question["items"];
  lineStyle: LineStyle;
  language: PaperLanguage;
  ansHeight?: number;
  subject?: string;
}) {
  const ansPrefix = answerPrefixFor(language, subject);
  const copy = copyFor(language);
  const lineH = ansHeight != null ? `${ansHeight}pt` : "var(--pp-ans-h)";

  const hasDelimiter =
    passage.includes("\n---\n") ||
    passage.includes("\r\n---\r\n") ||
    /^\s*---\s*$/m.test(passage);
  const isTwoColumn = passageColumns === 2 || hasDelimiter;

  let col1 = "";
  let col2 = "";
  if (isTwoColumn) {
    if (hasDelimiter) {
      const parts = passage.split(/\r?\n\s*---\s*\r?\n/);
      col1 = parts[0]?.trim() || "";
      col2 = parts.slice(1).join("\n").trim() || "";
    } else {
      const rawLines = passage.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const half = Math.ceil(rawLines.length / 2);
      col1 = rawLines.slice(0, half).join("\n");
      col2 = rawLines.slice(half).join("\n");
    }
  }

  const paragraphs = !isTwoColumn && passage
    ? passage
        .split(/\r?\n\s*\r?\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  const shouldBox = (passageBorder !== false && isTwoColumn) || passageBorder === true;

  return (
    <div>
      {passageTitle && (
        <div
          style={{
            textAlign: "center",
            fontWeight: 700,
            marginBottom: "6pt",
            marginTop: "2pt",
            fontSize: "11.5pt",
          }}
        >
          {passageTitle}
        </div>
      )}
      <div
        className="pp-row"
        style={{
          border: shouldBox ? "1px solid #000" : undefined,
          borderRadius: "2pt",
          width: isTwoColumn ? "68%" : undefined,
          maxWidth: isTwoColumn ? "460pt" : undefined,
          margin: isTwoColumn ? "6pt auto var(--pp-item-gap)" : "0 0 var(--pp-item-gap) 14pt",
          padding: shouldBox ? "6pt 10pt" : 0,
          boxSizing: "border-box",
          breakInside: "avoid",
          pageBreakInside: "avoid",
        }}
      >
        {isTwoColumn ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              columnGap: "14pt",
            }}
          >
            <div
              style={{
                borderRight: "1px solid #000",
                paddingRight: "10pt",
                lineHeight: "1.55",
                whiteSpace: "pre-line",
                fontSize: "0.98em",
              }}
            >
              {col1}
            </div>
            <div
              style={{
                paddingLeft: "4pt",
                lineHeight: "1.55",
                whiteSpace: "pre-line",
                fontSize: "0.98em",
              }}
            >
              {col2}
            </div>
          </div>
        ) : (
          paragraphs.map((para, pIdx) => (
            <p
              key={pIdx}
              style={{
                margin: 0,
                marginBottom: pIdx === paragraphs.length - 1 ? 0 : "6pt",
                textIndent: "20pt",
                whiteSpace: "pre-line",
                lineHeight: "1.6",
                textAlign: "justify",
              }}
            >
              {para}
            </p>
          ))
        )}
      </div>
      {items.length > 0 && (
        <div style={{ marginLeft: "10pt" }}>
            {items.map((item, i) => {
              const lines = item.lines ?? 1;
              const { titleLine, marks, rest } = parseSubItemContent(item, language, subject);
              return (
                <div key={item.id} className="pp-row" style={{ marginBottom: "var(--pp-item-gap)" }}>
                  <div
                    style={{
                      display: marks ? "flex" : "block",
                      justifyContent: marks ? "space-between" : undefined,
                      alignItems: "baseline",
                      gap: "8pt",
                    }}
                  >
                    <div>
                      {localizeNumber(i + 1, language)}) <Lines>{titleLine}</Lines>
                    </div>
                    {marks && (
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "0.95em",
                          whiteSpace: "nowrap",
                          marginLeft: "auto",
                          flexShrink: 0,
                          paddingLeft: "6pt",
                        }}
                      >
                        {marks}
                      </span>
                    )}
                  </div>
                  {rest ? (
                    <div style={{ marginLeft: "14pt", marginTop: "2pt" }}>
                      <Lines>{rest}</Lines>
                    </div>
                  ) : null}
                  {lines > 0 && (
                    <div className="pp-answer-space">
                      {lineStyle === "four-line" ? (
                        <>
                          <div style={{ marginBottom: "2pt" }}>{ansPrefix}&#x27A1;</div>
                          <WritingRows count={lines} lineStyle={lineStyle} ansHeight={ansHeight} />
                        </>
                      ) : (
                        <>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "4pt" }}>
                            <span>{ansPrefix}&#x27A1;</span>
                            <span style={{ flex: 1, borderBottom: "1px solid #000", minHeight: lineH, height: lineH }}>&nbsp;</span>
                          </div>
                          {lines > 1 &&
                            Array.from({ length: lines - 1 }).map((_, li) => (
                              <div key={li} style={{ borderBottom: "1px solid #000", minHeight: lineH, height: lineH, marginLeft: "26pt" }}>&nbsp;</div>
                            ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      )}
    </div>
  );
}

function WordProblem({
  items,
  showBox,
  boxPosition,
  boxWidth,
  boxHeight,
  boxLabel,
  boxGrid,
  boxRows,
  boxCols,
  boxShowNumbers,
  boxOperation,
  lineStyle,
  language,
  ansHeight,
  subject,
}: {
  items: Question["items"];
  showBox: boolean;
  boxPosition: "right" | "below";
  boxWidth: number;
  boxHeight: number;
  boxLabel: boolean;
  boxGrid: boolean;
  boxRows: number;
  boxCols: number;
  boxShowNumbers?: boolean;
  boxOperation?: string;
  lineStyle: LineStyle;
  language: PaperLanguage;
  ansHeight?: number;
  subject?: string;
}) {
  const ansPrefix = answerPrefixFor(language, subject);
  const labels = "abcdefghijklmnopqrstuvwxyz";
  const copy = copyFor(language);
  const lineH = ansHeight != null ? `${ansHeight}pt` : "var(--pp-ans-h)";

  // The bordered working box where the student performs the operation.
  //
  // Ruled into squares when boxGrid is on: one digit per cell keeps a column
  // sum lined up by place value, which is the whole difficulty for a child
  // carrying tens. A table rather than a CSS grid because html2canvas
  // reproduces collapsed table borders faithfully and grid gaps it does not.
  const gridBox = (
    <table
      style={{
        borderCollapse: "collapse",
        width: "100%",
        height: `${boxHeight}pt`,
        tableLayout: "fixed",
      }}
    >
      <tbody>
        {Array.from({ length: Math.max(1, boxRows) }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: Math.max(1, boxCols) }).map((_, c) => (
              <td
                key={c}
                style={{
                  border: "0.75px solid #000",
                  height: `${Math.max(8, boxHeight / Math.max(1, boxRows))}pt`,
                }}
              >
                {/* Non-breaking space keeps empty cells from collapsing. */}
                &nbsp;
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderWorkBox = (item: Question["items"][number]) => {
    // If boxShowNumbers is enabled, extract numbers from item.nums, num1/num2, or item.content
    let operands: string[] = [];
    if (boxShowNumbers) {
      if (item.nums && item.nums.length >= 2) {
        operands = item.nums;
      } else if (item.num1 && item.num2) {
        operands = [item.num1, item.num2];
      } else if (item.content) {
        const matches = item.content.match(/\b\d+\b/g);
        if (matches && matches.length >= 2) {
          operands = matches.slice(0, 2);
        }
      }
    }

    return (
      <div
        style={{
          border: boxGrid ? "none" : "1px solid #000",
          borderRadius: "2pt",
          minHeight: `${boxHeight}pt`,
          height: `${boxHeight}pt`,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: boxShowNumbers && operands.length >= 2 ? "center" : "flex-start",
          alignItems: "center",
          padding: "4pt 8pt",
          boxSizing: "border-box",
        }}
      >
        {boxLabel && !boxShowNumbers && (
          <span
            style={{
              position: "absolute",
              top: "2pt",
              left: "4pt",
              fontSize: "8pt",
              color: "#9ca3af",
              fontFamily: "sans-serif",
              zIndex: 1,
              background: "#fff",
              padding: "0 1pt",
            }}
          >
            {copy.working}
          </span>
        )}
        {boxGrid && gridBox}
        {boxShowNumbers && operands.length >= 2 && (
          <div
            style={{
              fontFamily: '"Courier New", monospace',
              fontSize: "13pt",
              minWidth: "60pt",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            {operands.map((n, idx) => {
              const isLast = idx === operands.length - 1;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "baseline",
                    lineHeight: 1.35,
                    paddingBottom: "1pt",
                  }}
                >
                  <span
                    style={{
                      width: "1.4em",
                      textAlign: "left",
                      flexShrink: 0,
                      fontWeight: 700,
                      fontSize: "1.1em",
                      minHeight: "1em",
                    }}
                  >
                    {isLast ? (boxOperation || "") : ""}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      textAlign: "right",
                      fontWeight: 600,
                      letterSpacing: "3pt",
                      marginRight: "-3pt",
                    }}
                  >
                    {localizeNumber(n, language)}
                  </span>
                </div>
              );
            })}
            <div
              style={{
                borderTop: "1.5px solid #000",
                width: "100%",
                marginTop: "3pt",
                paddingTop: "12pt",
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // The "middle" open space where the student writes the final answer.
  const answerArea = (lines: number) => (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "4pt" }}>
        <span>{ansPrefix}&#x27A1;</span>
        <span style={{ flex: 1, borderBottom: "1px solid #000", minHeight: lineH, height: lineH }}>&nbsp;</span>
      </div>
      {Array.from({ length: Math.max(lines - 1, 0) }).map((_, li) => (
        <div key={li} style={{ borderBottom: "1px solid #000", minHeight: lineH, height: lineH, marginLeft: "26pt" }}>
          &nbsp;
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ marginLeft: "10pt" }}>
      {items.map((item, i) => {
        const lines = item.lines || 2;
        return (
          <div key={item.id} className="pp-row" style={{ marginBottom: "var(--pp-item-gap)", breakInside: "avoid", pageBreakInside: "avoid" }}>
            <div style={{ textAlign: "justify", lineHeight: "1.5" }}>
              {labels[i]}) <Lines>{item.content}</Lines>
            </div>

            {!showBox ? (
              // No box: plain open writing space (original behaviour).
              lineStyle === "four-line" ? (
                <div style={{ marginTop: "2pt" }}>
                  <WritingRows count={Math.max(lines, 2)} lineStyle={lineStyle} ansHeight={ansHeight} />
                </div>
              ) : (
                Array.from({ length: Math.max(lines, 3) }).map((_, li) => (
                  <div key={li} style={{ borderBottom: "1px solid #000", minHeight: lineH, height: lineH }}>&nbsp;</div>
                ))
              )
            ) : boxPosition === "right" ? (
              // Answer in the middle open space, working box on the right.
              <div style={{ display: "flex", gap: "12pt", alignItems: "stretch", marginTop: "3pt", breakInside: "avoid", pageBreakInside: "avoid" }}>
                {answerArea(lines)}
                <div style={{ width: `${boxWidth}pt`, flexShrink: 0, breakInside: "avoid", pageBreakInside: "avoid" }}>{renderWorkBox(item)}</div>
              </div>
            ) : (
              // Working box below the answer space.
              <div style={{ marginTop: "3pt", breakInside: "avoid", pageBreakInside: "avoid" }}>
                {answerArea(lines)}
                <div style={{ marginTop: "4pt", breakInside: "avoid", pageBreakInside: "avoid" }}>{renderWorkBox(item)}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Custom freeform block: renders an ordered list of text / lines / box / spacer
// blocks so a teacher can compose any question shape.
function CustomQuestion({
  blocks,
  lineStyle,
  ansHeight,
}: {
  blocks: NonNullable<Question["customBlocks"]>;
  lineStyle: LineStyle;
  ansHeight?: number;
}) {
  return (
    <div style={{ marginLeft: "12pt" }}>
      {blocks.map((b) => {
        if (b.kind === "text") {
          return (
            <div
              key={b.id}
              style={{ marginBottom: "var(--pp-item-gap)", fontWeight: b.bold ? 700 : 400, lineHeight: "1.6" }}
            >
              {renderBlankText(b.text || "")}
            </div>
          );
        }
        if (b.kind === "lines") {
          const ruling = b.ruling || (lineStyle === "four-line" ? "four-line" : "single");
          return (
            <div key={b.id} style={{ marginBottom: "var(--pp-item-gap)", marginTop: "2pt" }}>
              <WritingRows count={b.lines || 1} lineStyle={ruling} ansHeight={ansHeight} />
            </div>
          );
        }
        if (b.kind === "box") {
          return (
            <div
              key={b.id}
              style={{
                border: "1px solid #000",
                borderRadius: "2pt",
                height: `${b.height || 100}pt`,
                marginBottom: "var(--pp-item-gap)",
                marginTop: "2pt",
              }}
            />
          );
        }
        // spacer
        return <div key={b.id} style={{ height: `${b.height || 12}pt` }} />;
      })}
    </div>
  );
}

function Composition({
  sentences,
  numbered,
  writingLines,
  lineStyle,
  language,
  ansHeight,
}: {
  sentences: string[];
  numbered: boolean;
  writingLines: number;
  lineStyle: LineStyle;
  language: PaperLanguage;
  ansHeight?: number;
}) {
  const prompts = sentences.filter((s) => s.trim().length > 0);
  return (
    <div style={{ marginLeft: "10pt" }}>
      {prompts.map((s, i) => (
        <div key={i} style={{ marginBottom: "var(--pp-item-gap)", lineHeight: "1.8" }}>
          {numbered && `${localizeNumber(i + 1, language)}) `}
          {renderBlankText(s)}
        </div>
      ))}
      {/* Ruled space for the essay itself. An essay prompt with no ruled rows
          leaves the student writing on blank paper. */}
      {writingLines > 0 && (
        <div style={{ marginTop: prompts.length ? "6pt" : "4pt" }}>
          <WritingRows count={writingLines} lineStyle={lineStyle} ansHeight={ansHeight} />
        </div>
      )}
    </div>
  );
}

// Picture composition: the question image(s) are drawn by the shared images
// block above; here we just provide ruled writing space below them.
function PictureComposition({
  writingLines,
  lineStyle,
  ansHeight,
}: {
  writingLines: number;
  lineStyle: LineStyle;
  ansHeight?: number;
}) {
  return (
    <div style={{ marginLeft: "10pt", marginTop: "4pt" }}>
      <WritingRows count={writingLines} lineStyle={lineStyle} ansHeight={ansHeight} />
    </div>
  );
}

// Handwriting / copy practice: print each word, then ruled rows to copy onto.
function Handwriting({
  items,
  lineStyle,
  ansHeight,
}: {
  items: Question["items"];
  lineStyle: LineStyle;
  ansHeight?: number;
}) {
  return (
    <div style={{ marginLeft: "14pt" }}>
      {items.map((item) => (
        <div key={item.id} className="pp-row" style={{ marginBottom: "var(--pp-item-gap)", breakInside: "avoid", pageBreakInside: "avoid" }}>
          <div style={{ fontSize: "1.15em", marginBottom: "2pt", letterSpacing: "1pt" }}>
            <Lines>{item.content}</Lines>
          </div>
          <WritingRows count={item.lines || 2} lineStyle={lineStyle} ansHeight={ansHeight} />
        </div>
      ))}
    </div>
  );
}

// Dictation: numbered ruled rows only (the words are read aloud by the teacher).
function Dictation({
  count,
  columns,
  lineStyle,
  language,
  ansHeight,
}: {
  count: number;
  columns: number;
  lineStyle: LineStyle;
  language: PaperLanguage;
  ansHeight?: number;
}) {
  const lineH = ansHeight != null ? `${ansHeight}pt` : "var(--pp-ans-h)";
  return (
    <div
      style={{
        marginLeft: "10pt",
        display: columns > 1 ? "grid" : "block",
        gridTemplateColumns: columns > 1 ? `repeat(${columns}, 1fr)` : undefined,
        columnGap: "20pt",
      }}
    >
      {Array.from({ length: Math.max(count, 1) }).map((_, i) => (
        <div
          key={i}
          className="pp-row"
          style={{ display: "flex", alignItems: "flex-start", gap: "6pt", marginBottom: "var(--pp-item-gap)", breakInside: "avoid", pageBreakInside: "avoid" }}
        >
          <span style={{ minWidth: "16pt" }}>{localizeNumber(i + 1, language)}.</span>
          <div style={{ flex: 1 }}>
            {lineStyle === "four-line" ? (
              <FourLineBand />
            ) : (
              <div style={{ borderBottom: "1px solid #000", minHeight: lineH, height: lineH }}>&nbsp;</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Draw / colour: prompt followed by an empty bordered box and optional writing lines.
function DrawBox({
  items,
  boxHeight,
  columns,
  writingLines,
  linesPosition = "below",
  lineStyle,
  language,
  ansHeight,
}: {
  items: Question["items"];
  boxHeight: number;
  columns: number;
  writingLines?: number;
  linesPosition?: "below" | "above";
  lineStyle: LineStyle;
  language: PaperLanguage;
  ansHeight?: number;
}) {
  const effectiveItems = items.length > 0 ? items : [{ id: "draw_single", content: "" }];
  const linesFirst = linesPosition === "above";
  return (
    <div
      style={{
        marginLeft: "10pt",
        display: columns > 1 ? "grid" : "block",
        gridTemplateColumns: columns > 1 ? `repeat(${columns}, 1fr)` : undefined,
        columnGap: "16pt",
      }}
    >
      {effectiveItems.map((item, i) => (
        <div key={item.id} className="pp-row" style={{ marginBottom: "var(--pp-item-gap)", breakInside: "avoid", pageBreakInside: "avoid" }}>
          {item.content && (
            <div style={{ marginBottom: "3pt" }}>{localizeNumber(i + 1, language)}) <Lines>{item.content}</Lines></div>
          )}
          {linesFirst && writingLines != null && writingLines > 0 && (
            <div style={{ marginBottom: "6pt" }}>
              <WritingRows count={writingLines} lineStyle={lineStyle} ansHeight={ansHeight} />
            </div>
          )}
          <div
            style={{
              border: "1px solid #000",
              height: `${boxHeight}pt`,
              borderRadius: "2pt",
            }}
          />
          {!linesFirst && writingLines != null && writingLines > 0 && (
            <div style={{ marginTop: "4pt" }}>
              <WritingRows count={writingLines} lineStyle={lineStyle} ansHeight={ansHeight} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Label the picture: image(s) drawn by the shared block above; numbered blank
// lines here for the student to write each label (good for diagrams).
function LabelImage({
  items,
  columns,
  language,
  ansHeight,
}: {
  items: Question["items"];
  columns: number;
  language: PaperLanguage;
  ansHeight?: number;
}) {
  const lineH = ansHeight != null ? `${ansHeight}pt` : "var(--pp-ans-h)";
  return (
    <div
      style={{
        marginLeft: "14pt",
        display: columns > 1 ? "grid" : "block",
        gridTemplateColumns: columns > 1 ? `repeat(${columns}, 1fr)` : undefined,
        columnGap: "20pt",
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.id}
          className="pp-row"
          style={{ display: "flex", alignItems: "baseline", gap: "6pt", marginBottom: "var(--pp-item-gap)", breakInside: "avoid", pageBreakInside: "avoid" }}
        >
          <span>{localizeNumber(i + 1, language)}.</span>
          <span style={{ flex: 1, borderBottom: "1px solid #000", minHeight: lineH, height: lineH }}>
            {item.content ? <span style={{ color: "transparent" }}><Lines>{item.content}</Lines></span> : <>&nbsp;</>}
          </span>
        </div>
      ))}
    </div>
  );
}

// Data table / grid. Empty cells render blank (room for the student to fill).
// Optional sub-questions in items[] render below the table as short answers.
function TableQuestion({
  rows,
  caption,
  headerRow,
  headerCol,
  cellMinHeight,
  hideBorders = false,
  blankLine = false,
  align,
  alignDefault,
  colWidths,
  items,
  lineStyle,
  language,
  ansHeight,
  subject,
}: {
  rows: string[][];
  caption: string;
  headerRow: boolean;
  headerCol: boolean;
  cellMinHeight: number;
  hideBorders?: boolean;
  blankLine?: boolean;
  align: CellAlign[];
  alignDefault: CellAlign;
  colWidths?: string[];
  items: Question["items"];
  lineStyle: LineStyle;
  language: PaperLanguage;
  ansHeight?: number;
  subject?: string;
}) {
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const getColWidth = (ci: number): string | undefined => {
    if (colWidths && colWidths[ci]) return colWidths[ci];
    if (headerCol && cols === 2) {
      return ci === 0 ? "22%" : "78%";
    }
    return undefined;
  };

  return (
    <div style={{ marginLeft: "14pt", marginTop: "6pt" }}>
      {caption && (
        <div style={{ fontWeight: 700, textAlign: "center", marginBottom: "4pt" }}>
          {caption}
        </div>
      )}
      <table
        className="data-table"
        style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}
      >
        <colgroup>
          {Array.from({ length: cols }).map((_, ci) => {
            const w = getColWidth(ci);
            return <col key={ci} style={w ? { width: w } : undefined} />;
          })}
        </colgroup>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="pp-row" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
              {Array.from({ length: cols }).map((_, ci) => {
                const isHeader =
                  (headerRow && ri === 0) || (headerCol && ci === 0);
                const text = row[ci] ?? "";
                const isBlank = !text.trim();
                const colW = getColWidth(ci);
                return (
                  <td
                    key={ci}
                    style={{
                      border: hideBorders ? "none" : "1px solid #000",
                      padding: "4pt 6pt",
                      textAlign: align[ci] ?? alignDefault,
                      verticalAlign: "middle",
                      fontWeight: isHeader ? 700 : 400,
                      background: isHeader ? "#f0f0f0" : undefined,
                      minHeight: `${cellMinHeight}pt`,
                      height: `${cellMinHeight}pt`,
                      width: colW,
                    }}
                  >
                    {isBlank ? (
                      blankLine ? (
                        <span
                          style={{
                            display: "inline-block",
                            borderBottom: "1.5px solid #000",
                            width: "36pt",
                            height: "1em",
                            verticalAlign: "bottom",
                          }}
                        >
                          &nbsp;
                        </span>
                      ) : (
                        " "
                      )
                    ) : (
                      text
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {items.length > 0 && (
        <div style={{ marginLeft: "-4pt", marginTop: "8pt" }}>
          <ShortAnswer items={items} lineStyle={lineStyle} language={language} ansHeight={ansHeight} subject={subject} />
        </div>
      )}
    </div>
  );
}

/* ===== Helpers ===== */

/** Renders a sub-item image inline */
function SubItemImage({ src, width, marginLeft = "16pt" }: { src: string; width?: number; marginLeft?: string }) {
  const w = width || 80;
  return (
    <div style={{ marginLeft, marginTop: "4pt", marginBottom: "4pt" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{
          width: `${w}pt`,
          maxHeight: "120pt",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
}

function renderBlankText(text: string) {
  if (!text) return null;
  const parts = text.split(/(___+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.match(/^___+$/) ? (
          <span
            key={i}
            style={{
              display: "inline-block",
              borderBottom: "1.5px solid #000",
              minWidth: `${Math.max(60, part.length * 8)}px`,
              height: "1em",
              verticalAlign: "bottom",
              margin: "0 2pt",
            }}
          >
            &nbsp;
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
