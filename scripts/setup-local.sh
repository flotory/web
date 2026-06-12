#!/usr/bin/env bash
# Bootstrap local dev on a new machine. Safe to re-run; won't overwrite .env.secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/env-merge.sh
source "${ROOT}/scripts/lib/env-merge.sh"

if [[ ! -f .env.secrets ]]; then
  cp .env.secrets.example .env.secrets
  echo "Created .env.secrets — add GOOGLE_CLIENT_SECRET (same on every computer)."
fi

if [[ ! -f .env ]] || [[ "${1:-}" == "--force" ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
else
  echo "Using existing .env (pass --force to recreate from .env.example)"
fi

env_merge_from_secrets .env.secrets .env
env_merge_save_docker_backup .env
echo "Saved .env.docker.backup (auto-restored on Docker start if .env is corrupted — see scripts/restore-docker-env.sh)."

if ! grep -q '^VITE_GOOGLE_MAPS_API_KEY=.\+' .env 2>/dev/null; then
  echo ""
  echo "WARNING: VITE_GOOGLE_MAPS_API_KEY is empty — venue address autocomplete will not work."
  echo "  Add your browser Maps key to .env.secrets, then re-run: ./scripts/setup-local.sh"
  echo "  Enable: Maps JavaScript API + Places API. Referrer: http://localhost:8000/*"
fi

if ! grep -qE '^GOOGLE_MAPS_SERVER_API_KEY=.+|^GOOGLE_MAPS_API_KEY=.+' .env 2>/dev/null; then
  echo ""
  echo "WARNING: GOOGLE_MAPS_SERVER_API_KEY is empty — campaign happy-hour timezone lookup will fall back to UTC."
  echo "  Add a server Maps key with Time Zone API enabled to .env.secrets."
fi

echo ""
echo "Local URLs (same on every computer):"
echo "  App:   http://localhost:8000"
echo "  Vite:  http://localhost:5173"
echo ""
echo "Start: ./scripts/docker-up.sh --build"
echo "       (or: docker compose up --build — fails if host port 5173 is already in use)"
echo "Google OAuth redirect (register once in Google Cloud): http://localhost:8000/auth/google/callback"
