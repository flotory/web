#!/usr/bin/env bash
# Same checks as .github/workflows/tests.yml — run before production deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

ensure_app_key() {
  if [[ ! -f .env ]]; then
    cp .env.example .env
  fi

  if grep -q '^APP_KEY=base64:' .env 2>/dev/null; then
    return
  fi

  if command -v php >/dev/null 2>&1; then
    php artisan key:generate --force
    return
  fi

  if docker compose ps app --status running -q 2>/dev/null | grep -q .; then
    docker compose exec -T app php artisan key:generate --force
  else
    docker compose run --rm --no-deps app php artisan key:generate --force
  fi
}

run_php_tests() {
  ensure_app_key

  if command -v php >/dev/null 2>&1; then
    php artisan test
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: php not found and Docker is unavailable."
    echo "Install PHP 8.4 locally or start Docker, then retry."
    exit 1
  fi

  echo "    (using Docker — php not installed locally)"
  if docker compose ps app --status running -q 2>/dev/null | grep -q .; then
    docker compose exec -T app php artisan test
  else
    docker compose run --rm app php artisan test
  fi
}

echo "==> Local CI: PHPUnit (backend)"
run_php_tests

echo "==> Local CI: frontend install"
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm not found."
  exit 1
fi
npm ci

echo "==> Local CI: mobile install (shared unit tests import mobile sources)"
npm ci --prefix apps/mobile

echo "==> Local CI: frontend typecheck + build"
npm run build

echo "==> Local CI: frontend unit tests"
npm run test:unit

echo "==> Local CI: mobile typecheck"
npm run typecheck --prefix apps/mobile

echo "==> Local CI: mobile unit tests (shared vitest)"
npm run test:unit -- apps/mobile/src

if command -v php >/dev/null 2>&1; then
  echo "==> Local CI: Playwright smoke"
  chmod +x scripts/e2e-prepare.sh scripts/e2e-wait-for-app.sh
  if ! npx playwright --version >/dev/null 2>&1; then
    npx playwright install chromium
  fi
  ./scripts/e2e-prepare.sh
  php artisan serve --host=127.0.0.1 --port=8000 > storage/logs/e2e-server.log 2>&1 &
  E2E_SERVER_PID=$!
  cleanup_e2e_server() {
    if kill -0 "${E2E_SERVER_PID}" 2>/dev/null; then
      kill "${E2E_SERVER_PID}" 2>/dev/null || true
    fi
  }
  trap cleanup_e2e_server EXIT
  export PLAYWRIGHT_BASE_URL=http://127.0.0.1:8000
  ./scripts/e2e-wait-for-app.sh
  npm run test:e2e
  cleanup_e2e_server
  trap - EXIT
else
  echo "    (skipping Playwright — install PHP locally or run: ./scripts/e2e-local.sh)"
fi

echo "==> Local CI passed (backend + frontend + mobile + e2e when php available)."
