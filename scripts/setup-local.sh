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

if ! grep -q '^GOOGLE_MAPS_API_KEY=.\+' .env 2>/dev/null; then
  echo ""
  echo "WARNING: GOOGLE_MAPS_API_KEY is empty — venue address autocomplete will not work."
  echo "  Add your browser Maps key to .env.secrets, then re-run: ./scripts/setup-local.sh"
  echo "  Enable: Maps JavaScript API + Places API. Referrer: http://localhost:8000/*"
fi

echo ""
echo "Local URLs (same on every computer):"
echo "  App:   http://localhost:8000"
echo "  Vite:  http://localhost:5173"
echo ""
echo "Start: docker compose up --build"
echo "Google OAuth redirect (register once in Google Cloud): http://localhost:8000/auth/google/callback"
