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

  if php_is_usable_for_tests; then
    php artisan key:generate --force
    return
  fi

  if docker compose ps app --status running -q 2>/dev/null | grep -q .; then
    docker compose exec -T app php artisan key:generate --force
  else
    docker compose run --rm --no-deps app php artisan key:generate --force
  fi
}

php_is_usable_for_tests() {
  command -v php >/dev/null 2>&1 && php -r 'exit(version_compare(PHP_VERSION, "8.4.0", ">=") ? 0 : 1);'
}

run_php_tests() {
  ensure_app_key

  if php_is_usable_for_tests; then
    php artisan test
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: php not found and Docker is unavailable."
    echo "Install PHP 8.4 locally or start Docker, then retry."
    exit 1
  fi

  echo "    (using Docker — php not installed locally; forcing sqlite in-memory for tests)"
  local docker_test_env=(
    -e APP_ENV=testing
    -e DB_CONNECTION=sqlite
    -e "DB_DATABASE=:memory:"
  )
  if docker compose ps app --status running -q 2>/dev/null | grep -q .; then
    docker compose exec -T "${docker_test_env[@]}" app php artisan test
  else
    docker compose run --rm "${docker_test_env[@]}" app php artisan test
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

if php_is_usable_for_tests; then
  echo "==> Local CI: Playwright smoke"
  chmod +x scripts/run-e2e-smoke.sh
  ./scripts/run-e2e-smoke.sh --install-browser
elif command -v docker >/dev/null 2>&1; then
  echo "==> Local CI: Playwright smoke (via Docker PHP)"
  chmod +x scripts/run-e2e-smoke.sh scripts/e2e-prepare.sh
  docker compose exec -T app ./scripts/e2e-prepare.sh
  docker compose run --rm -d -p 8765:8765 --no-deps app php artisan serve --env=e2e --host=0.0.0.0 --port=8765 >/dev/null
  sleep 3
  PLAYWRIGHT_BASE_URL=http://127.0.0.1:8765 npm run test:e2e
  e2e_container="$(docker ps -q --filter publish=8765 | head -n 1)"
  if [[ -n "${e2e_container}" ]]; then
    docker stop "${e2e_container}" >/dev/null 2>&1 || true
  fi
else
  echo "    (skipping Playwright — install PHP 8.4+ locally or run: ./scripts/e2e-local.sh)"
fi

echo "==> Local CI passed (backend + frontend + mobile + e2e when php available)."
