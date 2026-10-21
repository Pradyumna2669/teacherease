const fs = require('fs');
const content = fs.readFileSync('components/PrintPreview.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('comprehension')) {
    console.log(i + 1, l.trim());
  }
});
