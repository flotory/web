#!/bin/sh
set -e

cd "${CI_PRIMARY_REPOSITORY_PATH}/apps/mobile"

echo "==> Installing mobile dependencies..."
npm ci

echo "==> Generating iOS native project..."
npx expo prebuild --platform ios --no-install

echo "==> Installing CocoaPods..."
cd ios
pod install
