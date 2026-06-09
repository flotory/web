#!/bin/sh
# Keep .env valid for Docker MySQL; auto-restore if e2e tests overwrote it.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

is_docker_env() {
  grep -q '^DB_CONNECTION=mysql' .env 2>/dev/null \
    && grep -q '^DB_HOST=mysql' .env 2>/dev/null
}

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

if is_docker_env; then
  cp .env .env.docker.backup
  exit 0
fi

echo ""
echo "WARNING: .env is not configured for Docker MySQL (often caused by ./scripts/e2e-prepare.sh)."
echo "         Your MySQL data in Docker volume mysql_data is usually still intact."
echo ""

if [ -f .env.docker.backup ]; then
  cp .env.docker.backup .env
  echo "Restored .env from .env.docker.backup"
  exit 0
fi

if [ -x "${ROOT}/scripts/restore-docker-env.sh" ]; then
  bash "${ROOT}/scripts/restore-docker-env.sh"
  exit 0
fi

echo "ERROR: Run ./scripts/restore-docker-env.sh manually."
exit 1
