const fs = require('fs');

const fullBase64 = `data:image/png;base64,${fs.readFileSync('scratch/user_diagram_full.png').toString('base64')}`;
const mangoesBase64 = `data:image/png;base64,${fs.readFileSync('scratch/user_diagram_mangoes_only.png').toString('base64')}`;

function makePage(imgSrc, hasHints) {
  return `
    <div class="page">
      <div class="school-header">
        <div class="school-name">SDF PRIMARY SCHOOL</div>
        <div class="exam-title">Summative Assessment - I (2026-27)</div>
        <table class="header-table">
          <tr>
            <td style="text-align: left;"><b>विद्यार्थी का नाम:</b> ___________________________</td>
            <td style="text-align: center;"><b>रोल नं:</b> ______</td>
            <td style="text-align: right;"><b>कुल अंक:</b> ४०</td>
          </tr>
          <tr>
            <td style="text-align: left;"><b>विषय:</b> हिंदी (Hindi)</td>
            <td style="text-align: center;"><b>कक्षा:</b> 1st</td>
            <td style="text-align: right;"><b>समय:</b> 2 Hours</td>
          </tr>
        </table>
      </div>

      <!-- Q1 -->
      <div class="q-block">
        <div class="q-head">
          <span>प्र. १ अनुलेखन लिखो (सुंदर अक्षरों में पुनः लिखिए):</span>
          <span>(२M)</span>
        </div>
        <div style="font-size: 11.5pt; margin: 3pt 0 5pt 12pt; font-style: italic;">
          "भरत घर का काम करता था। माता का कहना मानता था। सबका आदर करता था। भरत समझदार लड़का था।"
        </div>
        <div style="margin-left: 12pt;">
          <div style="border-bottom: 1.2px solid #000; height: 18px;"></div>
          <div style="border-bottom: 1.2px solid #000; height: 18px;"></div>
        </div>
      </div>

      <!-- Q2 (अ) -->
      <div class="q-block">
        <div class="q-head">
          <span>प्र. २ (अ) दिए गए वर्णों में से स्वर और व्यंजन चुनकर लिखो:</span>
          <span>(४M)</span>
        </div>
        ${hasHints ? `
        <div class="q-hints">
          <span>[ ए &nbsp;|&nbsp; ओ &nbsp;|&nbsp; क &nbsp;|&nbsp; अं &nbsp;|&nbsp; ज &nbsp;|&nbsp; ख &nbsp;|&nbsp; औ &nbsp;|&nbsp; प &nbsp;|&nbsp; ह ]</span>
        </div>` : ''}
        <div class="img-wrap">
          <img src="${imgSrc}" style="max-height: ${hasHints ? '185pt' : '210pt'};" />
        </div>
      </div>

      <!-- Q2 (ब) Matching -->
      <div class="q-block">
        <div class="q-head">
          <span>प्र. २ (ब) उचित जोड़ी लगाओ (शब्द को सही शब्द/चित्र से मिलाओ):</span>
          <span>(३M)</span>
        </div>
        <table style="width: 100%; margin-left: 12pt; font-size: 11pt;">
          <tr>
            <td style="width: 45%;">१. गमला (Flowerpot)</td>
            <td style="width: 20%; text-align: center;">( _____ )</td>
            <td style="width: 35%;">अ. माला 📿</td>
          </tr>
          <tr>
            <td>२. माला (Garland)</td>
            <td style="text-align: center;">( _____ )</td>
            <td>ब. कान 👂</td>
          </tr>
          <tr>
            <td>३. अनार (Pomegranate)</td>
            <td style="text-align: center;">( _____ )</td>
            <td>क. गमला 🪴</td>
          </tr>
        </table>
      </div>
    </div>
  `;
}

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Page 1 Options</title>
  <style>
    body { font-family: 'Times New Roman', 'Noto Serif Devanagari', serif; background: #eee; margin: 0; padding: 20px; }
    .page { width: 750px; background: white; margin: 0 auto 30px; padding: 25px 35px; box-sizing: border-box; border: 1px solid #ccc; }
    .school-header { border: 2px solid #000; padding: 6px 10px; margin-bottom: 10pt; text-align: center; }
    .school-name { font-size: 17pt; font-weight: bold; }
    .exam-title { font-size: 12pt; font-weight: 600; margin: 2px 0 4px; }
    .header-table { width: 100%; border-top: 1.5px solid #000; margin-top: 4px; padding-top: 4px; font-size: 10.5pt; }
    .header-table td { padding: 2px 4px; }
    .q-block { margin-bottom: 12pt; }
    .q-head { display: flex; justify-content: space-between; font-weight: bold; font-size: 12.5pt; margin-bottom: 3pt; }
    .q-hints { text-align: center; margin: 3pt 0 6pt; font-size: 11.5pt; }
    .q-hints span { border: 1.2px solid #222; border-radius: 4px; padding: 2px 10px; background: #fafafa; }
    .img-wrap { text-align: center; margin: 4pt 0; }
    .img-wrap img { max-width: 100%; object-fit: contain; display: block; margin: 0 auto; }
  </style>
</head>
<body>
  <h2 style="text-align:center;">Option 1: Full User Diagram (Exactly As Uploaded)</h2>
  ${makePage(fullBase64, false)}

  <h2 style="text-align:center;">Option 2: Clean Hybrid (Hindi Hints + User's Mangoes with Lines)</h2>
  ${makePage(mangoesBase64, true)}
</body>
</html>`;

fs.writeFileSync('scratch/render_page1_options.html', html);
console.log('Saved scratch/render_page1_options.html');
