const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

  const q11Index = questions.findIndex(q => q.id === 'h_q6_b');
  if (q11Index === -1) {
    console.error('Question h_q6_b not found!');
    return;
  }

  questions[q11Index] = {
    ...questions[q11Index],
    drawLinesPosition: 'above',
    drawOrder: 'lines-first'
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
    console.log(`SUCCESS: Question 11 (h_q6_b) updated to lines-first on paper ${paperId}!`);
  }
}

run();
