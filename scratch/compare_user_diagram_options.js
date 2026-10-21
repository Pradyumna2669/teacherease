const fs = require('fs');

const fullBase64 = `data:image/png;base64,${fs.readFileSync('scratch/user_diagram_full.png').toString('base64')}`;
const mangoesBase64 = `data:image/png;base64,${fs.readFileSync('scratch/user_diagram_mangoes_only.png').toString('base64')}`;

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>User Diagram Comparison</title>
  <style>
    body { font-family: 'Times New Roman', serif; padding: 20px; background: #eee; }
    .page { width: 750px; background: white; margin: 0 auto 30px; padding: 30px 40px; box-sizing: border-box; border: 1px solid #ccc; }
    .q-head { display: flex; justify-content: space-between; font-weight: bold; font-size: 13.5pt; margin-bottom: 6pt; }
    .hints { text-align: center; margin: 6pt 0 10pt; font-size: 12.5pt; }
    .hints span { border: 1.2px solid #222; border-radius: 4px; padding: 3px 14px; background: #fafafa; letter-spacing: 1.5px; }
    .img-wrap { text-align: center; margin: 6pt 0; }
    .img-wrap img { max-width: 100%; object-fit: contain; }
    h2 { text-align: center; color: #333; margin-top: 20px; }
  </style>
</head>
<body>
  <h2>Option 1: Full Diagram As Uploaded (With Top Header)</h2>
  <div class="page">
    <div class="q-head">
      <span>प्र. २ (अ) दिए गए वर्णों में से स्वर और व्यंजन चुनकर लिखो:</span>
      <span>(४M)</span>
    </div>
    <div class="img-wrap">
      <img src="${fullBase64}" style="max-height: 230pt;" />
    </div>
  </div>

  <h2>Option 2: Clean Hybrid (Hindi Title + Hints Box + User's Mangoes with Lines)</h2>
  <div class="page">
    <div class="q-head">
      <span>प्र. २ (अ) दिए गए वर्णों में से स्वर और व्यंजन चुनकर लिखो:</span>
      <span>(४M)</span>
    </div>
    <div class="hints">
      <span>[ ए &nbsp;|&nbsp; ओ &nbsp;|&nbsp; क &nbsp;|&nbsp; अं &nbsp;|&nbsp; ज &nbsp;|&nbsp; ख &nbsp;|&nbsp; औ &nbsp;|&nbsp; प &nbsp;|&nbsp; ह ]</span>
    </div>
    <div class="img-wrap">
      <img src="${mangoesBase64}" style="max-height: 195pt;" />
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('scratch/compare_user_diagram_options.html', html);
console.log('Saved compare_user_diagram_options.html');
