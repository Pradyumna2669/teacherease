const fs = require('fs');

const svgMangoes = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 185" width="100%" height="100%">
  <!-- Left Mango: स्वर -->
  <g transform="translate(60, 5)">
    <!-- Stem and Leaf -->
    <path d="M 90 32 C 90 16, 100 5, 112 2 C 109 11, 102 20, 96 32 Z" fill="#5c4033" stroke="#222" stroke-width="1.8"/>
    <path d="M 106 12 C 134 4, 158 16, 165 32 C 142 35, 120 26, 106 12 Z" fill="#81c784" stroke="#2e7d32" stroke-width="1.8"/>
    <path d="M 106 12 C 126 20, 145 26, 165 32" fill="none" stroke="#2e7d32" stroke-width="1.2"/>
    <path d="M 94 22 C 76 12, 58 16, 52 26 C 66 29, 82 27, 94 22 Z" fill="#a5d6a7" stroke="#2e7d32" stroke-width="1.4"/>
    
    <!-- Mango Body -->
    <path d="M 92 32 
             C 52 35, 12 70, 12 116 
             C 12 156, 48 180, 94 180 
             C 126 180, 154 172, 172 154 
             C 186 140, 188 126, 178 116 
             C 170 106, 172 88, 164 70 
             C 150 44, 122 31, 92 32 Z" 
          fill="#fffde7" stroke="#111111" stroke-width="2.6" stroke-linejoin="round"/>
    
    <!-- Soft blush highlight -->
    <ellipse cx="48" cy="105" rx="12" ry="22" fill="#ffe082" opacity="0.6" transform="rotate(-15 48 105)"/>

    <!-- Banner for स्वर -->
    <rect x="36" y="80" width="120" height="44" rx="10" fill="#ffffff" stroke="#111111" stroke-width="2.2"/>
    <text x="96" y="112" font-family="'Noto Sans Devanagari', 'Mangal', 'Segoe UI', sans-serif" font-size="28" font-weight="bold" fill="#000000" text-anchor="middle">स्वर</text>
    
    <text x="96" y="148" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="bold" fill="#555555" text-anchor="middle">(Vowels)</text>
  </g>

  <!-- Right Mango: व्यंजन -->
  <g transform="translate(365, 5)">
    <!-- Stem and Leaf -->
    <path d="M 90 32 C 90 16, 100 5, 112 2 C 109 11, 102 20, 96 32 Z" fill="#5c4033" stroke="#222" stroke-width="1.8"/>
    <path d="M 106 12 C 134 4, 158 16, 165 32 C 142 35, 120 26, 106 12 Z" fill="#81c784" stroke="#2e7d32" stroke-width="1.8"/>
    <path d="M 106 12 C 126 20, 145 26, 165 32" fill="none" stroke="#2e7d32" stroke-width="1.2"/>
    <path d="M 94 22 C 76 12, 58 16, 52 26 C 66 29, 82 27, 94 22 Z" fill="#a5d6a7" stroke="#2e7d32" stroke-width="1.4"/>
    
    <!-- Mango Body -->
    <path d="M 92 32 
             C 52 35, 12 70, 12 116 
             C 12 156, 48 180, 94 180 
             C 126 180, 154 172, 172 154 
             C 186 140, 188 126, 178 116 
             C 170 106, 172 88, 164 70 
             C 150 44, 122 31, 92 32 Z" 
          fill="#fffde7" stroke="#111111" stroke-width="2.6" stroke-linejoin="round"/>
    
    <!-- Soft blush highlight -->
    <ellipse cx="48" cy="105" rx="12" ry="22" fill="#ffe082" opacity="0.6" transform="rotate(-15 48 105)"/>

    <!-- Banner for व्यंजन -->
    <rect x="32" y="80" width="128" height="44" rx="10" fill="#ffffff" stroke="#111111" stroke-width="2.2"/>
    <text x="96" y="112" font-family="'Noto Sans Devanagari', 'Mangal', 'Segoe UI', sans-serif" font-size="28" font-weight="bold" fill="#000000" text-anchor="middle">व्यंजन</text>
    
    <text x="96" y="148" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="bold" fill="#555555" text-anchor="middle">(Consonants)</text>
  </g>
