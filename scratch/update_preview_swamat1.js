const fs = require('fs');
let html = fs.readFileSync('scratch/full_paper_preview.html', 'utf8');

// Update Q1 marks badge from (10 गुण) to (8 गुण)
html = html.replace('<span class="marks">(10 गुण)</span>', '<span class="marks">(८ गुण)</span>');
html = html.replace('<span class="marks">(१० गुण)</span>', '<span class="marks">(८ गुण)</span>');

// Remove "प्रश्न:" if present
html = html.replace('<div style="font-weight: 700; margin-bottom: 6pt; margin-left: 4pt;">प्रश्न:</div>', '');
html = html.replace(/<div[^>]*>प्रश्न:<\/div>/g, '');

// Update Swamat marks from (3 गुण) or (३ गुण) to (१ गुण)
html = html.replace('<span class="marks">(3 गुण)</span>', '<span class="marks">(१ गुण)</span>');
html = html.replace('<span class="marks">(३ गुण)</span>', '<span class="marks">(१ गुण)</span>');

// Update Swamat lines to 2 lines
html = html.replace(
  '<div style="margin-left: 14pt; margin-top: 3pt;"><div class="ans-line"></div><div class="ans-line"></div><div class="ans-line"></div></div>',
  '<div style="margin-left: 14pt; margin-top: 3pt;"><div class="ans-line"></div><div class="ans-line"></div></div>'
);

fs.writeFileSync('scratch/full_paper_preview.html', html);
console.log('Updated scratch/full_paper_preview.html for Swamat 1 gun and no प्रश्न title.');
