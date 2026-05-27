#!/usr/bin/env bash
set -euo pipefail

APP_URL="${1:-${APP_URL:-http://127.0.0.1}}"

echo "==> Smoke check: ${APP_URL}"

check_url() {
  local url="$1"
  local expected="$2"
  local actual
  actual="$(curl -s -o /dev/null -w '%{http_code}' "${url}")"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "Smoke check failed: ${url} returned ${actual} (expected ${expected})"
    exit 1
  fi
  echo "OK ${url} -> ${actual}"
}

check_url "${APP_URL}/" "200"
check_url "${APP_URL}/manifest.webmanifest" "200"
check_url "${APP_URL}/api/customer/cards" "401"

echo "==> Smoke checks passed."
