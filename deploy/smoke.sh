#!/usr/bin/env bash
set -euo pipefail

APP_URL="${1:-${APP_URL:-http://127.0.0.1}}"

echo "==> Smoke check: ${APP_URL}"

check_url() {
  local url="$1"
  local expected="$2"
  local retries="${3:-1}"
  local delay_s="${4:-2}"
  local accept_header="${5:-}"
  local also_ok="${6:-}"
  local actual
  local attempt=1

  while [[ ${attempt} -le ${retries} ]]; do
    if [[ -n "${accept_header}" ]]; then
      actual="$(curl -s -o /dev/null -w '%{http_code}' -H "Accept: ${accept_header}" "${url}")"
    else
      actual="$(curl -s -o /dev/null -w '%{http_code}' "${url}")"
    fi
    if [[ "${actual}" == "${expected}" || ( -n "${also_ok}" && "${actual}" == "${also_ok}" ) ]]; then
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

# HTTP→HTTPS redirect on production returns 301 for localhost checks.
check_url "${APP_URL}/" "200" 12 2 "" "301"
check_url "${APP_URL}/manifest.webmanifest" "200" 5 1
check_url "${APP_URL}/api/customer/cards" "401" 5 1 "application/json"

echo "==> Smoke checks passed."
