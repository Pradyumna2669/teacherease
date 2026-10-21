const fs = require('fs');
const path = require('path');

// Design 1: Two large crisp Mangoes side by side (Fruit 1: स्वर, Fruit 2: व्यंजन)
// Mangoes are the national fruit of India, beloved by children, and very easy to recognize.
// Left mango has 'स्वर' written in bold Devanagari.
// Right mango has 'व्यंजन' written in bold Devanagari.
// Designed with crisp 2.5px black strokes and subtle soft pastel fill (photocopy friendly).
const svgTwoMangoes = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 175" width="100%" height="100%">
  <!-- Left Mango: स्वर -->
  <g transform="translate(65, 5)">
    <!-- Stem and Leaf -->
    <path d="M 88 30 C 88 14, 96 4, 106 2 C 104 10, 98 20, 94 30 Z" fill="#5c4033" stroke="#222" stroke-width="1.5"/>
    <path d="M 102 12 C 126 6, 148 18, 154 32 C 136 34, 116 26, 102 12 Z" fill="#81c784" stroke="#222" stroke-width="1.5"/>
    <path d="M 102 12 C 122 20, 138 26, 154 32" fill="none" stroke="#222" stroke-width="1"/>
    
    <!-- Mango Body -->
    <path d="M 92 30 C 48 32, 10 65, 10 108 C 10 148, 52 165, 96 165 C 145 165, 178 134, 178 96 C 178 58, 142 28, 92 30 Z" 
          fill="#fffde7" stroke="#111111" stroke-width="2.5"/>
    
    <!-- Banner for स्वर -->
    <rect x="36" y="70" width="116" height="42" rx="10" fill="#ffffff" stroke="#111111" stroke-width="2"/>
    <text x="94" y="100" font-family="'Noto Sans Devanagari', 'Mangal', 'Segoe UI', sans-serif" font-size="26" font-weight="bold" fill="#000000" text-anchor="middle">स्वर</text>
    
    <text x="94" y="138" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="bold" fill="#444444" text-anchor="middle">(Vowels)</text>
  </g>

  <!-- Right Mango: व्यंजन -->
  <g transform="translate(365, 5)">
    <!-- Stem and Leaf -->
    <path d="M 88 30 C 88 14, 96 4, 106 2 C 104 10, 98 20, 94 30 Z" fill="#5c4033" stroke="#222" stroke-width="1.5"/>
    <path d="M 102 12 C 126 6, 148 18, 154 32 C 136 34, 116 26, 102 12 Z" fill="#81c784" stroke="#222" stroke-width="1.5"/>
    <path d="M 102 12 C 122 20, 138 26, 154 32" fill="none" stroke="#222" stroke-width="1"/>
    
    <!-- Mango Body -->
    <path d="M 92 30 C 48 32, 10 65, 10 108 C 10 148, 52 165, 96 165 C 145 165, 178 134, 178 96 C 178 58, 142 28, 92 30 Z" 
          fill="#fffde7" stroke="#111111" stroke-width="2.5"/>
    
    <!-- Banner for व्यंजन -->
    <rect x="32" y="70" width="124" height="42" rx="10" fill="#ffffff" stroke="#111111" stroke-width="2"/>
    <text x="94" y="100" font-family="'Noto Sans Devanagari', 'Mangal', 'Segoe UI', sans-serif" font-size="26" font-weight="bold" fill="#000000" text-anchor="middle">व्यंजन</text>
    
    <text x="94" y="138" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="bold" fill="#444444" text-anchor="middle">(Consonants)</text>
  </g>
</svg>`;

// Design 2: One Single Large Apple/Mango with two columns inside
const svgSingleBigFruit = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 185" width="100%" height="100%">
  <!-- Stem and Leaves -->
  <g transform="translate(270, 18)">
    <path d="M -4 16 C -8 2, 4 -10, 12 -14 C 8 -2, 4 6, 2 16 Z" fill="#5c4033" stroke="#222" stroke-width="1.5"/>
    <path d="M 6 -4 C 28 -18, 50 -10, 56 4 C 38 6, 20 2, 6 -4 Z" fill="#81c784" stroke="#222" stroke-width="1.5"/>
    <path d="M -2 0 C -24 -14, -46 -6, -52 8 C -34 10, -16 6, -2 0 Z" fill="#81c784" stroke="#222" stroke-width="1.5"/>
  </g>

  <!-- Big Fruit Body (Apple / Wide Peach shape) -->
  <path d="M 270 42 C 228 16, 110 22, 90 80 C 68 138, 120 178, 228 180 C 255 180, 265 174, 270 170 C 275 174, 285 180, 312 180 C 420 178, 472 138, 450 80 C 430 22, 312 16, 270 42 Z" 
        fill="#ffffff" stroke="#111111" stroke-width="2.5"/>

  <!-- Center divider dotted line -->
  <line x1="270" y1="52" x2="270" y2="168" stroke="#777777" stroke-width="2" stroke-dasharray="6,5"/>

  <!-- Left Side: स्वर -->
  <g transform="translate(180, 105)">
    <rect x="-65" y="-35" width="130" height="42" rx="10" fill="#f9f9f9" stroke="#111111" stroke-width="2"/>
    <text x="0" y="-5" font-family="'Noto Sans Devanagari', 'Mangal', 'Segoe UI', sans-serif" font-size="26" font-weight="bold" fill="#000000" text-anchor="middle">स्वर</text>
    <text x="0" y="32" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="bold" fill="#555555" text-anchor="middle">(Vowels)</text>
  </g>

  <!-- Right Side: व्यंजन -->
  <g transform="translate(360, 105)">
    <rect x="-70" y="-35" width="140" height="42" rx="10" fill="#f9f9f9" stroke="#111111" stroke-width="2"/>
    <text x="0" y="-5" font-family="'Noto Sans Devanagari', 'Mangal', 'Segoe UI', sans-serif" font-size="26" font-weight="bold" fill="#000000" text-anchor="middle">व्यंजन</text>
    <text x="0" y="32" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="bold" fill="#555555" text-anchor="middle">(Consonants)</text>
  </g>
</svg>`;

