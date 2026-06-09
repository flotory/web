#!/usr/bin/env bash
# Prepare a clean SQLite-backed Laravel app for Playwright (matches GitHub Actions e2e job).
# Uses .env.e2e only — never overwrites your Docker .env (mysql_data stays intact).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

if ! command -v php >/dev/null 2>&1; then
  echo "ERROR: php is required for e2e prepare."
  exit 1
fi

if [[ ! -f public/build/manifest.json ]]; then
  echo "ERROR: Run npm run build before e2e prepare."
  exit 1
fi

DB_PATH="${ROOT}/database/e2e.sqlite"

cat > .env.e2e <<EOF
APP_NAME=Flotory
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://127.0.0.1:8000
LOG_CHANNEL=stack
LOG_LEVEL=error
BROADCAST_CONNECTION=log
DB_CONNECTION=sqlite
DB_DATABASE=${DB_PATH}
SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
MAIL_MAILER=log
SANCTUM_STATEFUL_DOMAINS=127.0.0.1,127.0.0.1:8000,localhost,localhost:8000
FLOTORY_DEMO_CALENDLY_URL=https://calendly.com/flotoryapp/30min
EOF

rm -f public/hot "${DB_PATH}"
touch "${DB_PATH}"

php artisan key:generate --env=e2e --force
php artisan config:clear --env=e2e
php artisan view:clear --env=e2e
php artisan migrate:fresh --seed --force --env=e2e

echo "==> E2E app ready (sqlite: ${DB_PATH}, --env=e2e)"
echo "    Your Docker .env was NOT modified."
