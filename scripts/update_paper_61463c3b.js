const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const paperId = '61463c3b-167c-4f49-8efd-e659287bab26';
  const paperData = JSON.parse(fs.readFileSync('scratch/paper_61463c3b_updated.json', 'utf8'));

  const { data, error } = await supabase
    .from('papers')
    .update({
      title: 'Marathi • Summative Assessment (2026-27)',
      subject: 'Marathi',
      class_name: 'Class - 6th std',
      settings: paperData.settings,
      questions: paperData.questions,
      updated_at: new Date().toISOString()
    })
    .eq('id', paperId)
    .select();

  if (error) {
    console.error('Error updating paper in Supabase:', error);
    process.exit(1);
  } else {
    console.log('Successfully updated paper', paperId, 'in Supabase!');
    console.log('Updated records count:', data.length);
  }
}

run();
