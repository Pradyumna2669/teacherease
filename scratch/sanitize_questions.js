const fs = require('fs');

const paper = JSON.parse(fs.readFileSync('scratch/paper_61463c3b_updated.json', 'utf8'));

// Sanitize all questions
paper.questions = paper.questions.map((q, idx) => {
  const sanitized = {
    ...q,
    id: q.id || `q_${idx}_${Date.now()}`,
    title: q.title || '',
    marks: typeof q.marks === 'number' ? q.marks : 0,
    items: Array.isArray(q.items) ? q.items.map((it, ii) => ({
      ...it,
      id: it.id || `item_${idx}_${ii}_${Date.now()}`,
      content: it.content || '',
      lines: typeof it.lines === 'number' ? it.lines : 0
    })) : []
  };

  // Clean undefined fields
  Object.keys(sanitized).forEach(k => {
    if (sanitized[k] === undefined) {
      delete sanitized[k];
    }
  });

  return sanitized;
});

fs.writeFileSync('scratch/paper_61463c3b_updated.json', JSON.stringify(paper, null, 2));

console.log('Sanitized questions count:', paper.questions.length);
paper.questions.forEach((q, i) => {
  console.log(`Q${i} [${q.type}] - items count: ${q.items.length}, marks: ${q.marks}`);
});