</svg>`;

const htmlPage1 = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SDF PRIMARY SCHOOL - Hindi Paper Page 1</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    body { font-family: 'Times New Roman', 'Noto Serif Devanagari', serif; background: #eee; margin: 0; padding: 20px; }
    .page { width: 750px; min-height: 1050px; background: white; margin: 0 auto; padding: 30px 40px; box-sizing: border-box; box-shadow: 0 4px 15px rgba(0,0,0,0.15); border: 1px solid #ccc; }
    
    /* Boxed Header */
    .school-header { border: 2px solid #000; padding: 8px 12px; margin-bottom: 12pt; text-align: center; }
    .school-name { font-size: 18pt; font-weight: bold; letter-spacing: 1px; }
    .exam-title { font-size: 13pt; font-weight: 600; margin: 3px 0 6px; }
    .header-table { width: 100%; border-top: 1.5px solid #000; margin-top: 5px; padding-top: 5px; font-size: 11pt; }
    .header-table td { padding: 3px 6px; }
    
    .q-block { margin-bottom: 16pt; }
    .q-head { display: flex; justify-content: space-between; font-weight: bold; font-size: 13pt; margin-bottom: 4pt; }
    .q-hints { text-align: center; margin: 4pt 0 8pt; font-size: 12pt; }
    .q-hints span { border: 1.2px solid #222; border-radius: 4px; padding: 3px 12px; background: #fcfcfc; }
    .img-wrap { text-align: center; margin: 4pt 0 8pt; }
    .img-wrap svg { max-height: 145pt; width: auto; }
    .items-list { font-size: 12pt; line-height: 2; margin-left: 12pt; }
    
    .four-lines { border-bottom: 1px solid #aaa; height: 18px; margin: 4px 0; }
  </style>
</head>
<body>
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
      <div style="font-size: 12pt; margin: 4pt 0 6pt 12pt; font-style: italic;">
        "भरत घर का काम करता था। माता का कहना मानता था। सबका आदर करता था। भरत समझदार लड़का था।"
      </div>
      <div style="margin-left: 12pt; margin-top: 4pt;">
        <div style="border-bottom: 1.2px solid #000; height: 20px;"></div>
        <div style="border-bottom: 1.2px solid #000; height: 20px;"></div>
      </div>
    </div>

    <!-- Q2 (अ) with 2 Big Mangoes Drawing -->
    <div class="q-block">
      <div class="q-head">
        <span>प्र. २ (अ) दिए गए वर्णों में से स्वर और व्यंजन चुनकर लिखो:</span>
        <span>(४M)</span>
      </div>
      <div class="q-hints">
        <span>[ ए &nbsp;|&nbsp; ओ &nbsp;|&nbsp; क &nbsp;|&nbsp; अं &nbsp;|&nbsp; ज &nbsp;|&nbsp; ख &nbsp;|&nbsp; औ &nbsp;|&nbsp; प &nbsp;|&nbsp; ह ]</span>
      </div>
      <div class="img-wrap">
        ${svgMangoes}
      </div>
      <div class="items-list">
        <div><b>१) स्वर :</b> &nbsp;&nbsp;&nbsp;&nbsp; (१) ___________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (२) ___________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (३) ___________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (४) ___________</div>
        <div style="margin-top: 6pt;"><b>२) व्यंजन :</b> &nbsp;&nbsp;&nbsp; (१) ___________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (२) ___________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (३) ___________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (४) ___________</div>
      </div>
    </div>

    <!-- Q2 (ब) Matching -->
    <div class="q-block">
      <div class="q-head">
        <span>प्र. २ (ब) उचित जोड़ी लगाओ (शब्द को सही शब्द/चित्र से मिलाओ):</span>
        <span>(३M)</span>
      </div>
      <table style="width: 100%; margin-left: 12pt; font-size: 11.5pt;">
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
</body>
</html>`;

fs.writeFileSync('scratch/full_page1_preview.html', htmlPage1);
console.log('Saved scratch/full_page1_preview.html');
