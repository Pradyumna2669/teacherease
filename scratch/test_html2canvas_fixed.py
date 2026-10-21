from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import os
import json
import base64
import time

options = Options()
options.add_argument('--headless=new')
driver = webdriver.Chrome(options=options)

with open('scratch/bag_diagram.svg', 'r', encoding='utf-8') as f:
    svg_text = f.read()

svg_fixed = svg_text.replace('width="100%" height="100%"', 'width="650" height="250"')
img_src = 'data:image/svg+xml;base64,' + base64.b64encode(svg_fixed.encode('utf-8')).decode('utf-8')

html = f"""<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
</head>
<body style="background: white; padding: 20px;">
  <div id="capture" style="width: 650px; background: white; padding: 20px;">
    <h3>Question 4</h3>
    <img id="testimg" src="{img_src}" style="width: 600px; display: block; border: 1px solid red;" />
  </div>
  <script>
    window.onload = async () => {{
      try {{
        const canvas = await html2canvas(document.getElementById('capture'), {{ scale: 2, useCORS: true, logging: true }});
        window.canvasData = canvas.toDataURL('image/png');
        window.isDone = true;
      }} catch (e) {{
        window.error = e.toString();
        window.isDone = true;
      }}
    }};
  </script>
</body>
</html>"""

with open('scratch/test_svg_fixed.html', 'w', encoding='utf-8') as f:
    f.write(html)

file_url = 'file:///' + os.path.abspath('scratch/test_svg_fixed.html').replace('\\', '/')
driver.get(file_url)

for _ in range(10):
    time.sleep(1)
    is_done = driver.execute_script('return window.isDone;')
    if is_done:
        break

err = driver.execute_script('return window.error;')
canvas_data = driver.execute_script('return window.canvasData;')
print('is_done:', is_done, 'err:', err)
if canvas_data:
    raw = base64.b64decode(canvas_data.split(',')[1])
    with open('scratch/canvas_output_fixed.png', 'wb') as out_f:
        out_f.write(raw)
    print('Saved canvas output to scratch/canvas_output_fixed.png')

driver.quit()
