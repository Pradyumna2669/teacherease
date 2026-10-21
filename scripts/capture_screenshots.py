import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

out_dir = r"U:\paper-gen\store-assets\screenshots"
os.makedirs(out_dir, exist_ok=True)

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--user-agent=Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36")

driver = webdriver.Chrome(options=chrome_options)

# Set mobile portrait dimensions (Pixel 8 / Standard 1080x2400 aspect)
driver.set_window_size(412, 915)

pages = [
    ("1-real-dashboard.png", "https://papergen.online/dashboard"),
    ("2-real-builder.png", "https://papergen.online/builder"),
    ("3-real-bank.png", "https://papergen.online/bank"),
    ("4-real-languages.png", "https://papergen.online/languages"),
    ("5-real-pricing.png", "https://papergen.online/pricing"),
    ("6-real-home.png", "https://papergen.online/"),
]

for filename, url in pages:
    print(f"Capturing {url} -> {filename}...")
    try:
        driver.get(url)
        time.sleep(3) # Wait for Next.js hydration and fonts
        path = os.path.join(out_dir, filename)
        driver.save_screenshot(path)
        print(f"Saved: {path} ({os.path.getsize(path)} bytes)")
    except Exception as e:
        print(f"Failed {url}: {e}")

driver.quit()
print("All screenshots successfully captured!")
