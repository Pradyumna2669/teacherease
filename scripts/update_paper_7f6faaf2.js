const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

const mangoBase64 = `data:image/svg+xml;base64,${Buffer.from(svgMangoes).toString('base64')}`;

async function run() {
  const paperId = '7f6faaf2-911b-4b22-836a-432ded2fc7b2';
  const { data: existing, error: fetchErr } = await supabase
    .from('papers')
    .select('*')
    .eq('id', paperId)
    .single();

  if (fetchErr) {
    console.error('Error fetching paper:', fetchErr);
    return;
  }

  const questions = typeof existing.questions === 'string'
    ? JSON.parse(existing.questions)
    : existing.questions;

  // Question 1: प्र. २ (अ) दिए गए वर्णों में से स्वर और व्यंजन चुनकर लिखो:
  questions[1] = {
    ...questions[1],
    id: 'h_q2_a',
    type: 'short-answer',
    title: 'प्र. २ (अ) दिए गए वर्णों में से स्वर और व्यंजन चुनकर लिखो:',
    marks: 4,
    hints: ' [ ए   |   ओ   |   क   |   अं   |   ज   |   ख   |   औ   |   प   |   ह  ]',
    images: [mangoBase64],
    imageColumns: 1,
    imageNumbers: false,
    imageAlign: 'center',
    imageMaxHeight: 155,
    items: [
      {
        id: 'h_q2_a_1',
        lines: 0,
        answer: 'ए, ओ, अं, औ',
        content: 'स्वर :   (१) _________     (२) _________     (३) _________     (४) _________'
      },
      {
        id: 'h_q2_a_2',
        lines: 0,
        answer: 'क, ज, ख, प, ह',
        content: 'व्यंजन :   (१) _________     (२) _________     (३) _________     (४) _________'
      }
    ],
    columnsPerRow: 1
  };

  const { error: updateErr } = await supabase
    .from('papers')
    .update({
      questions: questions,
      updated_at: new Date().toISOString()
    })
    .eq('id', paperId);

  if (updateErr) {
    console.error('Error updating paper in Supabase:', updateErr);
  } else {
    console.log(`SUCCESS: Paper ${paperId} updated with fruit drawing for स्वर and व्यंजन!`);
  }
}

run();
