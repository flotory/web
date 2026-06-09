#!/usr/bin/env bash
# Playwright smoke: prepare sqlite app (--env=e2e), serve, wait, test.
# Used by ci-local.sh, e2e-local.sh, and .github/workflows/tests.yml.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

E2E_HOST="${E2E_HOST:-127.0.0.1}"
E2E_PORT="${E2E_PORT:-8000}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://${E2E_HOST}:${E2E_PORT}}"

PREPARE=1
INSTALL_BROWSER=0

usage() {
  cat <<'EOF'
Usage: ./scripts/run-e2e-smoke.sh [options]

Options:
  --no-prepare       Skip e2e-prepare.sh (app already seeded)
  --prepare-only     Run e2e-prepare.sh and exit
  --install-browser  Run npx playwright install chromium if missing
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-prepare)
      PREPARE=0
      shift
      ;;
    --prepare-only)
      PREPARE=1
      INSTALL_BROWSER=0
      chmod +x scripts/e2e-prepare.sh
      ./scripts/e2e-prepare.sh
      exit 0
      ;;
    --install-browser)
      INSTALL_BROWSER=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v php >/dev/null 2>&1; then
  echo "ERROR: php is required for Playwright smoke tests." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required for Playwright smoke tests." >&2
  exit 1
fi

chmod +x scripts/e2e-prepare.sh scripts/e2e-wait-for-app.sh

if [[ "$INSTALL_BROWSER" -eq 1 ]] || ! npx playwright --version >/dev/null 2>&1; then
  npx playwright install chromium
fi

if [[ "$PREPARE" -eq 1 ]]; then
  echo "==> E2E: prepare sqlite app"
  ./scripts/e2e-prepare.sh
fi

mkdir -p storage/logs

echo "==> E2E: start Laravel server (${PLAYWRIGHT_BASE_URL}, --env=e2e)"
php artisan serve --host="${E2E_HOST}" --port="${E2E_PORT}" --env=e2e > storage/logs/e2e-server.log 2>&1 &
E2E_SERVER_PID=$!

cleanup_e2e_server() {
  if kill -0 "${E2E_SERVER_PID}" 2>/dev/null; then
    kill "${E2E_SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup_e2e_server EXIT

echo "==> E2E: wait for app"
./scripts/e2e-wait-for-app.sh

echo "==> E2E: Playwright smoke tests"
npm run test:e2e

cleanup_e2e_server
trap - EXIT

echo "==> E2E smoke passed."
