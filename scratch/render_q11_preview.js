const fs = require('fs');

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Q11 Preview - Lines First, Then Box</title>
  <style>
    body { font-family: 'Times New Roman', serif; background: white; margin: 0; padding: 25px 35px; max-width: 750px; }
    .q-head { display: flex; justify-content: space-between; font-weight: bold; font-size: 13pt; margin-bottom: 8pt; }
    .writing-row { border-bottom: 1px solid #000; height: 20pt; margin-bottom: 4pt; }
    .draw-box { border: 1px solid #000; height: 90pt; border-radius: 2pt; margin-top: 6pt; }
  </style>
</head>
<body>
  <div>
    <div class="q-head">
      <span>प्र. ६ (ब) आम (Mango) का चित्र बनाकर उसके बारे में १ - २ वाक्य लिखिए:</span>
      <span>(२M)</span>
    </div>

    <!-- Lines First -->
    <div style="margin-left: 10pt; margin-bottom: 6pt;">
      <div class="writing-row"></div>
      <div class="writing-row"></div>
    </div>

    <!-- Then Box -->
    <div style="margin-left: 10pt;">
      <div class="draw-box"></div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('scratch/q11_lines_first_preview.html', html);
console.log('Saved q11_lines_first_preview.html');
