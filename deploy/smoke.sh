#!/usr/bin/env bash
set -euo pipefail

APP_URL="${1:-${APP_URL:-http://127.0.0.1}}"

echo "==> Smoke check: ${APP_URL}"

check_url() {
  local url="$1"
  local expected="$2"
  local retries="${3:-1}"
  local delay_s="${4:-2}"
  local actual
  local attempt=1

  while [[ ${attempt} -le ${retries} ]]; do
    actual="$(curl -s -o /dev/null -w '%{http_code}' "${url}")"
    if [[ "${actual}" == "${expected}" ]]; then
      echo "OK ${url} -> ${actual}"
      return
    fi

    if [[ ${attempt} -lt ${retries} ]]; then
      echo "Retry ${attempt}/${retries} for ${url}: got ${actual}, expected ${expected}..."
      sleep "${delay_s}"
    fi
    ((attempt++))
  done

  echo "Smoke check failed: ${url} returned ${actual} (expected ${expected}) after ${retries} attempts"
  exit 1
}

check_url "${APP_URL}/" "200" 12 2
check_url "${APP_URL}/manifest.webmanifest" "200" 5 1
check_url "${APP_URL}/api/customer/cards" "401" 5 1

echo "==> Smoke checks passed."
