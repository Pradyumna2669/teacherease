import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  TabStopType,
  ShadingType,
} from "docx";
import type { PaperSettings, Question, HeaderField } from "@/lib/types";
import {
  isStructuralQuestion,
  copyFor,
  localizeNumber,
  matchLabelFor,
  DEFAULT_HEADER_ROWS,
  HEADER_WRITE_IN,
  DENSITY_METRICS,
  answerPrefixFor,
} from "@/lib/types";
import { splitTitleAndHints } from "@/lib/hints";

// Convert points to twips (1 pt = 20 twips)
const pt = (points: number) => Math.round(points * 20);

// Convert pt font size to docx half-points (1 pt = 2 half-points)
const fs = (points: number) => Math.round(points * 2);

const BORDER_NONE = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
};

const BORDER_SINGLE = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: "000000",
};

const CELL_MARGIN_COMPACT = {
  top: pt(2),
  bottom: pt(2),
  left: pt(4),
  right: pt(4),
};

const FALLBACK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

interface ParsedImage {
  type: "png" | "jpg" | "svg";
  data: Buffer;
  fallback?: { type: "png" | "jpg"; data: Buffer };
  transformation: { width: number; height: number };
}

function parseBase64Image(dataUrl: string, maxWidth = 480, defaultHeight = 150): ParsedImage | null {
  try {
    const comma = dataUrl.indexOf(",");
    if (comma === -1) return null;
    const meta = dataUrl.slice(0, comma);
    const content = dataUrl.slice(comma + 1);

    if (meta.includes("svg")) {
      const isBase64 = meta.includes("base64");
      const svgText = isBase64 ? Buffer.from(content, "base64").toString("utf8") : decodeURIComponent(content);
      const svgBuf = Buffer.from(svgText, "utf8");

      // Extract dimensions from viewBox or width/height
      const vbMatch = svgText.match(/viewBox=["']\s*0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*["']/i);
      let w = vbMatch ? parseFloat(vbMatch[1]) : 450;
      let h = vbMatch ? parseFloat(vbMatch[2]) : defaultHeight;

      if (w > maxWidth) {
        const scale = maxWidth / w;
        w = maxWidth;
        h = Math.round(h * scale);
      }

      return {
        type: "svg",
        data: svgBuf,
        fallback: {
          type: "png",
          data: FALLBACK_PNG,
        },
        transformation: { width: Math.round(w), height: Math.round(h) },
      };
    }

    const isPng = meta.includes("png");
    return {
      type: isPng ? "png" : "jpg",
      data: Buffer.from(content, "base64"),
      transformation: { width: Math.min(maxWidth, 180), height: defaultHeight },
    };
  } catch {
    return null;
  }
}

function getFontFamily(settings: PaperSettings): string {
  const lang = settings.language || "english";
  const family = settings.fontFamily || "serif";
  if (lang === "marathi" || lang === "hindi") {
    return family === "sans" ? "Nirmala UI" : "Mangal";
  }
  if (lang === "gujarati") return "Shruti";
  if (lang === "tamil") return "Latha";
  if (lang === "telugu") return "Gautami";
  if (lang === "kannada") return "Tunga";
  if (lang === "malayalam") return "Kartika";
  if (lang === "bengali") return "Vrinda";
  if (lang === "punjabi") return "Raavi";
  return family === "sans" ? "Arial" : "Times New Roman";
}

export async function exportPaperToDocx(
  settings: PaperSettings,
  questions: Question[]
): Promise<Blob> {
  const language = settings.language || "english";
  const copy = copyFor(language);
  const baseFontSize = settings.fontSize || 12;
  const showMcqBox = settings.mcqOptionBox === true;
  const docFont = getFontFamily(settings);

  const textRun = (text: string, opts: Record<string, unknown> = {}) =>
    new TextRun({ font: docFont, ...opts, text });

  // Page margins
  const marginPreset = settings.margin || "normal";
  let topMarginPt = 36;
  let bottomMarginPt = 36;
  let sideMarginPt = 36;

  if (marginPreset === "narrow") {
    topMarginPt = 24;
    bottomMarginPt = 24;
    sideMarginPt = 28;
  } else if (marginPreset === "wide") {
    topMarginPt = 54;
    bottomMarginPt = 54;
    sideMarginPt = 54;
  }

  // A4 is 595.3 pt wide (11906 twips)
  const contentWidthPt = 595.3 - sideMarginPt * 2;
  const contentWidthTwips = pt(contentWidthPt);
  const RIGHT_TAB_POS = contentWidthTwips;

  // Spacing metrics matching density preset
  const density = settings.density || "comfortable";
  const metrics = DENSITY_METRICS[density] || DENSITY_METRICS.comfortable;
  const qGap = metrics.qGap;
  const itemGap = metrics.itemGap;
  const titleGap = metrics.titleGap;

  const children: (Paragraph | Table)[] = [];

  // ==========================================
  // 1. HEADER BLOCK
  // ==========================================
  const schoolName = settings.schoolName || "School Name";
  const schoolSubtitle = settings.schoolSubtitle;
  const assessmentTitle = settings.assessmentTitle || "Assessment Title";
  const academicYear = settings.academicYear || "";
  const headerStyle = settings.headerStyle || "clean";
  const rows = settings.headerRows?.length ? settings.headerRows : DEFAULT_HEADER_ROWS;

  const headerChildren: (Paragraph | Table)[] = [];

  // Logo if present
  if (settings.logoUrl) {
    const logoImg = parseBase64Image(settings.logoUrl, 70, 70);
    if (logoImg) {
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: pt(2), after: pt(2) },
          children: [
            new ImageRun({
              type: logoImg.type,
              data: logoImg.data,
              transformation: logoImg.transformation,
              fallback: logoImg.fallback,
            } as any),
          ],
        })
      );
    }
  }

  // School Name
  const isBanner = headerStyle === "banner";
  headerChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: pt(2), after: pt(1) },
      children: [
        textRun(schoolName, {
          bold: true,
          size: fs(baseFontSize + 4),
          color: isBanner ? "FFFFFF" : "000000",
        }),
      ],
    })
  );

  // Subtitle (if any)
  if (schoolSubtitle) {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: pt(1), after: pt(1) },
        children: [
          textRun(schoolSubtitle, {
            size: fs(baseFontSize - 2),
            color: isBanner ? "E0E0E0" : "444444",
          }),
        ],
      })
    );
  }

  // Assessment Title
  headerChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: pt(2), after: pt(1) },
      children: [
        textRun(assessmentTitle, {
          bold: true,
          size: fs(baseFontSize + 1.5),
        }),
      ],
    })
  );

  // Academic Year (if any)
  if (academicYear) {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: pt(1), after: pt(3) },
        children: [
          textRun(academicYear, { size: fs(baseFontSize) }),
        ],
      })
    );
  }

  // Student Info Rows (Class, Subject, Marks, Name, Roll No, Date, Time, etc.)
  function getFieldContent(field: HeaderField): { textRuns: TextRun[]; align: (typeof AlignmentType)[keyof typeof AlignmentType] } {
    if (field === "name") {
      return {
        textRuns: [
          textRun(`${copy.name}: `, { bold: true, size: fs(baseFontSize) }),
          textRun("____________________________________", { size: fs(baseFontSize) }),
        ],
        align: AlignmentType.LEFT,
      };
    }
    if (field === "rollNo") {
      return {
        textRuns: [
          textRun(`${copy.rollNo}: `, { bold: true, size: fs(baseFontSize) }),
          textRun("____________", { size: fs(baseFontSize) }),
        ],
        align: AlignmentType.RIGHT,
      };
    }
    if (field === "date") {
      return {
        textRuns: [
          textRun(`${copy.date}: `, { bold: true, size: fs(baseFontSize) }),
          textRun("____________", { size: fs(baseFontSize) }),
        ],
        align: AlignmentType.RIGHT,
      };
    }
    if (field === "className") {
      return {
        textRuns: [
          textRun(`${copy.classLabel}: `, { bold: true, size: fs(baseFontSize) }),
          textRun(settings.className || "Class", { bold: true, size: fs(baseFontSize) }),
        ],
        align: AlignmentType.LEFT,
      };
    }
    if (field === "subject") {
      return {
        textRuns: [
          textRun(`${copy.subject}: `, { bold: true, size: fs(baseFontSize) }),
          textRun(settings.subject || "Subject", { bold: true, size: fs(baseFontSize) }),
        ],
        align: AlignmentType.CENTER,
      };
    }
    if (field === "marks") {
      return {
        textRuns: [
          textRun(`${copy.marks}: `, { bold: true, size: fs(baseFontSize) }),
          textRun(localizeNumber(settings.totalMarks || 40, language), { bold: true, size: fs(baseFontSize) }),
        ],
        align: AlignmentType.RIGHT,
      };
    }
    if (field === "time") {
      return {
        textRuns: [
          textRun(`${copy.timeLabel}: `, { bold: true, size: fs(baseFontSize) }),
          textRun(settings.timeAllowed || "", { bold: true, size: fs(baseFontSize) }),
        ],
        align: AlignmentType.RIGHT,
      };
    }
    if (field === "section") {
      return {
        textRuns: [
          textRun(`${copy.sectionLabel}: `, { bold: true, size: fs(baseFontSize) }),
          textRun(settings.section || "", { bold: true, size: fs(baseFontSize) }),
        ],
        align: AlignmentType.LEFT,
      };
    }
    return { textRuns: [new TextRun({ text: " " })], align: AlignmentType.LEFT };
  }

  const headerTableRows: TableRow[] = [];
  rows.forEach((row) => {
    const validFields = row.filter((f) => f !== "blank");
    if (!validFields.length) return;
    const colWidth = Math.floor(100 / validFields.length);
    const cells = validFields.map((f, colIdx) => {
      const { textRuns, align } = getFieldContent(f);
      const cellAlign =
        validFields.length === 1
          ? align
          : colIdx === 0
          ? AlignmentType.LEFT
          : colIdx === validFields.length - 1
          ? AlignmentType.RIGHT
          : AlignmentType.CENTER;

      return new TableCell({
        borders: BORDER_NONE,
        margins: CELL_MARGIN_COMPACT,
        width: { size: colWidth, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: cellAlign,
            spacing: { before: pt(1.5), after: pt(1.5) },
            children: textRuns,
          }),
        ],
      });
    });
    headerTableRows.push(new TableRow({ children: cells }));
  });

  if (headerTableRows.length > 0) {
    headerChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        rows: headerTableRows,
      })
    );
  }

  // Wrap according to HeaderStyle
  if (headerStyle === "boxed") {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: {
                  top: BORDER_SINGLE,
                  bottom: BORDER_SINGLE,
                  left: BORDER_SINGLE,
                  right: BORDER_SINGLE,
                },
                margins: { top: pt(8), bottom: pt(8), left: pt(12), right: pt(12) },
                width: { size: 100, type: WidthType.PERCENTAGE },
                children: headerChildren,
              }),
            ],
          }),
        ],
      })
    );
  } else if (headerStyle === "double-border") {
    const BORDER_DOUBLE = { style: BorderStyle.DOUBLE, size: 3, color: "000000" };
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: {
                  top: BORDER_DOUBLE,
                  bottom: BORDER_DOUBLE,
                  left: BORDER_DOUBLE,
                  right: BORDER_DOUBLE,
                },
                margins: { top: pt(8), bottom: pt(8), left: pt(12), right: pt(12) },
                width: { size: 100, type: WidthType.PERCENTAGE },
                children: headerChildren,
              }),
            ],
          }),
        ],
      })
    );
  } else if (headerStyle === "formal") {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 18, color: "000000" },
                  bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
                  left: BORDER_NONE.left,
                  right: BORDER_NONE.right,
                },
                margins: { top: pt(6), bottom: pt(6), left: pt(4), right: pt(4) },
                width: { size: 100, type: WidthType.PERCENTAGE },
                children: headerChildren,
              }),
            ],
          }),
        ],
      })
    );
    // Double line beneath formal header
    children.push(
      new Paragraph({
        border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: "000000" } },
        spacing: { before: pt(2), after: pt(6) },
        children: [new TextRun({ text: " " })],
      })
    );
  } else if (headerStyle === "banner") {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: {
                  top: BORDER_SINGLE,
                  bottom: BORDER_SINGLE,
                  left: BORDER_SINGLE,
                  right: BORDER_SINGLE,
                },
                shading: { fill: "000000", type: ShadingType.CLEAR },
                margins: { top: pt(6), bottom: pt(6), left: pt(12), right: pt(12) },
                width: { size: 100, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      textRun(schoolName, { bold: true, size: fs(baseFontSize + 4), color: "FFFFFF" }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: {
                  top: BORDER_NONE.top,
                  bottom: BORDER_SINGLE,
                  left: BORDER_SINGLE,
                  right: BORDER_SINGLE,
                },
                margins: { top: pt(6), bottom: pt(8), left: pt(12), right: pt(12) },
                width: { size: 100, type: WidthType.PERCENTAGE },
                children: headerChildren.slice(1),
              }),
            ],
          }),
        ],
      })
    );
  } else {
    // "clean" / default: header content followed by crisp dividing rule
    children.push(...headerChildren);
    children.push(
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: "000000" } },
        spacing: { before: pt(3), after: pt(6) },
        children: [new TextRun({ text: " " })],
      })
    );
  }

  // ==========================================
  // 2. GENERAL INSTRUCTIONS
  // ==========================================
  const instructions = settings.instructions?.filter((l) => l.trim()) || [];
  if (instructions.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: pt(4), after: pt(2) },
        children: [
          textRun(copy.instructionsTitle || "General Instructions:", {
            bold: true,
            size: fs(baseFontSize),
          }),
        ],
      })
    );

    instructions.forEach((ins, i) => {
      children.push(
        new Paragraph({
          spacing: { before: pt(1), after: pt(1) },
          indent: { left: pt(12) },
          children: [
            textRun(`${localizeNumber(i + 1, language)}. `, {
              bold: true,
              size: fs(baseFontSize - 0.5),
            }),
            textRun(ins, { size: fs(baseFontSize - 0.5) }),
          ],
        })
      );
    });

    children.push(new Paragraph({ spacing: { after: pt(4) } }));
  }

  // ==========================================
  // 3. QUESTIONS
  // ==========================================
  let questionNumber = 0;
  for (const q of questions) {
    const isStructural = isStructuralQuestion(q);
    if (isStructural) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: pt(10), after: pt(4) },
          children: [
            new TextRun({
              text: q.title,
              bold: true,
              size: fs(baseFontSize + 0.5),
            }),
          ],
        })
      );
      if (!q.images || q.images.length === 0) {
        continue;
      }
    }

    if (!isStructural) {
      questionNumber++;
    }

    const { title: cleanTitle, hints: inlineHints } = splitTitleAndHints(q.title);
    const effectiveTitle = q.hints ? q.title : cleanTitle;
    const effectiveHints = q.hints || inlineHints;

    const hasExplicitNum = /^(Q\.?|प्र\.?|प्रश्न|Question|किंवा|\([०-९0-9ivxlcdmIVXLCDM]+\)|[०-९0-9ivxlcdmIVXLCDM]+[\.\)])/i.test(effectiveTitle.trim());
    const qTitle = hasExplicitNum ? effectiveTitle : `Q.${localizeNumber(questionNumber, language)}) ${effectiveTitle}`;
    const qMarks = `(${localizeNumber(q.marks, language)}M)`;

    // Question Title with marks pinned to the right margin via right tab stop
    children.push(
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB_POS }],
        spacing: { before: pt(qGap), after: effectiveHints ? pt(1) : pt(titleGap) },
        children: [
          textRun(qTitle, { bold: true, size: fs(baseFontSize) }),
          new TextRun({ text: "\t" }),
          textRun(qMarks, { bold: true, size: fs(baseFontSize) }),
        ],
      })
    );

    // Hints
    if (effectiveHints) {
      children.push(
        new Paragraph({
          spacing: { before: pt(1), after: pt(titleGap) },
          indent: { left: pt(12), right: pt(12) },
          children: [
            textRun(effectiveHints, { italics: true, size: fs(baseFontSize - 0.5) }),
          ],
        })
      );
    }

    // Question-level Passage (Comprehension / Story)
    if (q.passage) {
      if (q.passageTitle) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: pt(3), after: pt(3) },
            children: [
              textRun(q.passageTitle, { bold: true, size: fs(baseFontSize + 0.5) }),
            ],
          })
        );
      }
      const hasDelimiter =
        q.passage.includes("\n---\n") ||
        q.passage.includes("\r\n---\r\n") ||
        /^\s*---\s*$/m.test(q.passage);
      const isTwoCol = q.passageColumns === 2 || hasDelimiter;

      if (isTwoCol) {
        let col1 = "";
        let col2 = "";
        if (hasDelimiter) {
          const parts = q.passage.split(/\r?\n\s*---\s*\r?\n/);
          col1 = parts[0]?.trim() || "";
          col2 = parts.slice(1).join("\n").trim() || "";
        } else {
          const rawLines = q.passage.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          const half = Math.ceil(rawLines.length / 2);
          col1 = rawLines.slice(0, half).join("\n");
          col2 = rawLines.slice(half).join("\n");
        }

        const col1Paras = col1.split(/\r?\n/).map((l) =>
          new Paragraph({
            spacing: { before: pt(0.5), after: pt(0.5) },
            children: [textRun(l.trim(), { size: fs(baseFontSize - 0.5) })],
          })
        );
        const col2Paras = col2.split(/\r?\n/).map((l) =>
          new Paragraph({
            spacing: { before: pt(0.5), after: pt(0.5) },
            children: [textRun(l.trim(), { size: fs(baseFontSize - 0.5) })],
          })
        );

        children.push(
          new Table({
            width: { size: 75, type: WidthType.PERCENTAGE },
            alignment: AlignmentType.CENTER,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: {
                      top: BORDER_SINGLE,
                      bottom: BORDER_SINGLE,
                      left: BORDER_SINGLE,
                      right: BORDER_SINGLE,
                    },
                    margins: { top: pt(4), bottom: pt(4), left: pt(8), right: pt(8) },
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: col1Paras,
                  }),
                  new TableCell({
                    borders: {
                      top: BORDER_SINGLE,
                      bottom: BORDER_SINGLE,
                      left: BORDER_SINGLE,
                      right: BORDER_SINGLE,
                    },
                    margins: { top: pt(4), bottom: pt(4), left: pt(8), right: pt(8) },
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: col2Paras,
                  }),
                ],
              }),
            ],
          })
        );
      } else {
        const rawParagraphs = q.passage.split(/\r?\n\s*\r?\n+/).map((p) => p.trim()).filter(Boolean);
        const isCaseStudy = q.type === "case-study";
        const passageParas = rawParagraphs.map((pText, pIdx) => {
          const rawLines = pText.split(/\r?\n/);
          const runs: TextRun[] = [];
          rawLines.forEach((l, lIdx) => {
            runs.push(
              textRun(l.trim(), {
                size: fs(baseFontSize - 0.5),
                break: lIdx > 0 ? 1 : undefined,
              })
            );
          });
          return new Paragraph({
            alignment: AlignmentType.BOTH,
            indent: isCaseStudy ? undefined : { left: pt(14), firstLine: pt(18) },
            spacing: {
              before: pt(1),
              after: pIdx === rawParagraphs.length - 1 ? pt(2) : pt(5),
            },
            children: runs,
          });
        });

        if (isCaseStudy || q.passageBorder) {
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      borders: {
                        top: BORDER_SINGLE,
                        bottom: BORDER_SINGLE,
                        left: BORDER_SINGLE,
                        right: BORDER_SINGLE,
                      },
                      margins: { top: pt(4), bottom: pt(4), left: pt(8), right: pt(8) },
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      children: passageParas,
                    }),
                  ],
                }),
              ],
            })
          );
        } else {
          children.push(...passageParas);
        }
      }
    }

    // Question-level Images (Diagrams / SVGs)
    if (q.images && q.images.length > 0) {
      for (let imgIdx = 0; imgIdx < q.images.length; imgIdx++) {
        const imgDataUrl = q.images[imgIdx];
        const parsed = parseBase64Image(imgDataUrl, 480, 160);
        if (parsed) {
          const imageRunOpt: any = {
            type: parsed.type,
            data: parsed.data,
            transformation: parsed.transformation,
          };
          if (parsed.fallback) {
            imageRunOpt.fallback = parsed.fallback;
          }
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: pt(3), after: pt(4) },
              children: [new ImageRun(imageRunOpt)],
            })
          );
        }
      }
    }

    const items = q.items || [];
    const hasImages = items.some((it) => it.image);
    const cols = Math.max(1, q.columnsPerRow || 1);

    // ==========================================
    // QUESTION TYPES
    // ==========================================

    // --- MCQ Type ---
    if (q.type === "mcq") {
      items.forEach((item, ii) => {
        children.push(
          new Paragraph({
            spacing: { before: pt(itemGap), after: pt(1.5) },
            indent: { left: pt(8) },
            children: [
              new TextRun({
                text: `${localizeNumber(ii + 1, language)}) `,
                bold: true,
                size: fs(baseFontSize),
              }),
              new TextRun({
                text: item.content,
                size: fs(baseFontSize),
              }),
            ],
          })
        );

        if (item.image) {
          const imgInfo = parseBase64Image(item.image, 140, 90);
          if (imgInfo) {
            children.push(
              new Paragraph({
                indent: { left: pt(16) },
                spacing: { before: pt(2), after: pt(2) },
                children: [
                  new ImageRun({
                    type: imgInfo.type,
                    data: imgInfo.data,
                    transformation: imgInfo.transformation,
                    fallback: imgInfo.fallback,
                  } as any),
                ],
              })
            );
          }
        }

        const opts = item.options || [];
        const optCols = Math.max(1, q.columnsPerRow || (opts.every((o) => (o || "").length <= 22) && opts.length >= 4 ? 4 : opts.length >= 2 ? 2 : 1));
        const colWidthPercent = Math.floor(100 / optCols);

        if (optCols > 1 && opts.length >= 2) {
          const optRows: TableRow[] = [];
          for (let o = 0; o < opts.length; o += optCols) {
            const rowCells: TableCell[] = [];
            for (let c = 0; c < optCols; c++) {
              const optIndex = o + c;
              const optText = opts[optIndex];
              const letter = optIndex < opts.length ? String.fromCharCode(97 + optIndex) : "";
              const box = showMcqBox && optIndex < opts.length ? "  [   ]" : "";

              rowCells.push(
                new TableCell({
                  borders: BORDER_NONE,
                  margins: CELL_MARGIN_COMPACT,
                  width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      spacing: { before: pt(1), after: pt(1) },
                      children: optText
                        ? [
                            new TextRun({ text: `(${letter}) `, bold: true, size: fs(baseFontSize - 0.5) }),
                            textRun(`${optText}${box}`, { size: fs(baseFontSize - 0.5) }),
                          ]
                        : [new TextRun({ text: " " })],
                    }),
                  ],
                })
              );
            }
            optRows.push(new TableRow({ children: rowCells }));
          }

          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              rows: optRows,
            })
          );
        } else {
          opts.forEach((opt, oIdx) => {
            const letter = String.fromCharCode(97 + oIdx);
            const box = showMcqBox ? "  [   ]" : "";
            children.push(
              new Paragraph({
                indent: { left: pt(16) },
                spacing: { before: pt(1), after: pt(1) },
                children: [
                  new TextRun({ text: `(${letter}) `, bold: true, size: fs(baseFontSize - 0.5) }),
                  textRun(`${opt}${box}`, { size: fs(baseFontSize - 0.5) }),
                ],
              })
            );
          });
        }
      });
    }

    // --- Fill in the Blanks ---
    else if (q.type === "fill-blanks") {
      const labels = "abcdefghijklmnopqrstuvwxyz";
      const colCount = cols;
      const colWidthPercent = Math.floor(100 / colCount);

      if (colCount > 1 && items.length >= 2) {
        const rowsList: TableRow[] = [];
        for (let i = 0; i < items.length; i += colCount) {
          const cells: TableCell[] = [];
          for (let c = 0; c < colCount; c++) {
            const idx = i + c;
            const item = items[idx];
            if (item) {
              const label = q.hideItemNumbering ? "" : `${labels[idx] || idx + 1}) `;
              cells.push(
                new TableCell({
                  borders: BORDER_NONE,
                  margins: CELL_MARGIN_COMPACT,
                  width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      spacing: { before: pt(1.5), after: pt(1.5) },
                      children: [
                        ...(label ? [new TextRun({ text: label, bold: true, size: fs(baseFontSize) })] : []),
                        textRun(item.content.replace(/___+/g, "___________"), { size: fs(baseFontSize) }),
                      ],
                    }),
                  ],
                })
              );
            } else {
              cells.push(
                new TableCell({
                  borders: BORDER_NONE,
                  margins: CELL_MARGIN_COMPACT,
                  width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: " " })] })],
                })
              );
            }
          }
          rowsList.push(new TableRow({ children: cells }));
        }

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            rows: rowsList,
          })
        );
      } else {
        items.forEach((item, ii) => {
          const label = q.hideItemNumbering ? "" : `${labels[ii] || ii + 1}) `;
          children.push(
            new Paragraph({
              spacing: { before: pt(1.5), after: pt(1.5) },
              indent: { left: pt(8) },
              children: [
                ...(label ? [new TextRun({ text: label, bold: true, size: fs(baseFontSize) })] : []),
                textRun(item.content.replace(/___+/g, "________________"), { size: fs(baseFontSize) }),
              ],
            })
          );
        });
      }
    }

    // --- True / False ---
    else if (q.type === "true-false") {
      const marker = q.tfFormat === "box" ? "[   ]" : "(       )";
      const isRight = q.tfAnswerPosition === "right";
      const colCount = cols;
      const colWidthPercent = Math.floor(100 / colCount);

      if (colCount > 1 && items.length >= 2) {
        const rowsList: TableRow[] = [];
        for (let i = 0; i < items.length; i += colCount) {
          const cells: TableCell[] = [];
          for (let c = 0; c < colCount; c++) {
            const idx = i + c;
            const item = items[idx];
            if (item) {
              cells.push(
                new TableCell({
                  borders: BORDER_NONE,
                  margins: CELL_MARGIN_COMPACT,
                  width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      spacing: { before: pt(1.5), after: pt(1.5) },
                      children: [
                        new TextRun({ text: `${localizeNumber(idx + 1, language)}) `, bold: true, size: fs(baseFontSize) }),
                        textRun(item.content, { size: fs(baseFontSize) }),
                        new TextRun({ text: `  ${marker}`, bold: true, size: fs(baseFontSize) }),
                      ],
                    }),
                  ],
                })
              );
            } else {
              cells.push(
                new TableCell({
                  borders: BORDER_NONE,
                  margins: CELL_MARGIN_COMPACT,
                  width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: " " })] })],
                })
              );
            }
          }
          rowsList.push(new TableRow({ children: cells }));
        }

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            rows: rowsList,
          })
        );
      } else {
        items.forEach((item, ii) => {
          if (isRight) {
            children.push(
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB_POS }],
                indent: { left: pt(8) },
                spacing: { before: pt(1.5), after: pt(1.5) },
                children: [
                  new TextRun({ text: `${localizeNumber(ii + 1, language)}) `, bold: true, size: fs(baseFontSize) }),
                  textRun(item.content, { size: fs(baseFontSize) }),
                  new TextRun({ text: "\t" }),
                  new TextRun({ text: marker, bold: true, size: fs(baseFontSize) }),
                ],
              })
            );
          } else {
            children.push(
              new Paragraph({
                indent: { left: pt(8) },
                spacing: { before: pt(1.5), after: pt(1.5) },
                children: [
                  new TextRun({ text: `${localizeNumber(ii + 1, language)}) `, bold: true, size: fs(baseFontSize) }),
                  textRun(item.content, { size: fs(baseFontSize) }),
                  new TextRun({ text: `  ${marker}`, bold: true, size: fs(baseFontSize) }),
                ],
              })
            );
          }
        });
      }
    }

    // --- Match Type ---
    else if (q.type === "match") {
      const left = q.matchLeft || [];
      const right = q.matchRight || [];
      const leftLabel = q.matchLeftLabel ?? "numbers";
      const rightLabel = q.matchRightLabel ?? "none";
      const maxLen = Math.max(left.length, right.length);

      const matchRows = [
        new TableRow({
          children: [
            new TableCell({
              borders: { top: BORDER_NONE.top, bottom: BORDER_SINGLE, left: BORDER_NONE.left, right: BORDER_NONE.right },
              margins: CELL_MARGIN_COMPACT,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: pt(1), after: pt(2) },
                  children: [new TextRun({ text: q.matchLeftHeader || "Column A", bold: true, size: fs(baseFontSize) })],
                }),
              ],
            }),
            new TableCell({
              borders: { top: BORDER_NONE.top, bottom: BORDER_SINGLE, left: BORDER_NONE.left, right: BORDER_NONE.right },
              margins: CELL_MARGIN_COMPACT,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: pt(1), after: pt(2) },
                  children: [new TextRun({ text: q.matchRightHeader || "Column B", bold: true, size: fs(baseFontSize) })],
                }),
              ],
            }),
          ],
        }),
      ];

      for (let i = 0; i < maxLen; i++) {
        const hasLeft = Boolean(left[i]?.trim() || left[i]?.startsWith("data:image/"));
        const hasRight = Boolean(right[i]?.trim() || right[i]?.startsWith("data:image/"));
        const labelL = hasLeft ? matchLabelFor(leftLabel, i, language) : "";
        const labelR = hasRight ? matchLabelFor(rightLabel, i, language) : "";
        matchRows.push(
          new TableRow({
            children: [
              new TableCell({
                borders: BORDER_NONE,
                margins: CELL_MARGIN_COMPACT,
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  (() => {
                    const lRuns: (TextRun | ImageRun)[] = [];
                    if (labelL) {
                      lRuns.push(new TextRun({ text: labelL, bold: true, size: fs(baseFontSize) }));
                    }
                    if (left[i]?.startsWith("data:image/")) {
                      const pImg = parseBase64Image(left[i], 36, 28);
                      if (pImg) {
                        lRuns.push(new ImageRun({
                          type: pImg.type,
                          data: pImg.data,
                          transformation: pImg.transformation,
                          fallback: pImg.fallback,
                        } as any));
                      }
                    } else if (left[i]) {
                      lRuns.push(textRun(left[i], { size: fs(baseFontSize) }));
                    }
                    return new Paragraph({
                      spacing: { before: pt(1), after: pt(1.5) },
                      children: lRuns,
                    });
                  })(),
                ],
              }),
              new TableCell({
                borders: BORDER_NONE,
                margins: CELL_MARGIN_COMPACT,
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  (() => {
                    const rRuns: (TextRun | ImageRun)[] = [];
                    if (labelR) {
                      rRuns.push(new TextRun({ text: labelR, bold: true, size: fs(baseFontSize) }));
                    }
                    if (right[i]?.startsWith("data:image/")) {
                      const pImg = parseBase64Image(right[i], 36, 28);
                      if (pImg) {
                        rRuns.push(new ImageRun({
                          type: pImg.type,
                          data: pImg.data,
                          transformation: pImg.transformation,
                          fallback: pImg.fallback,
                        } as any));
                      }
                    } else if (right[i]) {
                      rRuns.push(textRun(right[i], { size: fs(baseFontSize) }));
                    }
                    return new Paragraph({
                      spacing: { before: pt(1), after: pt(1.5) },
                      children: rRuns,
                    });
                  })(),
                ],
              }),
            ],
          })
        );
      }

      children.push(
        new Table({
          width: { size: 90, type: WidthType.PERCENTAGE },
          borders: BORDER_NONE,
          rows: matchRows,
        })
      );
    }

    // --- Math-Vertical Type (Column Sums & Long Division) ---
    else if (q.type === "math-vertical") {
      const operation = q.operation || "+";
      const isDiv = operation === "÷" || (operation as string) === "/";
      const mathCols = Math.max(1, Math.min(6, q.columnsPerRow || (isDiv ? 2 : 4)));
      const colWidthPercent = Math.floor(100 / mathCols);
      const mathRows: TableRow[] = [];

      for (let i = 0; i < items.length; i += mathCols) {
        const slice = items.slice(i, i + mathCols);
        const cells: TableCell[] = slice.map((item, colIdx) => {
          const globalIdx = i + colIdx;
          const operands =
            item.nums && item.nums.length >= 2
              ? item.nums
              : [item.num1 || "00", item.num2 || "00"];
          const last = operands.length - 1;

          const paragraphs: Paragraph[] = [
            new Paragraph({
              spacing: { before: pt(1), after: pt(1) },
              children: [
                new TextRun({
                  text: `${localizeNumber(globalIdx + 1, language)})`,
                  bold: true,
                  size: fs(baseFontSize - 1),
                }),
              ],
            }),
          ];

          if (isDiv) {
            let dividend = operands[0] || "00";
            let divisor = operands[1] || "0";
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

            const hasQR = q.mathQuotientRemainder ?? (/quotient/i.test(q.title || "") || /q\s*=\s*.*r\s*=/i.test(content));
            const gapSpace = q.mathAnswerSpace ? Math.max(15, q.mathAnswerSpace) : 40;

            // Space above division for student to write quotient
            paragraphs.push(
              new Paragraph({
                spacing: { before: pt(1), after: pt(16) },
                children: [new TextRun({ text: " " })],
              }),
              new Paragraph({
                spacing: { before: pt(1), after: pt(2) },
                children: [
                  new TextRun({
                    text: `${divisor} `,
                    bold: true,
                    size: fs(baseFontSize),
                  }),
                  new TextRun({
                    text: `) ${dividend}`,
                    bold: true,
                    size: fs(baseFontSize),
                    underline: { type: "single" },
                  }),
                ],
              })
            );

            // Working space gap
            paragraphs.push(
              new Paragraph({
                spacing: { before: pt(2), after: pt(gapSpace) },
                children: [new TextRun({ text: " " })],
              })
            );

            // Q = _____   R = _____ in 1 row
            if (hasQR) {
              paragraphs.push(
                new Paragraph({
                  spacing: { before: pt(1), after: pt(2) },
                  children: [
                    new TextRun({ text: "Q = ", bold: true, size: fs(baseFontSize - 0.5) }),
                    new TextRun({ text: "________", size: fs(baseFontSize - 0.5) }),
                    new TextRun({ text: "     ", size: fs(baseFontSize) }),
                    new TextRun({ text: "R = ", bold: true, size: fs(baseFontSize - 0.5) }),
                    new TextRun({ text: "________", size: fs(baseFontSize - 0.5) }),
                  ],
                })
              );
            }
          } else {
            operands.forEach((op, opIdx) => {
              const isLast = opIdx === last;
              paragraphs.push(
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: pt(0.5), after: pt(0.5) },
                  children: [
                    ...(isLast ? [new TextRun({ text: `${operation}  `, size: fs(baseFontSize) })] : []),
                    new TextRun({ text: op || "00", size: fs(baseFontSize) }),
                  ],
                })
              );
            });

            // Answer line rule
            paragraphs.push(
              new Paragraph({
                spacing: { before: pt(1), after: pt(q.mathAnswerSpace ? Math.max(10, q.mathAnswerSpace) : 14) },
                border: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                },
                children: [new TextRun({ text: " " })],
              })
            );
          }

          return new TableCell({
            borders: q.mathBorder
              ? {
                  top: BORDER_SINGLE,
                  bottom: BORDER_SINGLE,
                  left: BORDER_SINGLE,
                  right: BORDER_SINGLE,
                }
              : BORDER_NONE,
            margins: CELL_MARGIN_COMPACT,
            width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
            children: paragraphs,
          });
        });

        while (cells.length < mathCols) {
          cells.push(
            new TableCell({
              borders: BORDER_NONE,
              margins: CELL_MARGIN_COMPACT,
              width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: " " })] })],
            })
          );
        }

        mathRows.push(new TableRow({ children: cells }));
      }

      if (mathRows.length > 0) {
        children.push(
          new Table({
            width: { size: 95, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            rows: mathRows,
          })
        );
      }
    }

    // --- Table Question Type ---
    else if (q.type === "table" || (q.tableRows && q.tableRows.length > 0)) {
      const rowsData = q.tableRows || [];
      const tableRowsList: TableRow[] = [];
      const colCount = rowsData.length > 0 ? rowsData[0].length : 1;
      const colWidthPercent = Math.floor(100 / colCount);

      rowsData.forEach((row, rIdx) => {
        const isHeader = rIdx === 0 && q.tableHeaderRow !== false;
        const cells = row.map((cellText) => {
          const isBlank = !cellText.trim();
          const displayText = isBlank ? (q.tableBlankLine ? "____" : " ") : cellText;
          return new TableCell({
            borders: q.tableHideBorders ? BORDER_NONE : {
              top: BORDER_SINGLE,
              bottom: BORDER_SINGLE,
              left: BORDER_SINGLE,
              right: BORDER_SINGLE,
            },
            shading: isHeader ? { fill: "F3F4F6", type: ShadingType.CLEAR } : undefined,
            margins: { top: pt(3), bottom: pt(3), left: pt(4), right: pt(4) },
            width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: pt(1), after: pt(1) },
                children: [
                  textRun(displayText, {
                    bold: isHeader,
                    size: fs(baseFontSize - (isHeader ? 0 : 0.5)),
                  }),
                ],
              }),
            ],
          });
        });
        tableRowsList.push(new TableRow({ children: cells }));
      });

      if (tableRowsList.length > 0) {
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRowsList,
          })
        );
      }
    }

    // --- Word Problem Type ---
    else if (q.type === "word-problem") {
      const ansPfx = answerPrefixFor(language, settings.subject);
      items.forEach((item, ii) => {
        children.push(
          new Paragraph({
            spacing: { before: pt(itemGap), after: pt(2) },
            indent: { left: pt(8) },
            children: [
              new TextRun({ text: `${localizeNumber(ii + 1, language)}) `, bold: true, size: fs(baseFontSize) }),
              textRun(item.content, { size: fs(baseFontSize) }),
            ],
          })
        );

        if (q.wpOperationBox !== false) {
          const isRight = q.wpBoxPosition === "right";
          if (isRight) {
            // Problem text + answer line on left, working box on right
            children.push(
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        borders: BORDER_NONE,
                        margins: CELL_MARGIN_COMPACT,
                        width: { size: 65, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            spacing: { before: pt(2), after: pt(2) },
                            children: [
                              new TextRun({ text: `${ansPfx}: ____________________________________`, size: fs(baseFontSize - 0.5) }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        borders: {
                          top: BORDER_SINGLE,
                          bottom: BORDER_SINGLE,
                          left: BORDER_SINGLE,
                          right: BORDER_SINGLE,
                        },
                        margins: CELL_MARGIN_COMPACT,
                        width: { size: 35, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: pt(1), after: pt(25) },
                            children: [new TextRun({ text: "Working", italics: true, color: "777777", size: fs(baseFontSize - 2) })],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              })
            );
          } else {
            // Working box below
            children.push(
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        borders: {
                          top: BORDER_SINGLE,
                          bottom: BORDER_SINGLE,
                          left: BORDER_SINGLE,
                          right: BORDER_SINGLE,
                        },
                        margins: CELL_MARGIN_COMPACT,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: pt(1), after: pt(35) },
                            children: [new TextRun({ text: "Working", italics: true, color: "777777", size: fs(baseFontSize - 2) })],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              })
            );
            children.push(
              new Paragraph({
                spacing: { before: pt(2), after: pt(2) },
                indent: { left: pt(8) },
                children: [
                  new TextRun({ text: `${ansPfx}: __________________________________________________`, size: fs(baseFontSize - 0.5) }),
                ],
              })
            );
          }
        } else {
          children.push(
            new Paragraph({
              spacing: { before: pt(2), after: pt(2) },
              indent: { left: pt(8) },
              children: [
                new TextRun({ text: `${ansPfx}: __________________________________________________`, size: fs(baseFontSize - 0.5) }),
              ],
            })
          );
        }
      });
    }

    // --- Draw / Picture Composition ---
    else if (q.type === "draw" || q.type === "picture-composition") {
      const drawItems = items.length > 0 ? items : [{ id: "draw_single", content: "" }];
      const boxH = pt(q.boxHeight || 100);
      const wLines = q.writingLines ?? 0;

      drawItems.forEach((item, ii) => {
        if (item.content?.trim()) {
          children.push(
            new Paragraph({
              spacing: { before: pt(2), after: pt(1.5) },
              indent: { left: pt(8) },
              children: [
                new TextRun({
                  text: `${localizeNumber(ii + 1, language)}) `,
                  bold: true,
                  size: fs(baseFontSize),
                }),
                textRun(item.content, { size: fs(baseFontSize) }),
              ],
            })
          );
        }

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                height: { value: boxH, rule: "atLeast" as any },
                children: [
                  new TableCell({
                    borders: {
                      top: BORDER_SINGLE,
                      bottom: BORDER_SINGLE,
                      left: BORDER_SINGLE,
                      right: BORDER_SINGLE,
                    },
                    margins: CELL_MARGIN_COMPACT,
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: " " })] })],
                  }),
                ],
              }),
            ],
          })
        );

        if (wLines > 0) {
          for (let l = 0; l < wLines; l++) {
            children.push(
              new Paragraph({
                spacing: { before: pt(2), after: pt(1.5) },
                indent: { left: pt(8) },
                children: [
                  new TextRun({
                    text: "__________________________________________________________________",
                    color: "777777",
                    size: fs(baseFontSize - 1),
                  }),
                ],
              })
            );
          }
        }
      });
    }

    // --- Odd One Out ---
    else if (q.type === "odd-one-out") {
      items.forEach((item, ii) => {
        const opts = item.options || [];
        children.push(
          new Paragraph({
            spacing: { before: pt(1.5), after: pt(1.5) },
            indent: { left: pt(8) },
            children: [
              new TextRun({ text: `${localizeNumber(ii + 1, language)}) `, bold: true, size: fs(baseFontSize) }),
              textRun(item.content ? `${item.content}: ` : "", { size: fs(baseFontSize) }),
              ...opts.map((opt, oi) => textRun(`${opt}        `, { size: fs(baseFontSize) })),
            ],
          })
        );
      });
    }

    // --- Short Answer & Long Answer (Default / Multi-Column) ---
    else {
      const colCount = cols;
      const colWidthPercent = Math.floor(100 / colCount);

      if (colCount > 1 && items.length >= 2) {
        // Multi-column table layout
        const rowsList: TableRow[] = [];
        for (let i = 0; i < items.length; i += colCount) {
          const cells: TableCell[] = [];
          for (let c = 0; c < colCount; c++) {
            const idx = i + c;
            const item = items[idx];
            if (item) {
              const cellParagraphs: Paragraph[] = [];
              const itemNum = `${localizeNumber(idx + 1, language)}) `;
              const cleanContent = item.content?.trim();

              // Division with Quotient and Remainder
              const divMatch = cleanContent.match(/(\d+)\s*(?:÷|\/)\s*(\d+)/);
              const hasQR = /q\s*=\s*.*r\s*=/i.test(cleanContent);

              if (divMatch && hasQR) {
                const dividend = divMatch[1];
                const divisor = divMatch[2];
                cellParagraphs.push(
                  new Paragraph({
                    spacing: { before: pt(1), after: pt(16) },
                    children: [new TextRun({ text: " " })],
                  }),
                  new Paragraph({
                    spacing: { before: pt(1), after: pt(2) },
                    children: [
                      new TextRun({ text: itemNum, bold: true, size: fs(baseFontSize) }),
                      new TextRun({ text: `${divisor} `, bold: true, size: fs(baseFontSize) }),
                      new TextRun({ text: `) ${dividend}`, bold: true, size: fs(baseFontSize), underline: { type: "single" } }),
                    ],
                  }),
                  new Paragraph({
                    spacing: { before: pt(2), after: pt(35) },
                    children: [new TextRun({ text: " " })],
                  }),
                  new Paragraph({
                    spacing: { before: pt(1), after: pt(2) },
                    children: [
                      new TextRun({ text: "Q = ________    R = ________", bold: true, size: fs(baseFontSize - 0.5) }),
                    ],
                  })
                );
              } else if (item.image) {
                const imgInfo = parseBase64Image(item.image, 80, 80);
                if (cleanContent) {
                  cellParagraphs.push(
                    new Paragraph({
                      spacing: { before: pt(1), after: pt(2) },
                      children: [
                        new TextRun({ text: itemNum, bold: true, size: fs(baseFontSize) }),
                        textRun(cleanContent, { size: fs(baseFontSize) }),
                      ],
                    })
                  );
                }
                if (imgInfo) {
                  cellParagraphs.push(
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: pt(2), after: pt(2) },
                      children: [
                        new ImageRun({
                          type: imgInfo.type,
                          data: imgInfo.data,
                          transformation: imgInfo.transformation,
                          fallback: imgInfo.fallback,
                        } as any),
                      ],
                    })
                  );
                }
                // Underline below image for student to write answer
                cellParagraphs.push(
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: pt(2), after: pt(4) },
                    children: [
                      ...(!cleanContent ? [new TextRun({ text: itemNum + " ", bold: true, size: fs(baseFontSize) })] : []),
                      new TextRun({ text: "____________________", size: fs(baseFontSize) }),
                    ],
                  })
                );
              } else {
                cellParagraphs.push(
                  new Paragraph({
                    spacing: { before: pt(1), after: pt(2) },
                    children: [
                      new TextRun({ text: itemNum, bold: true, size: fs(baseFontSize) }),
                      textRun(cleanContent || "________", { size: fs(baseFontSize) }),
                    ],
                  })
                );
              }

              cells.push(
                new TableCell({
                  borders: BORDER_NONE,
                  margins: CELL_MARGIN_COMPACT,
                  width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
                  children: cellParagraphs,
                })
              );
            } else {
              cells.push(
                new TableCell({
                  borders: BORDER_NONE,
                  margins: CELL_MARGIN_COMPACT,
                  width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: " " })] })],
                })
              );
            }
          }
          rowsList.push(new TableRow({ children: cells }));
        }

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            rows: rowsList,
          })
        );
      } else {
        // Single column vertical layout
        items.forEach((item, ii) => {
          const cleanContent = item.content?.trim();
          const divMatch = cleanContent.match(/(\d+)\s*(?:÷|\/)\s*(\d+)/);
          const hasQR = /q\s*=\s*.*r\s*=/i.test(cleanContent);

          if (divMatch && hasQR) {
            const dividend = divMatch[1];
            const divisor = divMatch[2];
            children.push(
              new Paragraph({
                spacing: { before: pt(2), after: pt(16) },
                children: [new TextRun({ text: " " })],
              }),
              new Paragraph({
                spacing: { before: pt(2), after: pt(2) },
                indent: { left: pt(8) },
                children: [
                  new TextRun({ text: `${localizeNumber(ii + 1, language)}) `, bold: true, size: fs(baseFontSize) }),
                  new TextRun({ text: `${divisor} `, bold: true, size: fs(baseFontSize) }),
                  new TextRun({ text: `) ${dividend}`, bold: true, size: fs(baseFontSize), underline: { type: "single" } }),
                ],
              }),
              new Paragraph({
                spacing: { before: pt(2), after: pt(35) },
                children: [new TextRun({ text: " " })],
              }),
              new Paragraph({
                spacing: { before: pt(1), after: pt(2) },
                indent: { left: pt(14) },
                children: [
                  new TextRun({ text: "Q = ________    R = ________", bold: true, size: fs(baseFontSize - 0.5) }),
                ],
              })
            );
            return;
          }

          if (!cleanContent && item.image) {
            const imgInfo = parseBase64Image(item.image, 140, 90);
            if (imgInfo) {
              children.push(
                new Paragraph({
                  indent: { left: pt(18) },
                  spacing: { before: pt(2), after: pt(2) },
                  children: [
                    new ImageRun({
                      type: imgInfo.type,
                      data: imgInfo.data,
                      transformation: imgInfo.transformation,
                      fallback: imgInfo.fallback,
                    } as any),
                  ],
                })
              );
            }
            children.push(
              new Paragraph({
                spacing: { before: pt(2), after: pt(4) },
                indent: { left: pt(18) },
                children: [
                  new TextRun({
                    text: `${localizeNumber(ii + 1, language)}) `,
                    bold: true,
                    size: fs(baseFontSize),
                  }),
                  new TextRun({
                    text: "________________________",
                    size: fs(baseFontSize),
                  }),
                ],
              })
            );
            return;
          }

          const numLines = item.lines === 0 ? 0 : (item.lines ?? (q.type === "long-answer" ? 3 : 1));
          children.push(
            new Paragraph({
              spacing: { before: pt(2), after: pt(1.5) },
              indent: { left: pt(8) },
              children: [
                new TextRun({
                  text: `${localizeNumber(ii + 1, language)}) `,
                  bold: true,
                  size: fs(baseFontSize),
                }),
                textRun(cleanContent || "", { size: fs(baseFontSize) }),
              ],
            })
          );

          if (item.image) {
            const imgInfo = parseBase64Image(item.image, 140, 90);
            if (imgInfo) {
              children.push(
                new Paragraph({
                  indent: { left: pt(18) },
                  spacing: { before: pt(2), after: pt(2) },
                  children: [
                    new ImageRun({
                      type: imgInfo.type,
                      data: imgInfo.data,
                      transformation: imgInfo.transformation,
                      fallback: imgInfo.fallback,
                    } as any),
                  ],
                })
              );
            }
          }

          const hasEmbeddedBlanks = /_{2,}/.test(cleanContent);
          const showAnswerSpaceBelow =
            settings.showAnswerSpace !== false &&
            numLines > 0 &&
            (!hasEmbeddedBlanks || (item.lines != null && item.lines > 1));

          if (showAnswerSpaceBelow) {
            const ansPfx = answerPrefixFor(language, settings.subject);
            for (let l = 0; l < numLines; l++) {
              children.push(
                new Paragraph({
                  spacing: { after: pt(1.5) },
                  indent: { left: pt(18) },
                  children: [
                    new TextRun({
                      text: l === 0 ? `${ansPfx} ➡ __________________________________________________________________` : "        __________________________________________________________________",
                      color: "555555",
                      size: fs(baseFontSize - 1),
                    }),
                  ],
                })
              );
            }
          }
        });
      }
    }

    children.push(new Paragraph({ spacing: { after: pt(2) } }));
  }

  // ==========================================
  // 4. ANSWER KEY
  // ==========================================
  if (settings.answerKey) {
    children.push(
      new Paragraph({
        pageBreakBefore: true,
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: "000000" } },
        spacing: { before: pt(8), after: pt(6) },
        children: [
          new TextRun({
            text: copy.answerKeyTitle || "Answer Key",
            bold: true,
            size: fs(baseFontSize + 2),
          }),
        ],
      })
    );

    let keyQNum = 0;
    for (const q of questions) {
      if (isStructuralQuestion(q)) continue;
      keyQNum++;
      if (q.answerNote?.trim()) {
        children.push(
          new Paragraph({
            spacing: { after: pt(2) },
            indent: { left: pt(8) },
            children: [
              new TextRun({
                text: `Q.${localizeNumber(keyQNum, language)}: `,
                bold: true,
                size: fs(baseFontSize),
              }),
              new TextRun({
                text: q.answerNote.trim(),
                size: fs(baseFontSize),
              }),
            ],
          })
        );
      }
      (q.items || []).forEach((item, ii) => {
        if (!item.answer?.trim()) return;
        const letter = String.fromCharCode(97 + ii);
        children.push(
          new Paragraph({
            spacing: { after: pt(1.5) },
            indent: { left: pt(12) },
            children: [
              new TextRun({
                text: `${localizeNumber(keyQNum, language)}${letter}) `,
                bold: true,
                size: fs(baseFontSize),
              }),
              new TextRun({
                text: item.answer.trim(),
                size: fs(baseFontSize),
              }),
            ],
          })
        );
      });
    }
  }

  // Create Document with margins matching settings
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: pt(topMarginPt),
              bottom: pt(bottomMarginPt),
              left: pt(sideMarginPt),
              right: pt(sideMarginPt),
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
