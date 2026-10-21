const fs = require('fs');
const content = fs.readFileSync('components/PrintPreview.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('function Comprehension')) {
    console.log(i + 1, l.trim());
  }
});
