#!/usr/bin/env bash
# Restore .env for Docker MySQL dev after e2e-prepare or other accidents.
# Does NOT wipe mysql_data — only fixes Laravel connection settings on disk.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/env-merge.sh
source "${ROOT}/scripts/lib/env-merge.sh"

SOURCE=""
if [[ -f .env.docker.backup ]]; then
  SOURCE=".env.docker.backup"
elif [[ -f .env ]]; then
  SOURCE=".env"
fi

SAVED_APP_KEY=""
SAVED_GOOGLE=""
if [[ -n "$SOURCE" ]]; then
  SAVED_APP_KEY="$(env_merge_get_value APP_KEY "$SOURCE")"
  SAVED_GOOGLE="$(env_merge_get_value GOOGLE_MAPS_API_KEY "$SOURCE")"
fi

cp .env.example .env
echo "Rebuilt .env from .env.example for Docker MySQL."

if [[ -n "$SAVED_APP_KEY" ]]; then
  env_merge_set_line APP_KEY "$SAVED_APP_KEY"
  echo "Kept existing APP_KEY."
else
  if docker compose ps app --status running -q 2>/dev/null | grep -q .; then
    docker compose exec -T app php artisan key:generate --force
  else
    echo "Start Docker and run: docker compose exec app php artisan key:generate --force"
  fi
fi

if [[ -f .env.secrets ]]; then
  env_merge_from_secrets .env.secrets .env
  echo "Merged .env.secrets."
elif [[ -n "$SAVED_GOOGLE" ]]; then
  env_merge_set_line GOOGLE_MAPS_API_KEY "$SAVED_GOOGLE"
fi

env_merge_apply_docker_mysql .env
env_merge_save_docker_backup .env

echo ""
echo "Docker .env restored. MySQL data in volume mysql_data was NOT deleted."
echo "  docker compose restart app"
echo "  docker compose exec app php artisan app:ensure-local-demo"
echo "  Login: owner@example.com / password at http://localhost:8000"
