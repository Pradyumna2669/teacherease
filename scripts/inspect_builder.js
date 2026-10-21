const fs = require('fs');
const content = fs.readFileSync('app/builder/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('q.type === "short-answer"') || l.includes("q.type === 'short-answer'")) {
    console.log(i + 1, l.trim());
  }
});
