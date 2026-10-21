const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function syncPaper() {
  const paper = JSON.parse(fs.readFileSync('scratch/paper_61463c3b_combined_q1.json', 'utf8'));

  const marksList = [2, 1, 1, 3, 2, 1];
  paper.questions[0].items.forEach((item, i) => {
    item.marks = marksList[i];
  });

  fs.writeFileSync('scratch/paper_61463c3b_combined_q1.json', JSON.stringify(paper, null, 2));
  console.log('Updated scratch/paper_61463c3b_combined_q1.json with subitem marks.');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase
    .from('papers')
    .update({
      questions: paper.questions,
      updated_at: new Date().toISOString()
    })
    .eq('id', '61463c3b-167c-4f49-8efd-e659287bab26')
    .select();

  if (error) {
    console.error('Error updating paper in Supabase:', error);
    process.exit(1);
  }

  console.log('Successfully synced paper to Supabase! Questions:', data[0].questions.length);
  data[0].questions[0].items.forEach((item, i) => {
    console.log(`Sub-item ${i+1}: marks = ${item.marks}, title = ${item.content.split('\n')[0]}`);
  });
}

syncPaper();
