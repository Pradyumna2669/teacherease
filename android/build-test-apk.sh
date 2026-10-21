#!/usr/bin/env bash
#
# Build a sideloadable test APK.
#
#   cd android && source .tools/env.sh && ./build-test-apk.sh
#
# This drives Gradle directly rather than using `bubblewrap build`, and uses a
# Gradle already on disk rather than the wrapper. Both are worked around on
# purpose — see the "Three things that bite" section in README.md.
#
# The APK is signed with a throwaway key. It is for testing on your own phone,
# never for Play.

set -euo pipefail
cd "$(dirname "$0")"

[ -n "${ANDROID_HOME:-}" ] || { echo "run: source .tools/env.sh" >&2; exit 1; }

BW=".tools/node_modules/.bin/bubblewrap"
KEYSTORE="test.keystore"
ALIAS="papergen-test"
PASS="${BUBBLEWRAP_KEYSTORE_PASSWORD:-papergen-test}"
OUT="papergen-test.apk"

# Newest build-tools wins; any of 34+ can sign and align this project.
BT="$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools" | sort -V | tail -1)"

# The wrapper cannot reach services.gradle.org from here, so use a distribution
# that is already unpacked. 8.11.1+ is required by AGP 8.9.1.
GRADLE=$(ls -d ~/.gradle/wrapper/dists/gradle-8.1[3-9]-bin/*/gradle-*/bin/gradle 2>/dev/null | tail -1 || true)
[ -n "$GRADLE" ] || { echo "no Gradle 8.13+ found under ~/.gradle/wrapper/dists" >&2; exit 1; }

echo "==> jdk       $("$JAVA_HOME/bin/java" -version 2>&1 | head -1)"
echo "==> gradle    $GRADLE"
echo "==> buildtools $BT"

if [ ! -f "$KEYSTORE" ]; then
  echo "==> creating throwaway test keystore"
  "$JAVA_HOME/bin/keytool" -genkeypair -keystore "$KEYSTORE" -alias "$ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$PASS" -keypass "$PASS" \
    -dname "CN=PaperGen Test Build, OU=Testing, O=PaperGen, L=Pune, ST=Maharashtra, C=IN"
fi

echo "==> regenerating project from twa-manifest.json"
"$BW" update --skipVersionUpgrade

# Bubblewrap writes an adaptive icon that insets the already-maskable icon by
# 8.5dp over white, so the launcher shows a white halo around a mark a third
# smaller than its neighbours. `bubblewrap update` above rewrites the file every
# build, so the fix has to be reapplied here instead of committed. The file is
# written whole, so running this twice changes nothing. ic_maskable's own field
# is the same navy as the background layer, leaving just the paper mark.
echo "==> patching adaptive launcher icon"
cat > app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<!-- Written by build-test-apk.sh; bubblewrap overwrites this file. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background>
        <color android:color="#16243B" />
    </background>
    <foreground android:drawable="@mipmap/ic_maskable" />
</adaptive-icon>
XML

echo "==> gradle assembleRelease"
"$GRADLE" --no-daemon assembleRelease

echo "==> align + sign"
"$BT/zipalign.exe" -p -f 4 \
  app/build/outputs/apk/release/app-release-unsigned.apk .tools/aligned.apk
"$BT/apksigner.bat" sign \
  --ks "$KEYSTORE" --ks-pass "pass:$PASS" --key-pass "pass:$PASS" \
  --ks-key-alias "$ALIAS" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$OUT" .tools/aligned.apk
rm -f .tools/aligned.apk

echo "==> verify"
"$BT/apksigner.bat" verify --verbose "$OUT" | grep -E "^Verified using v[123] " || true
"$BT/aapt2.exe" dump badging "$OUT" | grep -E "^package|^application-label:"

# Printed in the colon-separated upper case that assetlinks.json uses, so it can
# be compared by eye with ANDROID_CERT_FINGERPRINTS on Vercel. A mismatch here is
# exactly what makes the app open with a Chrome toolbar and nothing else says so.
echo "==> signing fingerprint (must match ANDROID_CERT_FINGERPRINTS)"
"$BT/apksigner.bat" verify --print-certs "$OUT" \
  | sed -n 's/^Signer #1 certificate SHA-256 digest: //p' \
  | tr 'a-z' 'A-Z' | sed 's/../&:/g; s/:$//'

echo
echo "built $OUT ($(du -h "$OUT" | cut -f1))"
echo "install with: adb install -r $OUT"
