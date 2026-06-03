#!/usr/bin/env bash
# Same checks as .github/workflows/tests.yml — run before production deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

run_php_tests() {
  if command -v php >/dev/null 2>&1; then
    if [[ ! -f .env ]]; then
      cp .env.example .env
      php artisan key:generate --force
    fi
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

echo "==> Local CI: frontend typecheck + build"
npm run build

echo "==> Local CI: frontend unit tests"
npm run test:unit

echo "==> Local CI: mobile typecheck"
npm ci --prefix apps/mobile
npm run typecheck --prefix apps/mobile

echo "==> Local CI passed (backend + frontend + mobile)."
