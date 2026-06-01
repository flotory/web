#!/usr/bin/env bash
# Same checks as .github/workflows/tests.yml — run before production deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

echo "==> Local CI: PHP tests"
if command -v php >/dev/null 2>&1; then
  if [[ ! -f .env ]]; then
    cp .env.example .env
    php artisan key:generate --force
  fi
  php artisan test
else
  echo "ERROR: php not found. Install PHP 8.4 or run tests inside Docker:"
  echo "  docker compose run --rm app php artisan test"
  exit 1
fi

echo "==> Local CI: frontend typecheck + build"
if command -v npm >/dev/null 2>&1; then
  npm ci
  npm run build
else
  echo "ERROR: npm not found."
  exit 1
fi

echo "==> Local CI passed."
