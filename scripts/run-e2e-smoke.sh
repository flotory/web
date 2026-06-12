#!/usr/bin/env bash
# Playwright smoke: prepare sqlite app (--env=e2e), serve, wait, test.
# Uses local PHP 8.4+ when available; otherwise Docker (same as ci-local.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

E2E_HOST="${E2E_HOST:-127.0.0.1}"
E2E_PORT="${E2E_PORT:-8000}"
E2E_DOCKER_PORT="${E2E_DOCKER_PORT:-8765}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://${E2E_HOST}:${E2E_PORT}}"

PREPARE=1
INSTALL_BROWSER=0
E2E_SERVER_PID=""
E2E_CONTAINER_ID=""
E2E_USE_DOCKER=0

php_is_usable_for_e2e() {
  command -v php >/dev/null 2>&1 && php -r 'exit(version_compare(PHP_VERSION, "8.4.0", ">=") ? 0 : 1);'
}

docker_compose_available() {
  command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1
}

run_in_app_container() {
  local -a env_args=()
  if [[ -n "${E2E_APP_URL:-}" ]]; then
    env_args=(-e "E2E_APP_URL=${E2E_APP_URL}")
  fi

  if docker compose ps app --status running -q 2>/dev/null | grep -q .; then
    docker compose exec -T "${env_args[@]}" app "$@"
  else
    docker compose run --rm --no-deps "${env_args[@]}" app "$@"
  fi
}

usage() {
  cat <<'EOF'
Usage: ./scripts/run-e2e-smoke.sh [options]

Options:
  --no-prepare       Skip e2e-prepare.sh (app already seeded)
  --prepare-only     Run e2e-prepare.sh and exit
  --install-browser  Run npx playwright install chromium (local dev only; CI installs browsers in workflow)
EOF
}

run_e2e_prepare() {
  echo "==> E2E: prepare sqlite app"
  if php_is_usable_for_e2e; then
    ./scripts/e2e-prepare.sh
    return
  fi

  if ! docker_compose_available; then
    echo "ERROR: PHP 8.4+ is required for e2e prepare, and Docker is unavailable." >&2
    echo "Install PHP 8.4 locally or start Docker Desktop, then retry." >&2
    exit 1
  fi

  local php_version
  php_version="$(php -v 2>/dev/null | head -n 1 || echo 'php not found')"
  echo "    (using Docker — ${php_version})"
  export E2E_APP_URL="http://${E2E_HOST}:${E2E_DOCKER_PORT}"
  run_in_app_container ./scripts/e2e-prepare.sh
  unset E2E_APP_URL
}

cleanup_e2e() {
  if [[ -n "${E2E_SERVER_PID}" ]] && kill -0 "${E2E_SERVER_PID}" 2>/dev/null; then
    kill "${E2E_SERVER_PID}" 2>/dev/null || true
  fi

  if [[ -n "${E2E_CONTAINER_ID}" ]]; then
    docker stop "${E2E_CONTAINER_ID}" >/dev/null 2>&1 || true
    E2E_CONTAINER_ID=""
  fi

  if [[ "${E2E_USE_DOCKER}" -eq 0 && -f .env.smoke-backup ]]; then
    mv -f .env.smoke-backup .env
  elif [[ "${E2E_USE_DOCKER}" -eq 0 && -f .env && ! -f .env.smoke-backup ]]; then
  :
  fi
}

start_e2e_server() {
  if php_is_usable_for_e2e; then
    if [[ -f .env ]]; then
      cp .env .env.smoke-backup
    fi
    cp .env.e2e .env

    mkdir -p storage/logs
    echo "==> E2E: start Laravel server (${PLAYWRIGHT_BASE_URL})"
    php artisan serve --host="${E2E_HOST}" --port="${E2E_PORT}" > storage/logs/e2e-server.log 2>&1 &
    E2E_SERVER_PID=$!
    return
  fi

  if ! docker_compose_available; then
    echo "ERROR: PHP 8.4+ is required for Playwright smoke tests, and Docker is unavailable." >&2
    echo "Install PHP 8.4 locally or start Docker Desktop, then retry." >&2
    exit 1
  fi

  E2E_USE_DOCKER=1
  E2E_PORT="${E2E_DOCKER_PORT}"
  export PLAYWRIGHT_BASE_URL="http://${E2E_HOST}:${E2E_PORT}"
  export E2E_APP_URL="${PLAYWRIGHT_BASE_URL}"

  local php_version
  php_version="$(php -v 2>/dev/null | head -n 1 || echo 'php not found')"
  echo "==> E2E: start Laravel server via Docker (${PLAYWRIGHT_BASE_URL})"
  echo "    (using Docker — ${php_version})"

  E2E_CONTAINER_ID="$(docker compose run --rm -d --no-deps -p "${E2E_PORT}:${E2E_PORT}" app \
    php artisan serve --env=e2e --host=0.0.0.0 --port="${E2E_PORT}")"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-prepare)
      PREPARE=0
      shift
      ;;
    --prepare-only)
      chmod +x scripts/e2e-prepare.sh
      run_e2e_prepare
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

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required for Playwright smoke tests." >&2
  exit 1
fi

if ! php_is_usable_for_e2e && ! docker_compose_available; then
  echo "ERROR: PHP 8.4+ or Docker is required for Playwright smoke tests." >&2
  exit 1
fi

chmod +x scripts/e2e-prepare.sh scripts/e2e-wait-for-app.sh

if [[ "$INSTALL_BROWSER" -eq 1 ]]; then
  echo "==> E2E: install Playwright chromium"
  npx playwright install chromium
fi

if [[ "$PREPARE" -eq 1 ]]; then
  run_e2e_prepare
fi

if [[ ! -f .env.e2e ]]; then
  echo "ERROR: .env.e2e missing — run ./scripts/e2e-prepare.sh first." >&2
  exit 1
fi

trap cleanup_e2e EXIT

start_e2e_server

echo "==> E2E: wait for app"
./scripts/e2e-wait-for-app.sh

echo "==> E2E: Playwright smoke tests"
npm run test:e2e

cleanup_e2e
trap - EXIT

echo "==> E2E smoke passed."
