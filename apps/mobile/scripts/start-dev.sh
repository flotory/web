#!/usr/bin/env bash
# Start Metro for Xcode / physical iPhone dev builds (API stays on production).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

bash scripts/sync-xcode-packager-host.sh

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1)"
echo ""
echo "==> Starting Metro on LAN (${LAN_IP}:8081)"
echo "    API: ${EXPO_PUBLIC_API_BASE_URL:-https://flotory.com/api}"
echo "    Then: open ios/Flotory.xcworkspace → select iPhone → Run"
echo "    JS logs appear in this terminal. Native logs: npx react-native log-ios"
echo ""

exec npx expo start --lan --clear
