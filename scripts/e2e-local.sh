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
npx playwright install chromium

echo "==> E2E local: build frontend"
npm run build

echo "==> E2E local: prepare sqlite app"
"${ROOT}/scripts/e2e-prepare.sh"

echo "==> E2E local: start Laravel server"
php artisan serve --host=127.0.0.1 --port=8000 > storage/logs/e2e-server.log 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

export PLAYWRIGHT_BASE_URL=http://127.0.0.1:8000
"${ROOT}/scripts/e2e-wait-for-app.sh"

echo "==> E2E local: Playwright smoke tests"
npm run test:e2e

echo "==> E2E local passed."
