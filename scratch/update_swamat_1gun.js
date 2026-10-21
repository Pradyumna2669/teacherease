const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function updatePaper() {
  const paper = JSON.parse(fs.readFileSync('scratch/paper_61463c3b_combined_q1.json', 'utf8'));

  // Update Q1 marks to 8 (2+1+1+1+2+1)
  paper.questions[0].marks = 8;

  // Update Swamat item (index 3) to 1 gun
  const swamat = paper.questions[0].items[3];
  swamat.marks = 1;
  swamat.content = "स्वमत :  (१ गुण)\nओवीने दरवर्षी सुट्टीत गावाला यायचे का ठरवले असावे ते तुमच्या शब्दात लिहा.";
  swamat.lines = 2;

  fs.writeFileSync('scratch/paper_61463c3b_combined_q1.json', JSON.stringify(paper, null, 2));
  console.log('Updated scratch/paper_61463c3b_combined_q1.json successfully.');

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

  console.log('Successfully updated Supabase paper!');
  console.log('Q1 marks:', data[0].questions[0].marks);
  console.log('Q1 Swamat:', data[0].questions[0].items[3]);
  const total = data[0].questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  console.log('Total paper marks sum:', total);
}

updatePaper();
