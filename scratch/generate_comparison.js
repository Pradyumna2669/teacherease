const fs = require('fs');

// Realistic Cute Mango SVG Path
// A classic Alphonso / Kesar mango shape
function createMangoSvg(text, subtext) {
  return `
    <g>
      <!-- Stem -->
      <path d="M 95 35 C 95 18, 106 6, 118 2 C 115 12, 108 22, 102 35 Z" fill="#6d4c41" stroke="#3e2723" stroke-width="1.8"/>
      <!-- Green Leaf -->
      <path d="M 112 14 C 142 6, 168 20, 175 36 C 150 40, 126 30, 112 14 Z" fill="#81c784" stroke="#2e7d32" stroke-width="1.8"/>
      <path d="M 112 14 C 135 24, 155 30, 175 36" fill="none" stroke="#2e7d32" stroke-width="1.2"/>
      <!-- Small secondary leaf -->
      <path d="M 100 24 C 80 14, 62 18, 55 28 C 70 32, 88 30, 100 24 Z" fill="#a5d6a7" stroke="#2e7d32" stroke-width="1.5"/>

      <!-- Mango Outline: Authentic Alphonso curve with beak at bottom -->
      <path d="M 98 35 
               C 55 38, 15 75, 15 125 
               C 15 168, 52 195, 100 195 
               C 135 195, 165 185, 185 165 
               C 200 150, 202 135, 192 125 
               C 182 115, 185 95, 175 75 
               C 160 48, 132 34, 98 35 Z" 
            fill="#fffde7" stroke="#1a1a1a" stroke-width="2.6" stroke-linejoin="round"/>
      
      <!-- Fruit Blush -->
      <ellipse cx="55" cy="115" rx="14" ry="24" fill="#ffe082" opacity="0.6" transform="rotate(-15 55 115)"/>

      <!-- Title Badge -->
      <rect x="42" y="90" width="126" height="46" rx="10" fill="#ffffff" stroke="#1a1a1a" stroke-width="2.2"/>
      <text x="105" y="122" font-family="'Noto Sans Devanagari', 'Mangal', 'Segoe UI', sans-serif" font-size="28" font-weight="bold" fill="#000000" text-anchor="middle">${text}</text>
      
      <!-- Subtext -->
      <text x="105" y="156" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="bold" fill="#555555" text-anchor="middle">${subtext}</text>
    </g>
  `;
}

const twoMangoesSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 205" width="100%" height="100%">
  <g transform="translate(45, 0)">
    ${createMangoSvg('स्वर', '(Vowels)')}
  </g>
  <g transform="translate(365, 0)">
    ${createMangoSvg('व्यंजन', '(Consonants)')}
  </g>
</svg>`;

const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Detailed Mango Preview</title>
  <style>
    body { font-family: 'Times New Roman', serif; padding: 20px; max-width: 800px; margin: 0 auto; background: #eee; }
    .sheet { background: white; padding: 35px; border: 1px solid #bbb; margin-bottom: 30px; }
    .q-title { font-weight: bold; font-size: 15pt; display: flex; justify-content: space-between; }
    .hints { text-align: center; margin: 8pt 0 12pt; font-size: 13.5pt; }
    .hints span { border: 1.5px solid #222; border-radius: 6px; padding: 4px 16px; background: #fafafa; letter-spacing: 2px; }
    .img-box { text-align: center; margin: 6pt 0 14pt; }
    .lines-style-1 { margin-left: 10pt; font-size: 13.5pt; line-height: 2.2; }
    .lines-style-2 { display: grid; grid-template-columns: 1fr 1fr; column-gap: 30pt; margin-left: 10pt; font-size: 13.5pt; }
    .item-h { font-weight: bold; margin-bottom: 6pt; }
    .row-blanks { display: flex; justify-content: space-between; margin-bottom: 8pt; }
    .underline { border-bottom: 1.5px solid #000; width: 75px; display: inline-block; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="q-title">
      <span>प्र. २ (अ) दिए गए वर्णों में से स्वर और व्यंजन चुनकर लिखो:</span>
      <span>(४M)</span>
    </div>
    <div class="hints">
      <span>[ ए &nbsp;|&nbsp; ओ &nbsp;|&nbsp; क &nbsp;|&nbsp; अं &nbsp;|&nbsp; ज &nbsp;|&nbsp; ख &nbsp;|&nbsp; औ &nbsp;|&nbsp; प &nbsp;|&nbsp; ह ]</span>
    </div>

    <!-- The 2 Big Mangoes Drawing -->
    <div class="img-box">
      ${twoMangoesSvg}
    </div>

    <!-- Layout A: Full width lines -->
    <div class="lines-style-1">
      <div><b>१) स्वर :</b> &nbsp;&nbsp; (१) ___________ &nbsp;&nbsp;&nbsp;&nbsp; (२) ___________ &nbsp;&nbsp;&nbsp;&nbsp; (३) ___________ &nbsp;&nbsp;&nbsp;&nbsp; (४) ___________</div>
      <div style="margin-top: 6pt;"><b>२) व्यंजन :</b> &nbsp;&nbsp; (१) ___________ &nbsp;&nbsp;&nbsp;&nbsp; (२) ___________ &nbsp;&nbsp;&nbsp;&nbsp; (३) ___________ &nbsp;&nbsp;&nbsp;&nbsp; (४) ___________</div>
    </div>
  </div>

  <div class="sheet">
    <div class="q-title">
      <span>प्र. २ (अ) दिए गए वर्णों में से स्वर और व्यंजन चुनकर लिखो:</span>
      <span>(४M)</span>
    </div>
    <div class="hints">
      <span>[ ए &nbsp;|&nbsp; ओ &nbsp;|&nbsp; क &nbsp;|&nbsp; अं &nbsp;|&nbsp; ज &nbsp;|&nbsp; ख &nbsp;|&nbsp; औ &nbsp;|&nbsp; प &nbsp;|&nbsp; ह ]</span>
    </div>

    <!-- The 2 Big Mangoes Drawing -->
    <div class="img-box">
      ${twoMangoesSvg}
    </div>

    <!-- Layout B: Two columns directly below each Mango -->
    <div class="lines-style-2">
      <div>
        <div class="item-h">१) स्वर :</div>
        <div class="row-blanks"><span>(१) <span class="underline"></span></span> <span>(२) <span class="underline"></span></span></div>
        <div class="row-blanks"><span>(३) <span class="underline"></span></span> <span>(४) <span class="underline"></span></span></div>
      </div>
      <div>
        <div class="item-h">२) व्यंजन :</div>
        <div class="row-blanks"><span>(१) <span class="underline"></span></span> <span>(२) <span class="underline"></span></span></div>
        <div class="row-blanks"><span>(३) <span class="underline"></span></span> <span>(४) <span class="underline"></span></span></div>
      </div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('scratch/compare_mango_layouts.html', htmlContent);
fs.writeFileSync('scratch/two_mangoes_final.svg', twoMangoesSvg);
console.log('Saved scratch/compare_mango_layouts.html and scratch/two_mangoes_final.svg');
