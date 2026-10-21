# PaperGen — Android app (Trusted Web Activity)

A TWA is a real Play Store app that renders papergen.online full-screen, with no
browser toolbar. There is no second codebase: the app **is** the website, so a
deploy to Vercel updates the app immediately, with no Play review.

`twa-manifest.json` is the whole configuration. Bubblewrap reads it to generate
the Android project.

---

## What you need once

- **Play Console account** — ₹2,100 (~$25), one-time, at
  <https://play.google.com/console>. Approval takes a day or two.
- **JDK 17** — installed at
  `C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot`. Bubblewrap wants 17
  specifically; 21 and 25 are also on this machine and get picked up from PATH
  first, so `JAVA_HOME` has to be set explicitly.
- **Android SDK** — already installed at
  `C:\Users\user\AppData\Local\Android\Sdk` (build-tools 34–36, platforms 34–36,
  cmdline-tools). Nothing to download.

## Build

Everything is scripted in `.tools/env.sh`, which pins JDK 17, points at the
existing SDK, and redirects the npm and Gradle caches onto U:.

```bash
cd android && source .tools/env.sh && ./build-test-apk.sh
```

Output is `android/papergen-test.apk` — sideload it to test on a real phone.

### Three things that bite on this machine

Worth knowing, because each one fails in a way that does not name its own cause.

1. **`bubblewrap build` refuses the SDK** — `The provided androidSdk isn't
   correct.` The SDK is fine. Bubblewrap checks for a top-level `tools/` or
   `bin/` folder, which is the pre-2020 layout; current SDKs put the same
   binaries under `cmdline-tools/latest/`. So the project is generated with
   `bubblewrap update`, and Gradle is then driven directly.

2. **`services.gradle.org` is unreachable from this network** — connections time
   out, so `./gradlew` cannot fetch its own distribution and dies before any
   build output appears. `dl.google.com` and `plugins.gradle.org` both work, so
   only the wrapper download is affected. The build uses a Gradle already on
   disk (`~/.gradle/wrapper/dists/gradle-8.13-bin`). A copy of 8.11.1 from the
   GitHub mirror sits in `.tools/dist/` as a fallback.

3. **C: is full** — around 80 MB free of 378 GB. Gradle's caches alone want a
   couple of GB, so `GRADLE_USER_HOME`, the npm cache and `TMPDIR` all point at
   U:. The JDK and SDK stay on C: but are only ever read.

### The launcher icon is patched by the build script

Bubblewrap generates `app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` as the
already-maskable icon inset 8.5dp over a white background. On a home screen that
reads as a white halo around a mark roughly a third smaller than every icon
beside it.

Correcting that file and committing it does nothing: `bubblewrap update` rewrites
it on every build. So `build-test-apk.sh` rewrites it immediately after that
step and before Gradle — a solid `#16243B` background with the paper mark on top
and no inset. It writes the file whole, so re-running the script is harmless.

Build the project any other way and you get the halo back; reapply the same
adaptive icon by hand before uploading.

## The signing key

`papergen-test.apk` is signed with **`test.keystore`** — a throwaway whose
password (`papergen-test`) is written down in `.tools/env.sh`. It exists so a
test build never needs the real key. **Do not ship it.**

The release key does not exist yet. Generate it when you first upload, keep the
password somewhere you will still have it in five years, and back the file up.
Losing it means you cannot ship an update under the same listing — you would
have to publish a new app and lose your reviews and installs.

Both keystores are covered by `android/.gitignore`.

## Domain verification — do not skip

Without this the app opens with a Chrome address bar across the top, which
immediately stops it feeling like an app.

1. After the first upload, open **Play Console → Release → Setup → App signing**
   and copy the **SHA-256 certificate fingerprint**.
2. Set these in Vercel (Production) and redeploy:

   ```
   ANDROID_PACKAGE_NAME=online.papergen.app
   ANDROID_CERT_FINGERPRINTS=<the SHA-256 fingerprint>
   ```

3. Confirm it is live:

   ```bash
   curl https://papergen.online/.well-known/assetlinks.json
   ```

   It should list the package name and fingerprint. If either variable is unset
   or empty it returns `[]`, which is valid JSON but will not verify — nothing
   logs a warning, so check the endpoint rather than assuming.

Use Play App Signing (the default). Then the fingerprint above is Google's, and
your upload key can be reset if it is ever lost.

### Current state — read before launch

`ANDROID_CERT_FINGERPRINTS` currently holds the **test keystore's** fingerprint,
so verification only works for locally built, test-signed APKs. The build Play
serves is re-signed by Google, so this **must** be replaced with the Play App
Signing SHA-256 from step 1 before the app goes live — otherwise every real
install shows the address bar.

Re-read the test fingerprint any time, to check what is deployed against what
you built:

```bash
cd android && source .tools/env.sh
"$JAVA_HOME/bin/keytool" -list -v -keystore test.keystore -alias papergen-test \
  -storepass papergen-test | grep SHA256
```

Both variables existed in Vercel but were set to empty strings until 2026-08-14.
That is why `assetlinks.json` returned `[]` while looking correctly configured:
`process.env` reported the names as present, and the endpoint's "not set up yet"
branch treats empty as unset.

## Play listing

You already have artwork:

- **App icon** (512×512) — `public/icons/icon-512.png`
- **Feature graphic** (1024×500) — needs making; the promo video's brand frame
  is a good starting point
- **Screenshots** — at least two phone shots. The builder with a paper open and
  the scan flow are the ones that sell it.
- **Short description** — "Make school exam papers in minutes. Scan a
  handwritten paper or type in 22 Indian languages."

Category: **Education**. Content rating questionnaire: everyone.

## Updating

Content and features ship with a normal Vercel deploy — nothing to do here.

Rebuild and re-upload only when something in `twa-manifest.json` changes (name,
icon, colours, shortcuts, start URL, orientation). Bump `appVersionCode` by 1
each time or Play rejects the upload.

Two such changes are already waiting for the next build:

- `orientation` is now `any`. Reviewing a full A4 sheet is exactly the landscape
  case, and Play flags portrait-locked apps on large screens. The web app
  switches to its desktop layout at the `lg:` breakpoint, so a phone turned
  sideways still gets the mobile layout — that is intended.
- `backgroundColor` is now `#FCFCF9`, the same colour the page paints, so the
  splash no longer changes shade the moment content appears.

Both are baked into the generated Android project, so they need a Bubblewrap
regeneration (`./build-test-apk.sh` does one) and an `appVersionCode` bump before
the next Play upload. It is still 1, which is correct until v1 is actually on
Play.
