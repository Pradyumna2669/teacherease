const fs = require('fs');

// Two large mangoes matching the 2-column layout
const svgMangoes = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160" width="100%" height="100%">
  <!-- Left Mango: स्वर -->
  <g transform="translate(60, 5)">
    <!-- Stem and Leaf -->
    <path d="M 85 26 C 85 12, 94 3, 104 2 C 102 9, 96 18, 92 26 Z" fill="#5c4033" stroke="#222" stroke-width="1.5"/>
    <path d="M 98 10 C 122 4, 142 16, 148 28 C 132 30, 112 22, 98 10 Z" fill="#81c784" stroke="#222" stroke-width="1.5"/>
    <path d="M 98 10 C 116 18, 132 24, 148 28" fill="none" stroke="#222" stroke-width="1"/>
    
    <!-- Mango Body -->
    <path d="M 88 26 C 46 28, 10 58, 10 98 C 10 136, 50 152, 92 152 C 138 152, 170 122, 170 88 C 170 52, 135 25, 88 26 Z" 
          fill="#fffde7" stroke="#111111" stroke-width="2.5"/>
    
    <!-- Soft blush highlight -->
    <ellipse cx="40" cy="78" rx="8" ry="14" fill="#ffe082" opacity="0.6" transform="rotate(-15 40 78)"/>

    <!-- Banner for स्वर -->
    <rect x="35" y="62" width="110" height="38" rx="8" fill="#ffffff" stroke="#111111" stroke-width="2"/>
    <text x="90" y="89" font-family="'Noto Sans Devanagari', 'Mangal', 'Segoe UI', sans-serif" font-size="24" font-weight="bold" fill="#000000" text-anchor="middle">स्वर</text>
    
    <text x="90" y="124" font-family="'Segoe UI', sans-serif" font-size="12" font-weight="bold" fill="#555555" text-anchor="middle">(Vowels)</text>
  </g>

  <!-- Right Mango: व्यंजन -->
  <g transform="translate(360, 5)">
    <!-- Stem and Leaf -->
    <path d="M 85 26 C 85 12, 94 3, 104 2 C 102 9, 96 18, 92 26 Z" fill="#5c4033" stroke="#222" stroke-width="1.5"/>
    <path d="M 98 10 C 122 4, 142 16, 148 28 C 132 30, 112 22, 98 10 Z" fill="#81c784" stroke="#222" stroke-width="1.5"/>
    <path d="M 98 10 C 116 18, 132 24, 148 28" fill="none" stroke="#222" stroke-width="1"/>
    
    <!-- Mango Body -->
    <path d="M 88 26 C 46 28, 10 58, 10 98 C 10 136, 50 152, 92 152 C 138 152, 170 122, 170 88 C 170 52, 135 25, 88 26 Z" 
          fill="#fffde7" stroke="#111111" stroke-width="2.5"/>
    
    <!-- Soft blush highlight -->
    <ellipse cx="40" cy="78" rx="8" ry="14" fill="#ffe082" opacity="0.6" transform="rotate(-15 40 78)"/>

    <!-- Banner for व्यंजन -->
    <rect x="30" y="62" width="120" height="38" rx="8" fill="#ffffff" stroke="#111111" stroke-width="2"/>
    <text x="90" y="89" font-family="'Noto Sans Devanagari', 'Mangal', 'Segoe UI', sans-serif" font-size="24" font-weight="bold" fill="#000000" text-anchor="middle">व्यंजन</text>
    
    <text x="90" y="124" font-family="'Segoe UI', sans-serif" font-size="12" font-weight="bold" fill="#555555" text-anchor="middle">(Consonants)</text>
  </g>
</svg>`;

const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Preview Q2</title>
  <style>
    body { font-family: 'Times New Roman', serif; padding: 30px; max-width: 750px; margin: 0 auto; background: #fafafa; }
    .sheet { background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 1px solid #ccc; }
    .title { font-weight: bold; font-size: 16pt; display: flex; justify-content: space-between; margin-bottom: 6pt; }
    .hints { margin-left: 14pt; margin-bottom: 10pt; font-size: 13pt; text-align: center; }
    .hints span { display: inline-block; padding: 4px 14px; border: 1.5px solid #333; border-radius: 6px; background: #fdfdfd; font-weight: 500; letter-spacing: 2px; }
    .img-wrap { text-align: center; margin: 8pt 0 16pt; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; column-gap: 30pt; margin-left: 14pt; }
    .col-title { font-weight: bold; font-size: 13.5pt; margin-bottom: 8pt; }
    .blank-row { font-size: 13pt; margin-bottom: 10pt; display: flex; justify-content: space-between; }
    .blank-line { border-bottom: 1.5px solid #000; width: 65px; display: inline-block; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="title">
      <span>प्र. २ (अ) दिए गए वर्णों में से स्वर और व्यंजन चुनकर लिखो:</span>
      <span>(४M)</span>
    </div>
    <div class="hints">
      <span>[ ए &nbsp;|&nbsp; ओ &nbsp;|&nbsp; क &nbsp;|&nbsp; अं &nbsp;|&nbsp; ज &nbsp;|&nbsp; ख &nbsp;|&nbsp; औ &nbsp;|&nbsp; प &nbsp;|&nbsp; ह ]</span>
    </div>
    <div class="img-wrap">
      ${svgMangoes}
    </div>
    <div class="grid-2">
      <div>
        <div class="col-title">१) स्वर :</div>
        <div class="blank-row"><span>(१) <span class="blank-line"></span></span> <span>(२) <span class="blank-line"></span></span></div>
        <div class="blank-row"><span>(३) <span class="blank-line"></span></span> <span>(४) <span class="blank-line"></span></span></div>
      </div>
      <div>
        <div class="col-title">२) व्यंजन :</div>
        <div class="blank-row"><span>(१) <span class="blank-line"></span></span> <span>(२) <span class="blank-line"></span></span></div>
        <div class="blank-row"><span>(३) <span class="blank-line"></span></span> <span>(४) <span class="blank-line"></span></span></div>
      </div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('scratch/preview_q2.html', htmlContent);
console.log('Saved scratch/preview_q2.html');
