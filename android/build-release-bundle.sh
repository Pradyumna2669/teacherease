#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

source .tools/env.sh

GRADLE=$(ls -d ~/.gradle/wrapper/dists/gradle-8.1[3-9]-bin/*/gradle-*/bin/gradle | tail -1)
echo "==> Building AAB using Gradle: $GRADLE"

"$GRADLE" --no-daemon bundleRelease

echo "==> Copying AAB to store-assets/bundle/"
cp -f app/build/outputs/bundle/release/app-release.aab ../store-assets/bundle/papergen-release-unsigned.aab || cp -f app/build/outputs/bundle/release/* ../store-assets/bundle/ || true

echo "==> Done building AAB bundle!"
