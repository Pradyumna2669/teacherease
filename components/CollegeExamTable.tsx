"use client";

import React from "react";
import type { PaperSettings, Question } from "@/lib/types";

interface Props {
  settings: PaperSettings;
  questions: Question[];
  watermark?: boolean;
}

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];

const pad2 = (v: unknown) => {
  if (v == null || v === "") return "";
  const num = Number(v);
  return Number.isFinite(num) ? String(num).padStart(2, "0") : String(v);
};

export default function CollegeExamTable({ settings, questions, watermark = false }: Props) {
  const collegeName = settings.schoolName || "Autonomous Institute of Engineering & Technology";
  const affiliation = settings.schoolSubtitle || "(An Autonomous Institute Affiliated to State University)";
  const program = settings.program || settings.className || "B. Tech. Computer Science & Engineering";
  const session = settings.academicYear || "Academic Session 2025-2026";
  const variant = settings.variant === "backlog" ? "Backlog Examination" : "Regular Examination";
  const courseName = settings.subject || "Subject Course";
  const courseCode = settings.courseCode || "CS201BSC03";
  const maxMarks = settings.totalMarks || 60;
  const time =
    settings.timeAllowed && settings.timeAllowed !== "1 hr"
      ? settings.timeAllowed
      : maxMarks === 60
      ? "1.5 hrs"
      : settings.timeAllowed || "3 Hours";

  const defaultInstructions = [
    "All questions are compulsory unless specified otherwise.",
    "Assume suitable data wherever necessary and clearly state the assumptions made.",
    "Diagrams/sketches should be given wherever necessary.",
    "Use of programmable calculator is not permitted.",
  ];

  const instructions =
    settings.instructions && settings.instructions.length > 0
      ? settings.instructions.filter((i) => i.trim())
      : defaultInstructions;

  return (
    <div
      className="college-paper-root font-serif text-black leading-normal"
      style={{
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: "12pt",
        color: "#000",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* College / University Header */}
      <div
        className="text-center space-y-1 mb-4 pb-3"
        style={{ borderBottom: "2px solid #000" }}
      >
        <h1 className="text-xl font-bold uppercase tracking-tight">{collegeName}</h1>
        <p className="text-xs italic text-gray-800">{affiliation}</p>
        <div className="text-sm font-semibold pt-1">
          <span>{program}</span>
          <span className="mx-2">—</span>
          <span className="font-bold underline">{variant}</span>
        </div>
        <p className="text-xs font-medium text-gray-700">{session}</p>
      </div>

      {/* Course & Exam Meta Table */}
      <table
        className="w-full text-xs font-semibold"
        style={{
          borderCollapse: "separate",
          borderSpacing: 0,
          width: "100%",
          marginBottom: "4px",
        }}
      >
        <tbody>
          <tr>
            <td style={{ padding: "3px 0", textAlign: "left", verticalAlign: "middle" }}>
              Course Name: <span className="font-normal">{courseName}</span>
            </td>
            <td style={{ padding: "3px 0", textAlign: "right", verticalAlign: "middle" }}>
              Course Code: <span className="font-normal font-mono">{courseCode}</span>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0", textAlign: "left", verticalAlign: "middle" }}>
              Time Allowed: <span className="font-normal">{time}</span>
            </td>
            <td style={{ padding: "3px 0", textAlign: "right", verticalAlign: "middle" }}>
              Maximum Marks: <span className="font-normal">{maxMarks}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Dedicated Divider Line below Meta Table — isolated from table rows to eliminate overlap */}
      <div
        style={{
          borderBottom: "1px solid #000",
          width: "100%",
          marginTop: "4px",
          marginBottom: "12px",
        }}
      />

      {/* Instructions to Candidates */}
      <div className="mb-4 text-xs" style={{ marginBottom: "14px" }}>
        <span className="font-bold block mb-1">Instructions to Candidates:</span>
        <ol className="list-decimal list-inside space-y-0.5 text-gray-900 pl-1">
          {instructions.map((line, idx) => (
            <li key={idx} style={{ lineHeight: "1.45" }}>{line}</li>
          ))}
        </ol>
      </div>

      {/* Examination Table — NO horizontal lines between rows, clean separated header border */}
      <table
        className="w-full text-xs font-serif"
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                width: "9%",
                borderTop: "2px solid #000",
                borderBottom: "2px solid #000",
                padding: "6px 8px",
                textAlign: "left",
                fontWeight: "bold",
                color: "#000",
                lineHeight: "1.4",
                verticalAlign: "middle",
                boxSizing: "border-box",
              }}
            >
              Q. No
            </th>
            <th
              style={{
                width: "67%",
                borderTop: "2px solid #000",
                borderBottom: "2px solid #000",
                padding: "6px 8px",
                textAlign: "left",
                fontWeight: "bold",
                color: "#000",
                lineHeight: "1.4",
                verticalAlign: "middle",
                boxSizing: "border-box",
              }}
            >
              Question Statement &amp; Diagram
            </th>
            <th
              style={{
                width: "8%",
                borderTop: "2px solid #000",
                borderBottom: "2px solid #000",
                padding: "6px 8px",
                textAlign: "center",
                fontWeight: "bold",
                color: "#000",
                lineHeight: "1.4",
                verticalAlign: "middle",
                boxSizing: "border-box",
              }}
            >
              Marks
            </th>
            <th
              style={{
                width: "8%",
                borderTop: "2px solid #000",
                borderBottom: "2px solid #000",
                padding: "6px 8px",
                textAlign: "center",
                fontWeight: "bold",
                color: "#000",
                lineHeight: "1.4",
                verticalAlign: "middle",
                boxSizing: "border-box",
              }}
            >
              BTL
            </th>
            <th
              style={{
                width: "8%",
                borderTop: "2px solid #000",
                borderBottom: "2px solid #000",
                padding: "6px 8px",
                textAlign: "center",
                fontWeight: "bold",
                color: "#000",
                lineHeight: "1.4",
                verticalAlign: "middle",
                boxSizing: "border-box",
              }}
            >
              CO
            </th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q, qIdx) => {
            const hasSubItems = q.items && q.items.length > 0;
            const isGroup = q.part || (q.title && q.title.toLowerCase().includes("solve"));

            return (
              <React.Fragment key={q.id || qIdx}>
                {/* Group Heading Row (Q1 A), Q1 B), etc.) — no horizontal border */}
                {isGroup ? (
                  <tr className="pp-row">
                    <td
                      style={{
                        paddingTop: "10px",
                        paddingBottom: "4px",
                        paddingLeft: "8px",
                        paddingRight: "8px",
                        verticalAlign: "top",
                        whiteSpace: "nowrap",
                        fontWeight: "bold",
                        textAlign: "left",
                        color: "#000",
                      }}
                    >
                      Q{q.q_no ?? qIdx + 1} {q.part ? `${q.part})` : ""}
                    </td>
                    <td
                      colSpan={4}
                      style={{
                        paddingTop: "10px",
                        paddingBottom: "4px",
                        paddingLeft: "8px",
                        paddingRight: "8px",
                        verticalAlign: "top",
                        fontWeight: "bold",
                        color: "#000",
                      }}
                    >
                      {q.title}
                    </td>
                  </tr>
                ) : null}

                {/* Question sub-items — NO horizontal lines, Roman numerals under Q. No */}
                {hasSubItems ? (
                  q.items.map((sub, sIdx) => {
                    const itemBt = (sub as any).bt_level ?? q.bt_level;
                    const itemCo = (sub as any).co_no ?? q.co_no;
                    const itemMarks = sub.marks ?? q.marks;
                    const imgUrl = (sub as any).image_url || q.image_url;

                    return (
                      <tr key={sub.id || sIdx} className="pp-row">
                        <td
                          style={{
                            paddingTop: "4px",
                            paddingBottom: "4px",
                            paddingLeft: "8px",
                            paddingRight: "8px",
                            verticalAlign: "top",
                            textAlign: "center",
                            color: "#000",
                          }}
                        >
                          {isGroup ? `${ROMAN[sIdx] || sIdx + 1})` : `Q${qIdx + 1}`}
                        </td>
                        <td
                          style={{
                            paddingTop: "4px",
                            paddingBottom: "4px",
                            paddingLeft: "8px",
                            paddingRight: "8px",
                            verticalAlign: "top",
                            color: "#000",
                            lineHeight: "1.5",
                            wordBreak: "break-word",
                          }}
                        >
                          <div>{sub.content || q.title}</div>
                          {imgUrl && (
                            <div style={{ marginTop: "6px", marginBottom: "4px" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imgUrl}
                                alt="Question Diagram"
                                style={{
                                  maxWidth: "360px",
                                  height: "auto",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  padding: "4px",
                                  backgroundColor: "#fff",
                                  display: "block",
                                }}
                              />
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            paddingTop: "4px",
                            paddingBottom: "4px",
                            paddingLeft: "8px",
                            paddingRight: "8px",
                            verticalAlign: "top",
                            textAlign: "center",
                            fontWeight: 500,
                            color: "#000",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pad2(itemMarks)}
                        </td>
                        <td
                          style={{
                            paddingTop: "4px",
                            paddingBottom: "4px",
                            paddingLeft: "8px",
                            paddingRight: "8px",
                            verticalAlign: "top",
                            textAlign: "center",
                            color: "#000",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pad2(itemBt)}
                        </td>
                        <td
                          style={{
                            paddingTop: "4px",
                            paddingBottom: "4px",
                            paddingLeft: "8px",
                            paddingRight: "8px",
                            verticalAlign: "top",
                            textAlign: "center",
                            color: "#000",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pad2(itemCo)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="pp-row">
                    <td
                      style={{
                        paddingTop: "4px",
                        paddingBottom: "4px",
                        paddingLeft: "8px",
                        paddingRight: "8px",
                        verticalAlign: "top",
                        fontWeight: "bold",
                        textAlign: "left",
                        color: "#000",
                      }}
                    >
                      Q{q.q_no ?? qIdx + 1}
                    </td>
                    <td
                      style={{
                        paddingTop: "4px",
                        paddingBottom: "4px",
                        paddingLeft: "8px",
                        paddingRight: "8px",
                        verticalAlign: "top",
                        color: "#000",
                        lineHeight: "1.5",
                        wordBreak: "break-word",
                      }}
                    >
                      <div>{q.title}</div>
                      {q.image_url && (
                        <div style={{ marginTop: "6px", marginBottom: "4px" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={q.image_url}
                            alt="Question Diagram"
                            style={{
                              maxWidth: "360px",
                              height: "auto",
                              border: "1px solid #d1d5db",
                              borderRadius: "4px",
                              padding: "4px",
                              backgroundColor: "#fff",
                              display: "block",
                            }}
                          />
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        paddingTop: "4px",
                        paddingBottom: "4px",
                        paddingLeft: "8px",
                        paddingRight: "8px",
                        verticalAlign: "top",
                        textAlign: "center",
                        fontWeight: 500,
                        color: "#000",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pad2(q.marks)}
                    </td>
                    <td
                      style={{
                        paddingTop: "4px",
                        paddingBottom: "4px",
                        paddingLeft: "8px",
                        paddingRight: "8px",
                        verticalAlign: "top",
                        textAlign: "center",
                        color: "#000",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pad2(q.bt_level)}
                    </td>
                    <td
                      style={{
                        paddingTop: "4px",
                        paddingBottom: "4px",
                        paddingLeft: "8px",
                        paddingRight: "8px",
                        verticalAlign: "top",
                        textAlign: "center",
                        color: "#000",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pad2(q.co_no)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* End of Question Paper Signoff */}
      <div
        className="text-center font-serif text-xs font-semibold mt-8 pt-4"
        style={{ borderTop: "1px solid #000" }}
      >
        *** END OF QUESTION PAPER ***
      </div>
    </div>
  );
}
