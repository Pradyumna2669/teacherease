# Step-by-Step: Building Production AAB with release.keystore

### 1. Keystore Locations
* Production Keystore: [`android/release.keystore`](file:///u:/paper-gen/android/release.keystore) (copied from `app/release.keystore`).
* Manifest: [`android/twa-manifest.json`](file:///u:/paper-gen/android/twa-manifest.json) has been pointed to `./release.keystore`.

---

### 2. Generate the Signed Play Store Bundle (.aab)

In Windows PowerShell / CMD:

```powershell
# 1. Set environment variables
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
$env:ANDROID_HOME = "C:\Users\user\AppData\Local\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

# 2. Build the release bundle using Gradle
cd U:\paper-gen\android
.\gradlew.bat bundleRelease
```

This generates:
`android/app/build/outputs/bundle/release/app-release.aab`

---

### 3. Extract SHA-256 Fingerprint for Digital Asset Links
Run with your keystore password:

```powershell
& "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot\bin\keytool.exe" -list -v -keystore "U:\paper-gen\android\release.keystore"
```

Look for `Certificate fingerprints:` -> `SHA256: XX:XX:XX:...`.

Copy this fingerprint and add it to Vercel:
* `ANDROID_PACKAGE_NAME` = `online.papergen.app`
* `ANDROID_CERT_FINGERPRINTS` = `<Your-SHA-256-Fingerprint>`

Redeploy to Vercel. This removes the browser toolbar completely and runs full screen.
