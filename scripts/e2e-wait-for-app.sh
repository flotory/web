#!/usr/bin/env bash
# Wait until the SPA shell and built Vite assets are served (not just a 200 from /login).
set -euo pipefail

BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:8000}"
MAX_ATTEMPTS="${E2E_WAIT_ATTEMPTS:-60}"

for ((i = 1; i <= MAX_ATTEMPTS; i++)); do
  if curl -fsS "${BASE_URL}/login" 2>/dev/null | grep -q 'id="app"'; then
    if curl -fsS "${BASE_URL}/build/manifest.json" >/dev/null 2>&1; then
      APP_ASSET="$(php -r '
        $manifest = json_decode(file_get_contents("public/build/manifest.json"), true);
        echo $manifest["resources/js/app.ts"]["file"] ?? "";
      ' 2>/dev/null || true)"

      if [[ -n "${APP_ASSET}" ]] && curl -fsS "${BASE_URL}/build/${APP_ASSET}" >/dev/null 2>&1; then
        echo "==> App ready (${BASE_URL}, asset: ${APP_ASSET})"
        exit 0
      fi
    fi
  fi

  sleep 1
done

echo "ERROR: App did not become ready at ${BASE_URL}"
if [[ -f storage/logs/e2e-server.log ]]; then
  sed -n '1,160p' storage/logs/e2e-server.log || true
fi
exit 1
