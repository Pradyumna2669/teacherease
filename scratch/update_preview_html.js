const fs = require('fs');
let html = fs.readFileSync('scratch/full_paper_preview.html', 'utf8');

// Replace any remaining (XM) with (X गुण)
html = html.replace(/\((\d+)\s*M\)/g, '($1 गुण)');

// Replace SVG image in Q4 with PNG image
const pngDataUri = fs.readFileSync('scratch/bag_png_datauri.txt', 'utf8').trim();
html = html.replace(/src="data:image\/svg\+xml;base64,[^"]+"/, 'src="' + pngDataUri + '"');

fs.writeFileSync('scratch/full_paper_preview.html', html);
console.log('Updated scratch/full_paper_preview.html');
