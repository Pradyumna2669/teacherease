import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time

with open('scratch/paper_61463c3b_combined_q1.json', 'r', encoding='utf-8') as f:
    paper = json.load(f)

settings = paper['settings']
questions = paper['questions']

html_content = f"""<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="utf-8">
  <title>{settings.get('schoolName', '')} - {settings.get('assessmentTitle', '')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page {{
      size: A4 portrait;
      margin: 10mm 12mm;
    }}
    * {{
      box-sizing: border-box;
    }}
    body {{
      font-family: 'Noto Serif Devanagari', 'Times New Roman', serif;
      margin: 0;
      padding: 20px;
      background: #e2e8f0;
      color: #000;
      font-size: 13pt;
      line-height: 1.4;
    }}
    .sheet {{
      width: 794px;
      min-height: 1123px;
      background: #fff;
      margin: 0 auto 30px;
      padding: 36px 44px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.15);
      border: 1px solid #cbd5e1;
      position: relative;
    }}
    .header-box {{
      border: 2px solid #000;
      padding: 10px 14px 8px;
      margin-bottom: 14pt;
      text-align: center;
    }}
    .school-title {{
      font-size: 17pt;
      font-weight: 700;
      letter-spacing: 0.5px;
    }}
    .exam-title {{
      font-size: 13pt;
      font-weight: 600;
      margin: 2px 0 6px;
    }}
    .header-table {{
      width: 100%;
      border-top: 1.5px solid #000;
      padding-top: 6px;
      margin-top: 4px;
      font-size: 11.5pt;
    }}
    .header-table td {{
      padding: 2px 4px;
    }}
    .rule {{
      display: inline-block;
      border-bottom: 1px solid #000;
      min-width: 60px;
    }}
    .question-block {{
      margin-bottom: 14pt;
    }}
    .question-header {{
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-weight: 700;
      font-size: 12.5pt;
      margin-bottom: 4pt;
    }}
    .marks {{
      font-weight: 700;
      white-space: nowrap;
      margin-left: 8px;
    }}
    .passage-box {{
      border: 1.5px solid #222;
      border-radius: 4px;
      padding: 8px 12px;
      margin: 4pt 0 10pt;
      background: #fafafa;
      text-align: justify;
      line-height: 1.6;
      font-size: 12pt;
    }}
    .items-container {{
      margin-left: 10pt;
    }}
    .item-row {{
      margin-bottom: 8pt;
    }}
    .ans-line {{
      border-bottom: 1px solid #000;
      height: 20px;
      margin-top: 3px;
    }}
    .grid-2 {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 24pt;
      row-gap: 6pt;
    }}
    .grid-3 {{
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      column-gap: 16pt;
    }}
    .data-table {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 6pt;
    }}
    .data-table th, .data-table td {{
      border: 1.5px solid #000;
      padding: 8px 12px;
      font-size: 12.5pt;
    }}
    .data-table td.header-col {{
      font-weight: 700;
      width: 130px;
      background: #f8fafc;
      text-align: center;
    }}
    .img-wrap {{
      text-align: center;
      margin: 6pt 0;
    }}
    .img-wrap img {{
      max-height: 200pt;
      width: auto;
    }}
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header-box">
      <div class="school-title">{settings.get('schoolName', '')}</div>
      <div class="exam-title">{settings.get('assessmentTitle', '')} ({settings.get('academicYear', '')})</div>
      <table class="header-table">
        <tr>
          <td style="text-align: left; width: 45%;"><b>विद्यार्थ्याचे नाव:</b> <span class="rule" style="width: 220px;">&nbsp;</span></td>
          <td style="text-align: center; width: 25%;"><b>हजेरी क्र. (Roll No):</b> <span class="rule" style="width: 50px;">&nbsp;</span></td>
          <td style="text-align: right; width: 30%;"><b>एकूण गुण (Marks):</b> ४०</td>
        </tr>
        <tr>
          <td style="text-align: left;"><b>विषय:</b> {settings.get('subject', '')}</td>
          <td style="text-align: center;"><b>इयत्ता:</b> ६ वी ({settings.get('className', '')})</td>
          <td style="text-align: right;"><b>वेळ:</b> {settings.get('timeAllowed', '')}</td>
        </tr>
      </table>
    </div>
"""

