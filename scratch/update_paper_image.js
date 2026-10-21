const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function updatePaperImages() {
  const paper = JSON.parse(fs.readFileSync('scratch/paper_61463c3b_combined_q1.json', 'utf8'));
  const pngDataUri = fs.readFileSync('scratch/bag_png_datauri.txt', 'utf8').trim();

  // Update Q4 image
  const q4 = paper.questions[3];
  console.log('Updating Q4:', q4.title);
  q4.images = [pngDataUri];

  fs.writeFileSync('scratch/paper_61463c3b_combined_q1.json', JSON.stringify(paper, null, 2));
  console.log('Saved scratch/paper_61463c3b_combined_q1.json with PNG image.');

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
  console.log('Saved Q4 image starts with:', data[0].questions[3].images[0].slice(0, 30));
}

updatePaperImages();
