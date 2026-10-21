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
  const time = settings.timeAllowed || "3 Hours";
  const maxMarks = settings.totalMarks || 60;

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
      }}
    >
      {/* College / University Header */}
      <div className="text-center space-y-1 mb-4 pb-3 border-b-2 border-black">
        <h1 className="text-xl font-bold uppercase tracking-tight">{collegeName}</h1>
        <p className="text-xs italic text-gray-800">{affiliation}</p>
        <div className="text-sm font-semibold pt-1">
          <span>{program}</span>
          <span className="mx-2">·</span>
          <span className="font-bold underline">{variant}</span>
        </div>
        <p className="text-xs font-medium text-gray-700">{session}</p>
      </div>

      {/* Course & Exam Meta Table */}
      <table className="w-full text-xs font-semibold mb-3 border-b border-black pb-2">
        <tbody>
          <tr>
            <td className="py-0.5 text-left">Course Name: <span className="font-normal">{courseName}</span></td>
            <td className="py-0.5 text-right">Course Code: <span className="font-normal font-mono">{courseCode}</span></td>
          </tr>
          <tr>
            <td className="py-0.5 text-left">Time Allowed: <span className="font-normal">{time}</span></td>
            <td className="py-0.5 text-right">Maximum Marks: <span className="font-normal">{maxMarks}</span></td>
          </tr>
        </tbody>
      </table>

      {/* Instructions to Candidate */}
      <div className="mb-4 text-xs">
        <span className="font-bold block mb-1">Instructions to Candidates:</span>
        <ol className="list-decimal list-inside space-y-0.5 text-gray-900 pl-1">
          {instructions.map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ol>
      </div>

      {/* Examination Table */}
      <table className="w-full border-collapse text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr className="border-t-2 border-b-2 border-black font-bold">
            <th className="py-1 px-2 text-left" style={{ width: "9%" }}>Q. No</th>
            <th className="py-1 px-2 text-left" style={{ width: "67%" }}>Question Statement & Diagram</th>
            <th className="py-1 px-2 text-center" style={{ width: "8%" }}>Marks</th>
            <th className="py-1 px-2 text-center" style={{ width: "8%" }}>BTL</th>
            <th className="py-1 px-2 text-center" style={{ width: "8%" }}>CO</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q, qIdx) => {
            const hasSubItems = q.items && q.items.length > 0;
            const isGroup = q.part || (q.title && q.title.toLowerCase().includes("solve"));

            return (
              <React.Fragment key={q.id || qIdx}>
                {/* Group Heading Row if applicable */}
                {isGroup ? (
                  <tr className="border-t border-gray-300 font-bold bg-gray-50/50">
                    <td className="py-1 px-2 align-top whitespace-nowrap">
                      Q{q.q_no ?? qIdx + 1} {q.part ? `${q.part})` : ""}
                    </td>
                    <td className="py-1 px-2 align-top" colSpan={4}>
                      {q.title}
                    </td>
                  </tr>
                ) : null}

                {/* Question items */}
                {hasSubItems ? (
                  q.items.map((sub, sIdx) => {
                    const itemBt = (sub as any).bt_level ?? q.bt_level;
                    const itemCo = (sub as any).co_no ?? q.co_no;
                    const itemMarks = sub.marks ?? q.marks;
                    const imgUrl = (sub as any).image_url || q.image_url;

                    return (
                      <tr key={sub.id || sIdx} className="border-b border-gray-200">
                        <td className="py-1.5 px-2 align-top text-center text-gray-500 font-mono">
                          {isGroup ? "" : `Q${qIdx + 1}`}
                        </td>
                        <td className="py-1.5 px-2 align-top" style={{ paddingLeft: isGroup ? "24px" : "8px" }}>
                          <div className="flex items-start gap-1.5">
                            {isGroup && (
                              <span className="font-semibold">{ROMAN[sIdx] || sIdx + 1})</span>
                            )}
                            <div className="flex-1">
                              <span>{sub.content || q.title}</span>
                              {imgUrl && (
                                <div className="mt-2 mb-1">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={imgUrl}
                                    alt="Question Diagram"
                                    className="max-w-[360px] h-auto border border-gray-300 rounded p-1 bg-white"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 align-top text-center font-mono font-medium">
                          {pad2(itemMarks)}
                        </td>
                        <td className="py-1.5 px-2 align-top text-center font-mono">
                          {pad2(itemBt)}
                        </td>
                        <td className="py-1.5 px-2 align-top text-center font-mono">
                          {pad2(itemCo)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="border-b border-gray-200">
                    <td className="py-1.5 px-2 align-top font-bold">Q{q.q_no ?? qIdx + 1}</td>
                    <td className="py-1.5 px-2 align-top">
                      <div>{q.title}</div>
                      {q.image_url && (
                        <div className="mt-2 mb-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={q.image_url}
                            alt="Question Diagram"
                            className="max-w-[360px] h-auto border border-gray-300 rounded p-1 bg-white"
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 align-top text-center font-mono font-medium">{pad2(q.marks)}</td>
                    <td className="py-1.5 px-2 align-top text-center font-mono">{pad2(q.bt_level)}</td>
                    <td className="py-1.5 px-2 align-top text-center font-mono">{pad2(q.co_no)}</td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* End of Question Paper Signoff */}
      <div className="text-center font-serif text-xs font-semibold mt-8 pt-4 border-t border-black">
        *** END OF QUESTION PAPER ***
      </div>
    </div>
  );
}
