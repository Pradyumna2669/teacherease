import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from PIL import Image

out_dir = r"U:\paper-gen\store-assets\screenshots"

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

# Step 1: Login
driver.get("https://papergen.online/login")
time.sleep(3)

for inp in driver.find_elements(By.TAG_NAME, "input"):
    t = inp.get_attribute("type")
    if t == "email" or inp.get_attribute("name") == "email":
        inp.send_keys("playreview@papergen.online")
    elif t == "password":
        inp.send_keys("PaperGenReview2026!")

for b in driver.find_elements(By.TAG_NAME, "button"):
    if "Sign In" in b.text or b.get_attribute("type") == "submit":
        b.click()
        break

time.sleep(5)

# Screen 5: Builder with Scan Dialog Open
driver.get("https://papergen.online/builder")
time.sleep(4)

for b in driver.find_elements(By.TAG_NAME, "button"):
    if "Scan handwritten paper" in b.text:
        b.click()
        time.sleep(2)
        break

s5_path = os.path.join(out_dir, "real-app-5-scan-dialog.png")
driver.save_screenshot(s5_path)
Image.open(s5_path).resize((1080, 2400), Image.Resampling.LANCZOS).save(s5_path, "PNG", optimize=True)
print("Saved real scan dialog:", s5_path)

# Screen 6: Start Wizard / AI Generate from Dashboard
driver.get("https://papergen.online/dashboard")
time.sleep(3)

try:
    for cb in driver.find_elements(By.TAG_NAME, "button"):
        if "Maybe later" in cb.text or cb.text == "×":
            cb.click()
            time.sleep(1)
except Exception:
    pass

for b in driver.find_elements(By.TAG_NAME, "button"):
    if "New Paper" in b.text or "Generate a paper" in b.text:
        b.click()
        time.sleep(2)
        break

s6_path = os.path.join(out_dir, "real-app-6-create-wizard.png")
driver.save_screenshot(s6_path)
Image.open(s6_path).resize((1080, 2400), Image.Resampling.LANCZOS).save(s6_path, "PNG", optimize=True)
print("Saved real wizard screen:", s6_path)

driver.quit()
print("All authentic interactive screens captured!")
