import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Header shown on every paper. Edit these defaults (or later move to a settings
// table / per-cycle fields). total_marks & course come from the DB.
const HEADER = {
  college: 'P. R. Pote Patil College of Engineering and Management, Amravati',
  affiliation:
    '(An Autonomous Institute Affiliated to Sant Gadge Baba Amravati University, Amravati)',
  program: 'Second Semester B. Tech. (CS/AI/ML) – Regular',
  session: 'Summer – 2026',
  time: '3 Hrs',
  instructions: [
    'All questions are compulsory.',
    'Assume suitable data wherever necessary and clearly state the assumptions made.',
    'Diagrams/sketches should be given wherever necessary.',
    'Use of Calculator is permitted.',
  ],
};

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pad2 = (v) => (v == null || v === '' ? '' : String(v).padStart(2, '0'));

// Build the full paper as a single styled HTML string. This is the ONE source
// of truth: Word saves it directly, and the off-screen node renders it for the
// PDF/image snapshots — so all three exports match exactly.
function buildPaperHtml(paper, groups) {
  // borderless: only cell padding + alignment, no grid lines
  const cQ = 'padding:2px 4px;vertical-align:top;';
  const cN = 'padding:2px 4px;vertical-align:top;text-align:center;white-space:nowrap;';
  const num = (v) => `<td style="${cN}">${pad2(v)}</td>`;
  const blank = '<td></td>';
  // sub-questions i) ii) iii) with Marks/BTL/CO cells
  const items = (arr) =>
    arr
      .map(
        (r, i) =>
          `<tr>${blank}<td style="${cQ}padding-left:22px;">${ROMAN[i]}) ${esc(r.questions?.text)}</td>` +
          `${num(r.marks)}${num(r.questions?.bt_level)}${num(r.questions?.co_no)}</tr>`
      )
      .join('');

  const rows = groups
    .map(
      (g) =>
        // Part A — compulsory
        `<tr><td style="${cQ}font-weight:bold;white-space:nowrap;">Q${g.q_no} A)</td>` +
        `<td style="${cQ}font-weight:bold;">Solve the following questions.</td>${blank}${blank}${blank}</tr>` +
        items(g.A) +
        // Part B — answer any two
        `<tr><td style="${cQ}font-weight:bold;white-space:nowrap;">${g.q_no} B)</td>` +
        `<td style="${cQ}font-weight:bold;">Solve any two of the following.</td>${blank}${blank}${blank}</tr>` +
        items(g.B)
    )
    .join('');

  const instr = HEADER.instructions
    .map((t, i) => `<div>${i + 1}) ${esc(t)}</div>`)
    .join('');

  const hRule = 'border-bottom:1px solid #000;';
  return `
  <div style="font-family:'Times New Roman',serif;color:#000;font-size:13px;line-height:1.35;">
    <div style="text-align:center;">
      <div style="font-weight:bold;font-size:16px;">${esc(HEADER.college)}</div>
      <div style="font-size:11px;">${esc(HEADER.affiliation)}</div>
      <div style="margin-top:6px;font-weight:bold;">${esc(HEADER.program)}</div>
      <div>${esc(HEADER.session)}</div>
    </div>
    <table style="width:100%;margin-top:8px;">
      <tr><td>Course Name: ${esc(paper.subjects?.name)}</td>
          <td style="text-align:right;">Course Code: ${esc(paper.subjects?.code)}</td></tr>
      <tr><td>Time: ${esc(HEADER.time)}</td>
          <td style="text-align:right;">Max. Marks: ${paper.total_marks}</td></tr>
    </table>
    <div style="margin:6px 0;"><b>Instructions to Candidate</b>${instr}</div>
    <table style="width:100%;border-collapse:collapse;margin-top:6px;">
      <thead><tr>
        <th style="${hRule}padding:2px 4px;text-align:left;width:8%;">Q. No</th>
        <th style="${hRule}padding:2px 4px;text-align:left;">Question</th>
        <th style="${hRule}padding:2px 4px;width:9%;">Marks</th>
        <th style="${hRule}padding:2px 4px;width:8%;">BTL</th>
        <th style="${hRule}padding:2px 4px;width:8%;">CO</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// Step 7: download-only page. Questions are held in memory to BUILD the files,
// but shown only inside an off-screen node — never on the visible page.
export default function DownloadPaper() {
  const { id } = useParams();
  const [paper, setPaper] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const offRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('papers')
        .select(
          'id, title, variant, total_marks, created_at, subjects(name, code), ' +
          'paper_questions(q_no, part, marks, position, questions(text, image_url, bt_level, co_no))'
        )
        .eq('id', id)
        .single();
      if (error) setErr(error.message);
      else setPaper(data);
    })();
  }, [id]);

  const fileBase = () =>
    (paper?.title || 'paper').replace(/\s+/g, '_').replace(/[^\w-]/g, '');

  // Group flat rows → [{ q_no, A:[...], B:[...] }] sorted by q_no then position.
  const groups = () => {
    const g = {};
    for (const r of paper?.paper_questions ?? []) {
      const q = r.q_no ?? 0;
      (g[q] ??= { q_no: q, A: [], B: [] });
      (g[q][r.part] ??= []).push(r);
    }
    Object.values(g).forEach((x) => {
      x.A.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      x.B.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    });
    return Object.values(g).sort((a, b) => a.q_no - b.q_no);
  };

  const paperHtml = paper ? buildPaperHtml(paper, groups()) : '';

  // Rasterize the render node. html2canvas clones into a sandbox iframe and
  // paints the DOM directly — reliable off-screen and inside WebView2/Edge,
  // where html-to-image (SVG foreignObject) returns blank.
  async function snapshot() {
    const html2canvas = (await import('html2canvas')).default;
    const node = offRef.current;
    return html2canvas(node, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });
  }

  async function downloadPDF() {
    setBusy('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const canvas = await snapshot();
      const dataUrl = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pw) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(dataUrl, 'PNG', 0, position, pw, imgH, undefined, 'FAST');
      heightLeft -= ph;
      while (heightLeft > 0) {
        position -= ph;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pw, imgH, undefined, 'FAST');
        heightLeft -= ph;
      }
      pdf.save(`${fileBase()}.pdf`);
    } finally {
      setBusy('');
    }
  }

  // HTML-based .doc (Word opens it natively) — same markup as PDF/image.
  async function downloadWord() {
    setBusy('word');
    try {
      const { saveAs } = await import('file-saver');
      const html =
        `<html xmlns:o="urn:schemas-microsoft-com:office:office" ` +
        `xmlns:w="urn:schemas-microsoft-com:office:word" ` +
        `xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head>` +
        `<body>${paperHtml}</body></html>`;
      const blob = new Blob(['﻿', html], { type: 'application/msword' });
      saveAs(blob, `${fileBase()}.doc`);
    } finally {
      setBusy('');
    }
  }

  async function downloadImage() {
    setBusy('image');
    try {
      const { saveAs } = await import('file-saver');
      const canvas = await snapshot();
      saveAs(canvas.toDataURL('image/png'), `${fileBase()}.png`);
    } finally {
      setBusy('');
    }
  }

  if (err) return <div className="card"><p className="msg">{err}</p></div>;
  if (!paper) return <div className="card"><p>Preparing…</p></div>;

  return (
    <div className="card wide">
      <h1>Paper ready ✅</h1>
      <p className="subtitle">Questions are hidden. Pick a format to download.</p>

      <div className="dl-grid">
        <button className="submit" disabled={!!busy} onClick={downloadPDF}>
          {busy === 'pdf' ? '…' : '⬇ PDF'}
        </button>
        <button className="submit" disabled={!!busy} onClick={downloadWord}>
          {busy === 'word' ? '…' : '⬇ Word'}
        </button>
        <button className="submit" disabled={!!busy} onClick={downloadImage}>
          {busy === 'image' ? '…' : '⬇ Image'}
        </button>
      </div>

      {/* Render source for PDF + image capture. Positioned off-screen (not
          clipped, not transparent) so it is fully laid out but never visible;
          html2canvas rasterizes it by document coordinates. */}
      <div ref={offRef} className="paper-render" aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: paperHtml }} />
    </div>
  );
}
