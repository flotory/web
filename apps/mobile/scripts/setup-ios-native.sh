#!/usr/bin/env bash
# One-shot: fix Homebrew (if needed), install CocoaPods, pod install, open Xcode.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="${ROOT}/ios"

echo "==> Flotory mobile iOS native setup"
echo "    Project: ${ROOT}"

if ! command -v brew >/dev/null 2>&1; then
  echo "ERROR: Homebrew not found. Install from https://brew.sh then re-run this script."
  exit 1
fi

if [[ ! -w /opt/homebrew ]]; then
  echo "==> Homebrew not writable — fixing ownership (sudo required)..."
  sudo chown -R "$(whoami)" /opt/homebrew
  sudo chown -R "$(whoami)" "${HOME}/Library/Caches/Homebrew" 2>/dev/null || true
  sudo chown -R "$(whoami)" "${HOME}/Library/Logs/Homebrew" 2>/dev/null || true
fi

if ! xcode-select -p >/dev/null 2>&1; then
  echo "ERROR: Xcode Command Line Tools missing. Run: xcode-select --install"
  exit 1
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "==> Installing CocoaPods via Homebrew..."
  brew install cocoapods
fi

echo "==> CocoaPods: $(pod --version)"

if [[ ! -d "${IOS_DIR}" ]]; then
  echo "==> ios/ missing — running expo prebuild..."
  cd "${ROOT}"
  npx expo prebuild --platform ios
fi

echo "==> pod install..."
cd "${IOS_DIR}"
pod install

WORKSPACE="${IOS_DIR}/FlotoryMobile.xcworkspace"
if [[ -d "${WORKSPACE}" ]]; then
  echo "==> Opening Xcode workspace..."
  open "${WORKSPACE}"
  echo "Done. Select your physical iPhone in Xcode and press Run."
else
  echo "ERROR: ${WORKSPACE} not found after pod install."
  exit 1
fi
