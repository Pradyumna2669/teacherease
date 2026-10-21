const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Read the optimized cropped mangoes image (from the user uploaded image)
const mangoesBase64 = `data:image/png;base64,${fs.readFileSync('scratch/user_diagram_mangoes_only.png').toString('base64')}`;

async function run() {
  const paperId = '7f6faaf2-911b-4b22-836a-432ded2fc7b2';
  const { data: existing, error: fetchErr } = await supabase
    .from('papers')
    .select('*')
    .eq('id', paperId)
    .single();

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }

  const questions = typeof existing.questions === 'string'
    ? JSON.parse(existing.questions)
    : existing.questions;

  questions[1] = {
    ...questions[1],
    id: 'h_q2_a',
    type: 'short-answer',
    title: 'प्र. २ (अ) दिए गए वर्णों में से स्वर और व्यंजन चुनकर लिखो:',
    marks: 4,
    hints: ' [ ए   |   ओ   |   क   |   अं   |   ज   |   ख   |   औ   |   प   |   ह  ]',
    images: [mangoesBase64],
    imageColumns: 1,
    imageNumbers: false,
    imageAlign: 'center',
    imageMaxHeight: 195,
    items: [],
    answerNote: 'स्वर : ए, ओ, अं, औ | व्यंजन : क, ज, ख, प, ह'
  };

  const { error: updateErr } = await supabase
    .from('papers')
    .update({
      questions: questions,
      updated_at: new Date().toISOString()
    })
    .eq('id', paperId);

  if (updateErr) {
    console.error('Update error:', updateErr);
  } else {
    console.log(`SUCCESS: Paper ${paperId} updated with user diagram!`);
  }
}

run();