marathi_nums = ["१", "२", "३", "४", "५", "६", "७", "८", "९", "१०"]

for i, q in enumerate(questions):
    marks_str = f"({q.get('marks', 0)} गुण)" if q.get('marks', 0) > 0 else ""
    html_content += f"""
    <div class="question-block" id="q_{i}">
      <div class="question-header">
        <span>{q.get('title', '')}</span>
        <span class="marks">{marks_str}</span>
      </div>
    """
    
    if q.get('hints'):
        html_content += f"""<div style="font-weight: 600; text-align: center; margin: 3pt 0 6pt; color: #333;">{q.get('hints')}</div>"""
        
    if q.get('passage'):
        html_content += f"""
        <div class="passage-box">
          <div style="font-weight: 700; text-align: center; margin-bottom: 4pt; text-decoration: underline;">उतारा</div>
          {q.get('passage')}
        </div>
        """
        
    if q.get('images'):
        for img in q['images']:
            html_content += f"""
            <div class="img-wrap">
              <img src="{img}" style="max-height: {q.get('imageMaxHeight', 200)}pt;" />
            </div>
            """

    if q.get('type') == 'table' and q.get('tableRows'):
        html_content += """<table class="data-table">"""
        for row in q['tableRows']:
            html_content += "<tr>"
            for ci, cell in enumerate(row):
                if ci == 0:
                    html_content += f"""<td class="header-col">{cell}</td>"""
                else:
                    html_content += f"""<td style="min-height: 32pt; height: 32pt;">&nbsp;</td>"""
            html_content += "</tr>"
        html_content += "</table>"
        
    if q.get('type') == 'composition' and q.get('compositionSentences'):
        html_content += """<div class="items-container" style="line-height: 1.8;">"""
        for si, s in enumerate(q['compositionSentences']):
            html_content += f"""<div><b>{si+1})</b> {s}</div>"""
        html_content += "</div>"
        
    if q.get('writingLines', 0) > 0:
        html_content += """<div style="margin-top: 6pt;">"""
        for _ in range(q['writingLines']):
            html_content += """<div class="ans-line"></div>"""
        html_content += "</div>"

    if q.get('items'):
        cols = q.get('columnsPerRow', 1)
        grid_class = "grid-3" if cols == 3 else ("grid-2" if cols == 2 else "items-container")
        html_content += f"""<div class="{grid_class}">"""
        for idx_it, item in enumerate(q['items']):
            prefix = f"<b>{marathi_nums[idx_it] if idx_it < len(marathi_nums) else idx_it+1}) </b>" if q.get('type') == 'comprehension' else ""
            content_html = item.get('content', '').replace('\n', '<br>')
            html_content += f"""
            <div class="item-row">
              <div>{prefix}{content_html}</div>
            """
            lines = item.get('lines', 0)
            if lines > 0:
                html_content += """<div style="margin-top: 3pt;">"""
                for _ in range(lines):
                    html_content += """<div class="ans-line"></div>"""
                html_content += """</div>"""
            html_content += """</div>"""
        html_content += "</div>"

    html_content += """</div>"""

html_content += """
  </div>
</body>
</html>
"""

with open('scratch/full_paper_preview.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Saved scratch/full_paper_preview.html")

options = Options()
options.add_argument("--headless=new")
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")
options.add_argument("--window-size=1200,4500")

driver = webdriver.Chrome(options=options)
driver.get("file:///U:/paper-gen/scratch/full_paper_preview.html")
time.sleep(2)
sheet = driver.find_element(By.CLASS_NAME, "sheet")
sheet.screenshot("scratch/full_paper_sheet_combined.png")
print("Saved scratch/full_paper_sheet_combined.png")
driver.quit()
