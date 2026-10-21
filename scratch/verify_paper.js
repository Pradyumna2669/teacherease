const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('papers').select('id, questions').eq('id', '61463c3b-167c-4f49-8efd-e659287bab26').single();
  if (error) {
    console.error('Error fetching paper:', error);
    return;
  }
  console.log('Total questions:', data.questions.length);
  data.questions.forEach((q, idx) => {
    console.log((idx + 1) + '. [' + q.id + '] (' + q.type + ') ' + q.title);
    if (q.tableColWidths) {
      console.log('   tableColWidths:', q.tableColWidths);
    }
  });
}
run();
