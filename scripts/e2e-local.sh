#!/usr/bin/env bash
# Run the same Playwright smoke suite as GitHub Actions (requires php + node locally).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

if ! command -v php >/dev/null 2>&1; then
  echo "ERROR: php 8.4 is required. Use Docker or install PHP locally."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required."
  exit 1
fi

echo "==> E2E local: install dependencies"
composer install --no-interaction --prefer-dist --no-progress
npm ci

echo "==> E2E local: build frontend"
npm run build

exec "${ROOT}/scripts/run-e2e-smoke.sh" --install-browser