// Design 3: A Big Mango with all given letters scattered inside like seeds/bubbles,
// and 'स्वर' and 'व्यंजन' banners at bottom or below it.
const svgLettersInsideMango = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 200" width="100%" height="100%">
  <!-- Big Mango -->
  <g transform="translate(170, 8)">
    <path d="M 120 28 C 120 12, 130 2, 142 0 C 139 9, 132 18, 126 28 Z" fill="#5c4033" stroke="#222" stroke-width="1.5"/>
    <path d="M 136 10 C 165 4, 190 18, 196 34 C 174 36, 150 26, 136 10 Z" fill="#81c784" stroke="#222" stroke-width="1.5"/>

    <path d="M 125 30 C 65 32, 15 72, 15 125 C 15 172, 70 192, 128 192 C 190 192, 230 155, 230 110 C 230 65, 185 30, 125 30 Z" 
          fill="#fffde7" stroke="#111111" stroke-width="2.5"/>

    <!-- Letters inside the fruit in circles -->
    <!-- Row 1 -->
    <g transform="translate(68, 80)">
      <circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#111111" stroke-width="1.8"/>
      <text x="0" y="7" font-family="'Noto Sans Devanagari', 'Mangal', sans-serif" font-size="20" font-weight="bold" text-anchor="middle">ए</text>
    </g>
    <g transform="translate(125, 72)">
      <circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#111111" stroke-width="1.8"/>
      <text x="0" y="7" font-family="'Noto Sans Devanagari', 'Mangal', sans-serif" font-size="20" font-weight="bold" text-anchor="middle">ओ</text>
    </g>
    <g transform="translate(182, 82)">
      <circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#111111" stroke-width="1.8"/>
      <text x="0" y="7" font-family="'Noto Sans Devanagari', 'Mangal', sans-serif" font-size="20" font-weight="bold" text-anchor="middle">क</text>
    </g>

    <!-- Row 2 -->
    <g transform="translate(52, 126)">
      <circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#111111" stroke-width="1.8"/>
      <text x="0" y="7" font-family="'Noto Sans Devanagari', 'Mangal', sans-serif" font-size="20" font-weight="bold" text-anchor="middle">अं</text>
    </g>
    <g transform="translate(108, 120)">
      <circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#111111" stroke-width="1.8"/>
      <text x="0" y="7" font-family="'Noto Sans Devanagari', 'Mangal', sans-serif" font-size="20" font-weight="bold" text-anchor="middle">ज</text>
    </g>
    <g transform="translate(162, 122)">
      <circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#111111" stroke-width="1.8"/>
      <text x="0" y="7" font-family="'Noto Sans Devanagari', 'Mangal', sans-serif" font-size="20" font-weight="bold" text-anchor="middle">ख</text>
    </g>

    <!-- Row 3 -->
    <g transform="translate(75, 165)">
      <circle cx="0" cy="0" r="17" fill="#ffffff" stroke="#111111" stroke-width="1.8"/>
      <text x="0" y="7" font-family="'Noto Sans Devanagari', 'Mangal', sans-serif" font-size="19" font-weight="bold" text-anchor="middle">औ</text>
    </g>
    <g transform="translate(128, 163)">
      <circle cx="0" cy="0" r="17" fill="#ffffff" stroke="#111111" stroke-width="1.8"/>
      <text x="0" y="7" font-family="'Noto Sans Devanagari', 'Mangal', sans-serif" font-size="19" font-weight="bold" text-anchor="middle">प</text>
    </g>
    <g transform="translate(180, 158)">
      <circle cx="0" cy="0" r="17" fill="#ffffff" stroke="#111111" stroke-width="1.8"/>
      <text x="0" y="7" font-family="'Noto Sans Devanagari', 'Mangal', sans-serif" font-size="19" font-weight="bold" text-anchor="middle">ह</text>
    </g>
  </g>
</svg>`;

fs.writeFileSync('scratch/design1_two_mangoes.svg', svgTwoMangoes);
fs.writeFileSync('scratch/design2_single_big_fruit.svg', svgSingleBigFruit);
fs.writeFileSync('scratch/design3_mango_letters.svg', svgLettersInsideMango);
console.log('Saved all 3 designs');
