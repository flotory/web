#!/usr/bin/env bash
# Start local Docker stack. Picks a free host port for Vite when 5173 is taken.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

port_in_use() {
  nc -z 127.0.0.1 "$1" 2>/dev/null
}

pick_vite_host_port() {
  local port="${VITE_HOST_PORT:-5173}"

  if [[ -n "${VITE_HOST_PORT:-}" ]]; then
    if port_in_use "${port}"; then
      echo "ERROR: VITE_HOST_PORT=${port} is already in use." >&2
      echo "Set another port, e.g. VITE_HOST_PORT=5174 ./scripts/docker-up.sh" >&2
      exit 1
    fi
    echo "${port}"
    return
  fi

  if ! port_in_use 5173; then
    echo 5173
    return
  fi

  for port in 5174 5175 5176 5177 5178 5179 5180; do
    if ! port_in_use "${port}"; then
      echo "Port 5173 is in use on this machine — starting Docker Vite on ${port} instead." >&2
      echo "${port}"
      return
    fi
  done

  echo "ERROR: ports 5173–5180 are all in use. Stop another dev server or set VITE_HOST_PORT." >&2
  exit 1
}

export VITE_HOST_PORT="$(pick_vite_host_port)"
export VITE_DEV_SERVER_URL="http://localhost:${VITE_HOST_PORT}"

echo "==> Flotory Docker"
echo "    App:   http://localhost:8000"
echo "    Vite:  ${VITE_DEV_SERVER_URL}"
echo ""

exec docker compose up "$@"
