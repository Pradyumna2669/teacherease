const fs = require('fs');

function createAppleSvg(text, subtext) {
  return `
    <g>
      <!-- Stem -->
      <path d="M 96 35 C 96 16, 108 5, 118 2 C 115 12, 107 22, 101 35 Z" fill="#5c4033" stroke="#222" stroke-width="1.8"/>
      <!-- Green Leaf -->
      <path d="M 112 12 C 140 4, 166 18, 172 34 C 148 38, 126 28, 112 12 Z" fill="#81c784" stroke="#2e7d32" stroke-width="1.8"/>
      <path d="M 112 12 C 132 20, 150 26, 172 34" fill="none" stroke="#2e7d32" stroke-width="1.2"/>
      
      <!-- Apple Body: Classic heart-apple curve -->
      <path d="M 98 42 
               C 62 20, 12 38, 12 95 
               C 12 150, 58 190, 98 188 
               C 102 188, 104 185, 107 185 
               C 110 185, 112 188, 116 188 
               C 156 190, 202 150, 202 95 
               C 202 38, 152 20, 116 42 
               C 110 45, 107 46, 107 46 
               C 107 46, 104 45, 98 42 Z" 
            fill="#fff5f5" stroke="#111111" stroke-width="2.6" stroke-linejoin="round"/>
      
      <!-- Soft red/pink cheek blush -->
      <ellipse cx="48" cy="100" rx="15" ry="24" fill="#ffcdd2" opacity="0.6" transform="rotate(-15 48 100)"/>
      <ellipse cx="166" cy="100" rx="15" ry="24" fill="#ffcdd2" opacity="0.6" transform="rotate(15 166 100)"/>

      <!-- Title Badge -->
      <rect x="44" y="85" width="126" height="46" rx="10" fill="#ffffff" stroke="#1a1a1a" stroke-width="2.2"/>
      <text x="107" y="117" font-family="'Noto Sans Devanagari', 'Mangal', 'Segoe UI', sans-serif" font-size="28" font-weight="bold" fill="#000000" text-anchor="middle">${text}</text>
      
      <!-- Subtext -->
      <text x="107" y="152" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="bold" fill="#555555" text-anchor="middle">${subtext}</text>
    </g>
  `;
}

const twoApplesSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 200" width="100%" height="100%">
  <g transform="translate(45, 0)">
    ${createAppleSvg('स्वर', '(Vowels)')}
  </g>
  <g transform="translate(365, 0)">
    ${createAppleSvg('व्यंजन', '(Consonants)')}
  </g>
</svg>`;

fs.writeFileSync('scratch/two_apples.svg', twoApplesSvg);
console.log('Saved scratch/two_apples.svg');
