const fs = require('fs');
const paper = JSON.parse(fs.readFileSync('scratch/paper_61463c3b_combined_q1.json', 'utf8'));

const SUBITEM_MARKS_REGEX =
  /\s*([(\[](?:[०-९0-9]+(?:\.[०-९0-9]+)?\s*(?:गुण|गु\.|Marks?|marks?|M|m)?|[०-९0-9]+\s*(?:गुण|गु\.|Marks?|marks?|M|m))[)\]])\s*$/;

function stripLeadingItemNumber(text) {
  if (!text) return '';
  return text.replace(/^(\([०-९0-9a-zA-Z\u0900-\u097FivxlcdmIVXLCDM]+\)|[०-९0-9a-zA-Z\u0900-\u097FivxlcdmIVXLCDM]+[\.\)])\s*/, '').trim();
}

function parseSubItemContent(item) {
  const raw = item.content || '';
  const firstNewline = raw.indexOf('\n');
  const rawFirstLine = firstNewline === -1 ? raw : raw.slice(0, firstNewline);
  const rest = firstNewline === -1 ? '' : raw.slice(firstNewline + 1);

  const cleanFirstLine = stripLeadingItemNumber(rawFirstLine);
  const match = cleanFirstLine.match(SUBITEM_MARKS_REGEX);

  let titleLine = cleanFirstLine;
  let marks = null;

  if (item.marks != null && item.marks !== '') {
    marks = '(' + item.marks + ' गुण)';
    if (match) {
      titleLine = cleanFirstLine.slice(0, match.index).trim();
    }
  } else if (match) {
    marks = match[1];
    titleLine = cleanFirstLine.slice(0, match.index).trim();
  }

  return { titleLine, marks, rest };
}

const q1 = paper.questions[0];
let itemsHtml = '';
const marathiNums = ['१', '२', '३', '४', '५', '६'];
q1.items.forEach((item, i) => {
  const { titleLine, marks, rest } = parseSubItemContent(item);
  itemsHtml += `
    <div style="margin-bottom: 9pt;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8pt;">
        <div style="font-weight: 600;">${marathiNums[i]}) ${titleLine}</div>
        ${marks ? `<span style="font-weight: 600; font-size: 0.95em; white-space: nowrap; margin-left: auto;">${marks}</span>` : ''}
      </div>
      ${rest ? `<div style="margin-left: 14pt; margin-top: 3pt; white-space: pre-wrap; line-height: 1.55;">${rest}</div>` : ''}
      ${item.lines > 0 ? `
        <div style="margin-left: 14pt; margin-top: 6pt;">
          ${Array.from({ length: item.lines }).map(() => '<div style="border-bottom: 1px solid #777; height: 18pt;"></div>').join('')}
        </div>
      ` : ''}
    </div>
  `;
});

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Noto Serif Devanagari', serif;
      padding: 30px;
      max-width: 680px;
      margin: 0 auto;
      background: #fff;
      color: #000;
      font-size: 13px;
    }
    .box {
      border: 1px solid #000;
      border-radius: 2px;
      padding: 8px 12px;
      margin-bottom: 12px;
      line-height: 1.6;
      text-align: justify;
      white-space: pre-line;
      text-indent: 20px;
    }
    .q-title {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 8pt;
    }
  </style>
</head>
<body>
  <div class="q-title">
    <span>${q1.title}</span>
    <span>(१० गुण)</span>
  </div>
  <div class="box">${q1.passage}</div>
  <div style="font-weight: 700; margin-bottom: 6pt; margin-left: 4pt;">प्रश्न:</div>
  <div style="margin-left: 4pt;">
    ${itemsHtml}
  </div>
</body>
</html>`;

fs.writeFileSync('scratch/test_subitem_marks.html', html);
console.log('Generated scratch/test_subitem_marks.html');
