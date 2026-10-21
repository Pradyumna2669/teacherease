import PDFDocument from "pdfkit";
import { type Question } from "@/lib/types";

export interface GeneratePaperPdfOptions {
  title: string;
  instituteName?: string;
  className?: string;
  subject?: string;
  timeAllowed?: string;
  maxMarks?: number;
  generalInstructions?: string[];
  questions: Question[];
}

export function generatePaperPdfBuffer(options: GeneratePaperPdfOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 36, bottom: 36, left: 40, right: 40 },
        info: {
          Title: options.title,
          Author: "TeacherEase (WhatsApp Bot)",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Header: School / Institute Name
      if (options.instituteName) {
        doc.font("Helvetica-Bold").fontSize(15).text(options.instituteName.toUpperCase(), {
          align: "center",
        });
        doc.moveDown(0.2);
      }

      // Title (e.g. Periodic Test / Final Exam)
      doc.font("Helvetica-Bold").fontSize(13).text(options.title, {
        align: "center",
      });
      doc.moveDown(0.3);

      // Metadata line: Class & Subject
      const metaLeft = [
        options.className ? `Class: ${options.className}` : "",
        options.subject ? `Subject: ${options.subject}` : "",
      ]
        .filter(Boolean)
        .join("   |   ");

      // Metadata right: Time & Max Marks
      const metaRight = [
        options.timeAllowed ? `Time: ${options.timeAllowed}` : "",
        options.maxMarks ? `Max Marks: ${options.maxMarks}` : "",
      ]
        .filter(Boolean)
        .join("   |   ");

      const topY = doc.y;
      if (metaLeft || metaRight) {
        doc.font("Helvetica-Bold").fontSize(10);
        if (metaLeft) {
          doc.text(metaLeft, 40, topY, { align: "left" });
        }
        if (metaRight) {
          doc.text(metaRight, 40, topY, { align: "right" });
        }
        doc.moveDown(0.5);
      }

      // Horizontal separator line
      doc
        .moveTo(40, doc.y + 4)
        .lineTo(555, doc.y + 4)
        .strokeColor("#333333")
        .lineWidth(1)
        .stroke();
      doc.moveDown(0.8);

      // General Instructions
      if (options.generalInstructions && options.generalInstructions.length > 0) {
        doc.font("Helvetica-Bold").fontSize(9).text("General Instructions:");
        doc.font("Helvetica").fontSize(8.5);
        options.generalInstructions.forEach((inst, idx) => {
          doc.text(`${idx + 1}. ${inst}`, { indent: 10 });
        });
        doc.moveDown(0.5);
        doc
          .moveTo(40, doc.y + 2)
          .lineTo(555, doc.y + 2)
          .strokeColor("#cccccc")
          .lineWidth(0.5)
          .stroke();
        doc.moveDown(0.8);
      }

      // Questions List
      doc.font("Helvetica").fontSize(10);
      options.questions.forEach((q, idx) => {
        // If question nears page bottom, add new page
        if (doc.y > 750) {
          doc.addPage();
        }

        const qNumber = `Q${idx + 1}. `;
        const marksText = q.marks ? ` [${q.marks} Mark${q.marks > 1 ? "s" : ""}]` : "";

        // Question title line
        doc.font("Helvetica-Bold").text(qNumber, { continued: true });
        doc.font("Helvetica").text(q.title || "Question", { continued: !!marksText });
        if (marksText) {
          doc.font("Helvetica-Bold").text(marksText, { align: "right" });
        } else {
          doc.text("");
        }

        // Sub items (e.g. sub-questions or options)
        if (q.items && q.items.length > 0) {
          doc.moveDown(0.2);
          q.items.forEach((item, itemIdx) => {
            if (doc.y > 750) doc.addPage();

            const itemLabel = `(${String.fromCharCode(97 + itemIdx)}) `;
            doc.font("Helvetica").fontSize(9.5).text(`${itemLabel}${item.content || ""}`, {
              indent: 15,
            });

            // Multiple Choice Options under this item
            if (item.options && item.options.length > 0) {
              const optLetters = ["A", "B", "C", "D", "E", "F"];
              item.options.forEach((opt: string, optIdx: number) => {
                const optLetter = optLetters[optIdx] || `(${optIdx + 1})`;
                doc.font("Helvetica").fontSize(9).text(`(${optLetter}) ${opt}`, {
                  indent: 30,
                });
              });
            }
          });
        }

        // Match type
        if (q.type === "match" && q.matchLeft && q.matchRight) {
          doc.moveDown(0.3);
          const maxRows = Math.max(q.matchLeft.length, q.matchRight.length);
          for (let r = 0; r < maxRows; r++) {
            const left = q.matchLeft[r] || "";
            const right = q.matchRight[r] || "";
            const leftLabel = `${r + 1}. ${left}`;
            const rightLabel = `(${String.fromCharCode(65 + r)}) ${right}`;
            doc.font("Helvetica").fontSize(9).text(`${leftLabel.padEnd(35)}      ${rightLabel}`, {
              indent: 20,
            });
          }
        }

        doc.moveDown(0.6);
      });

      // Footer notice
      doc.moveDown(1);
      doc
        .font("Helvetica-Oblique")
        .fontSize(8)
        .fillColor("#777777")
        .text("Generated automatically via TeacherEase AI Assistant on WhatsApp", {
          align: "center",
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
