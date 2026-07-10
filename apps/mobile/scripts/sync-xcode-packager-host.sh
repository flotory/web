#!/usr/bin/env bash
# Writes ios/.xcode.env.local with the current LAN IP so a physical iPhone can reach Metro.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_ENV_LOCAL="${ROOT}/ios/.xcode.env.local"
NODE_BINARY="${NODE_BINARY:-$(command -v node)}"

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [[ -z "${LAN_IP}" ]]; then
  echo "ERROR: Could not detect LAN IP. Connect to Wi-Fi and retry."
  exit 1
fi

mkdir -p "$(dirname "${IOS_ENV_LOCAL}")"
cat > "${IOS_ENV_LOCAL}" <<EOF
export NODE_BINARY=${NODE_BINARY}
export REACT_NATIVE_PACKAGER_HOSTNAME=${LAN_IP}
EOF

echo "==> Wrote ${IOS_ENV_LOCAL}"
echo "    REACT_NATIVE_PACKAGER_HOSTNAME=${LAN_IP}"
echo "    Rebuild in Xcode (Product → Clean Build Folder) after IP changes."
