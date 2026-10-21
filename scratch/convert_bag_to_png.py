from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import os
import base64

options = Options()
options.add_argument('--headless=new')
options.add_argument('--window-size=1600,800')
driver = webdriver.Chrome(options=options)

with open('scratch/bag_diagram.svg', 'r', encoding='utf-8') as f:
    svg_text = f.read().replace('width="100%" height="100%"', 'width="650" height="250"')

html = f"""<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body {{ margin: 0; padding: 20px; background: white; }}
  </style>
</head>
<body>
  {svg_text}
</body>
</html>"""

with open('scratch/bag_render.html', 'w', encoding='utf-8') as f:
    f.write(html)

file_url = 'file:///' + os.path.abspath('scratch/bag_render.html').replace('\\', '/')
driver.get(file_url)

import time
time.sleep(1)

element = driver.find_element('tag name', 'svg')
element.screenshot('scratch/bag_diagram_highres.png')
driver.quit()

with open('scratch/bag_diagram_highres.png', 'rb') as f:
    png_b64 = 'data:image/png;base64,' + base64.b64encode(f.read()).decode('utf-8')

print('High-res PNG generated! Length:', len(png_b64))
with open('scratch/bag_png_datauri.txt', 'w', encoding='utf-8') as f:
    f.write(png_b64)
