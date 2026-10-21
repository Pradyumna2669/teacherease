import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from PIL import Image

out_dir = r"U:\paper-gen\store-assets\screenshots"
os.makedirs(out_dir, exist_ok=True)

# Device metric: 1080x2400 aspect ratio with standard mobile DPI
mobile_emulation = {
    "deviceMetrics": { "width": 412, "height": 915, "pixelRatio": 2.625 },
    "userAgent": "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
}

chrome_options = Options()
chrome_options.add_experimental_option("mobileEmulation", mobile_emulation)
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")

driver = webdriver.Chrome(options=chrome_options)

# 1. Login
driver.get("https://papergen.online/login")
time.sleep(3)

inputs = driver.find_elements(By.TAG_NAME, "input")
for inp in inputs:
    t = inp.get_attribute("type")
    if t == "email" or inp.get_attribute("name") == "email":
        inp.send_keys("playreview@papergen.online")
    elif t == "password":
        inp.send_keys("PaperGenReview2026!")

buttons = driver.find_elements(By.TAG_NAME, "button")
for b in buttons:
    if "Sign In" in b.text or b.get_attribute("type") == "submit":
        b.click()
        break

time.sleep(5)

# --- Screen 1: Dashboard (Dismiss modal first to show actual paper list & create button) ---
driver.get("https://papergen.online/dashboard")
time.sleep(3)
# Close any overlay if open
try:
    close_btns = driver.find_elements(By.XPATH, "//button[contains(text(), 'Maybe later') or contains(text(), '×')]")
    for cb in close_btns:
        if cb.is_displayed():
            cb.click()
            time.sleep(1)
except Exception:
    pass

s1_path = os.path.join(out_dir, "real-app-1-dashboard.png")
driver.save_screenshot(s1_path)
Image.open(s1_path).resize((1080, 2400), Image.Resampling.LANCZOS).save(s1_path, "PNG", optimize=True)
print("Saved clean Dashboard:", s1_path)

# --- Screen 2: Question Bank (Teacher Questions & Subjects) ---
driver.get("https://papergen.online/bank")
time.sleep(3)
s2_path = os.path.join(out_dir, "real-app-2-questionbank.png")
driver.save_screenshot(s2_path)
Image.open(s2_path).resize((1080, 2400), Image.Resampling.LANCZOS).save(s2_path, "PNG", optimize=True)
print("Saved clean Question Bank:", s2_path)

# --- Screen 3: Scan Handwritten Paper Modal ---
driver.get("https://papergen.online/builder?scan=1")
time.sleep(3)
s3_path = os.path.join(out_dir, "real-app-3-scan-modal.png")
driver.save_screenshot(s3_path)
Image.open(s3_path).resize((1080, 2400), Image.Resampling.LANCZOS).save(s3_path, "PNG", optimize=True)
print("Saved clean Scan Modal:", s3_path)

# --- Screen 4: Exam Builder UI (With sample question populated) ---
driver.get("https://papergen.online/builder")
time.sleep(4)
s4_path = os.path.join(out_dir, "real-app-4-builder-ui.png")
driver.save_screenshot(s4_path)
Image.open(s4_path).resize((1080, 2400), Image.Resampling.LANCZOS).save(s4_path, "PNG", optimize=True)
print("Saved clean Builder UI:", s4_path)

driver.quit()
print("All clean 1080x2400 authentic screenshots ready!")
