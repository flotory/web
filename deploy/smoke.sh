#!/usr/bin/env bash
set -euo pipefail

# Backend (Laravel container) — required. Bypasses nginx so a dead app fails deploy.
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8000}"

# Public site through nginx + TLS — set on production deploy (see deploy.sh).
PUBLIC_URL="${PUBLIC_URL:-}"

echo "==> Smoke check: backend ${BACKEND_URL}"
if [[ -n "${PUBLIC_URL}" ]]; then
  echo "==> Smoke check: public ${PUBLIC_URL}"
fi

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

# Laravel app must be up (containers may need a few seconds after recreate).
check_url "${BACKEND_URL}/up" "200" 12 2
check_url "${BACKEND_URL}/" "200" 3 2
check_url "${BACKEND_URL}/api/customer/cards" "401" 5 2 "application/json"

if [[ -n "${PUBLIC_URL}" ]]; then
  check_url "${PUBLIC_URL}/" "200" 8 2
  check_url "${PUBLIC_URL}/manifest.webmanifest" "200" 5 2
  check_url "${PUBLIC_URL}/api/customer/cards" "401" 5 2 "application/json"
fi

echo "==> Smoke checks passed."
