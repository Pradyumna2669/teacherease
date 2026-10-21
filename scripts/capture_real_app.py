import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from PIL import Image

out_dir = r"U:\paper-gen\store-assets\screenshots"
os.makedirs(out_dir, exist_ok=True)

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--user-agent=Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36")

driver = webdriver.Chrome(options=chrome_options)
driver.set_window_size(412, 915)

# Step 1: Open login page
driver.get("https://papergen.online/login")
time.sleep(3)

inputs = driver.find_elements(By.TAG_NAME, "input")
for inp in inputs:
    t = inp.get_attribute("type")
    if t == "email" or inp.get_attribute("name") == "email":
        inp.send_keys("playreview@papergen.online")
    elif t == "password":
        inp.send_keys("PaperGenReview2026!")

# Click Sign In button
buttons = driver.find_elements(By.TAG_NAME, "button")
for b in buttons:
    if "Sign In" in b.text or b.get_attribute("type") == "submit":
        b.click()
        break

time.sleep(6)
print("URL after login:", driver.current_url)

targets = [
    ("app-screen-1-dashboard.png", "https://papergen.online/dashboard"),
    ("app-screen-2-builder.png", "https://papergen.online/builder"),
    ("app-screen-3-bank.png", "https://papergen.online/bank"),
]

for filename, url in targets:
    driver.get(url)
    time.sleep(4)
    raw_path = os.path.join(out_dir, filename)
    driver.save_screenshot(raw_path)
    print(f"Captured: {filename} at {driver.current_url}")
    
    # Resize to standard 1080x2400 Play Store format
    im = Image.open(raw_path)
    resized = im.resize((1080, 2400), Image.Resampling.LANCZOS)
    resized.save(raw_path, "PNG", optimize=True)
    print(f"Upscaled to 1080x2400: {raw_path}")

# Trigger scan modal on builder
driver.get("https://papergen.online/builder?scan=1")
time.sleep(4)
scan_path = os.path.join(out_dir, "app-screen-4-scan-modal.png")
driver.save_screenshot(scan_path)
im = Image.open(scan_path)
im.resize((1080, 2400), Image.Resampling.LANCZOS).save(scan_path, "PNG", optimize=True)
print(f"Captured Scan Modal: {scan_path}")

driver.quit()
print("All real in-app screens captured successfully!")
