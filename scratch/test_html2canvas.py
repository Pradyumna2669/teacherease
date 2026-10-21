from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import os
import json
import base64
import time

options = Options()
options.add_argument('--headless=new')
driver = webdriver.Chrome(options=options)

with open('scratch/paper_61463c3b_combined_q1.json', 'r', encoding='utf-8') as f:
    paper = json.load(f)

img_src = paper['questions'][3]['images'][0]

html = """<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
</head>
<body style="background: white; padding: 20px;">
  <div id="capture" style="width: 650px; background: white; padding: 20px;">
    <h3>Question 4</h3>
    <img id="testimg" src="__IMG_SRC__" style="width: 600px; display: block; border: 1px solid red;" />
  </div>
  <script>
    window.onload = async () => {
      try {
        const canvas = await html2canvas(document.getElementById('capture'), { scale: 2, useCORS: true, logging: true });
        window.canvasData = canvas.toDataURL('image/png');
        window.isDone = true;
      } catch (e) {
        window.error = e.toString();
        window.isDone = true;
      }
    };
  </script>
</body>
</html>""".replace('__IMG_SRC__', img_src)

with open('scratch/test_html2canvas.html', 'w', encoding='utf-8') as f:
    f.write(html)

file_url = 'file:///' + os.path.abspath('scratch/test_html2canvas.html').replace('\\', '/')
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
    with open('scratch/canvas_output.png', 'wb') as out_f:
        out_f.write(raw)
    print('Saved canvas output to scratch/canvas_output.png')

driver.quit()
