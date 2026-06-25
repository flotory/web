#!/usr/bin/env bash
set -euo pipefail

# Archive and upload Flotory iOS to App Store Connect (same flow as TestFlight).
# Run from repo root or apps/mobile.

MOBILE="$(cd "$(dirname "$0")/.." && pwd)"
IOS="$MOBILE/ios"
TEAM_ID="${DEVELOPMENT_TEAM:-U353R2K2MJ}"
ARCHIVE_PATH="${ARCHIVE_PATH:-/tmp/Flotory.xcarchive}"
EXPORT_PATH="${EXPORT_PATH:-/tmp/Flotory-export}"

echo "→ Prebuild iOS (if ios/ missing or stale, run manually first)"
if [[ ! -d "$IOS/Flotory.xcworkspace" ]]; then
  (cd "$MOBILE" && npm run prebuild:ios)
  (cd "$IOS" && pod install)
fi

echo "→ Archive Release build"
xcodebuild -workspace "$IOS/Flotory.xcworkspace" -scheme Flotory \
  -configuration Release -archivePath "$ARCHIVE_PATH" \
  -destination 'generic/platform=iOS' "DEVELOPMENT_TEAM=$TEAM_ID" \
  -allowProvisioningUpdates archive

echo "→ Export and upload to App Store Connect"
xcodebuild -exportArchive -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$IOS/ExportOptions.plist" \
  -allowProvisioningUpdates

echo "✓ Upload complete. Open App Store Connect → select build → Submit for Review."
echo "  Guide: docs/APP_STORE_SUBMIT.md"
