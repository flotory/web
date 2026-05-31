#!/usr/bin/env bash
# Fix production Resend FROM address (team@flotory.com on verified flotory.com domain).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="${ROOT}/deploy/config.sh"
if [[ ! -f "${CONFIG}" ]]; then
  echo "Copy deploy/config.example.sh to deploy/config.sh first."
  exit 1
fi
# shellcheck source=/dev/null
source "${CONFIG}"

SSH_TARGET="${DROPLET_USER}@${DROPLET_HOST}"

echo "==> Updating mail settings on ${SSH_TARGET}..."
ssh "${SSH_TARGET}" bash -s <<'REMOTE'
set -euo pipefail
cd /var/www/web

perl -pi -e 's/^MAIL_FROM_ADDRESS=.*/MAIL_FROM_ADDRESS=team@flotory.com/' .env
perl -pi -e 's/^MAIL_FROM_NAME=.*/MAIL_FROM_NAME="Flotory"/' .env
perl -pi -e 's/^MAIL_MAILER=.*/MAIL_MAILER=resend/' .env

echo "Mail env (key redacted):"
grep -E '^(MAIL_MAILER|MAIL_FROM)=' .env
grep '^RESEND_API_KEY=' .env | sed 's/=.*/=[set]/'

docker compose -f docker-compose.prod.yml up -d --force-recreate app
docker compose -f docker-compose.prod.yml exec -T app php artisan config:clear

echo "Config from address:"
docker compose -f docker-compose.prod.yml exec -T app php artisan tinker --execute="echo config('mail.from.address');"

echo "Sending test email to team@flotory.com..."
docker compose -f docker-compose.prod.yml exec -T app php artisan tinker --execute="Mail::raw('Flotory production mail test', fn (\$m) => \$m->to('team@flotory.com')->subject('Flotory production mail test')); echo PHP_EOL . 'sent_ok';"
REMOTE

echo "==> Done."
