#!/usr/bin/env bash
# Maestro mobile smoke: seed demo data, run .maestro/mobile flows on simulator/device.
# Requires: development build (com.flotory.mobile), Maestro CLI, reachable API for the app.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PREPARE=1
FLOW_ARGS=()

usage() {
  cat <<'EOF'
Usage: ./scripts/run-mobile-e2e.sh [options] [-- maestro-args...]

Options:
  --no-prepare   Skip demo data refresh (DB already has demo data)
  --prepare-only Run database seed and exit
  -h, --help     Show this help

Environment (defaults shown):
  APP_ID=com.flotory.mobile
  CUSTOMER_EMAIL=customer@example.com
  CUSTOMER_PASSWORD=password
  TEST_VENUE_NAME="Demo Cafe"
  NFC_TAP_TOKEN=democafenfcstandlocaltest00001

Prerequisites:
  - Maestro: curl -Ls "https://get.maestro.mobile.dev" | bash
  - iOS Simulator or device with dev build installed
  - App pointed at the seeded API (EXPO_PUBLIC_API_BASE_URL)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-prepare)
      PREPARE=0
      shift
      ;;
    --prepare-only)
      PREPARE=2
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      FLOW_ARGS+=("$@")
      break
      ;;
    *)
      FLOW_ARGS+=("$1")
      shift
      ;;
  esac
done

export APP_ID="${APP_ID:-com.flotory.mobile}"
export CUSTOMER_EMAIL="${CUSTOMER_EMAIL:-customer@example.com}"
export CUSTOMER_PASSWORD="${CUSTOMER_PASSWORD:-password}"
export TEST_VENUE_NAME="${TEST_VENUE_NAME:-Demo Cafe}"
export NFC_TAP_TOKEN="${NFC_TAP_TOKEN:-democafenfcstandlocaltest00001}"

seed_demo_database() {
  echo "==> Mobile E2E: refresh demo data (does not wipe your local MySQL)"
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    if docker compose ps app --status running -q 2>/dev/null | grep -q .; then
      docker compose exec -T app php artisan app:ensure-local-demo --with-demo-data --no-interaction
      return
    fi

    docker compose run --rm --no-deps app php artisan app:ensure-local-demo --with-demo-data --no-interaction
    return
  fi

  if command -v php >/dev/null 2>&1; then
    php artisan app:ensure-local-demo --with-demo-data --no-interaction
    return
  fi

  echo "ERROR: install PHP 8.4+ or start Docker to seed demo data." >&2
  exit 1
}

if [[ "$PREPARE" -eq 2 ]]; then
  seed_demo_database
  echo "==> Mobile E2E: database ready"
  exit 0
fi

if [[ "$PREPARE" -eq 1 ]]; then
  seed_demo_database
fi

if ! command -v maestro >/dev/null 2>&1; then
  echo "ERROR: Maestro CLI not found." >&2
  echo "Install: curl -Ls \"https://get.maestro.mobile.dev\" | bash" >&2
  exit 1
fi

echo "==> Mobile E2E: Maestro flows (.maestro/mobile)"
echo "    APP_ID=${APP_ID}"
echo "    CUSTOMER_EMAIL=${CUSTOMER_EMAIL}"
echo "    TEST_VENUE_NAME=${TEST_VENUE_NAME}"
echo "    NFC_TAP_TOKEN=${NFC_TAP_TOKEN}"

if [[ ${#FLOW_ARGS[@]} -gt 0 ]]; then
  maestro test "${FLOW_ARGS[@]}"
else
  maestro test .maestro/mobile
fi
