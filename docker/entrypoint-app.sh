#!/bin/sh
set -eu

cd /var/www/html

if [ ! -f .env ]; then
  cp .env.example .env
fi

mkdir -p public/uploads/venue-logos public/uploads/venue-covers public/uploads/reward-milestones storage/framework/cache storage/logs
chmod -R 775 public/uploads storage 2>/dev/null || true

composer install --no-interaction --prefer-dist

php artisan key:generate --force 2>/dev/null || true
php artisan migrate --force

# Demo accounts and seed data only for local development — never on production.
APP_ENV_VALUE="${APP_ENV:-}"
if [ -z "$APP_ENV_VALUE" ] && [ -f .env ]; then
  APP_ENV_VALUE="$(grep -E '^APP_ENV=' .env | head -1 | cut -d= -f2- | tr -d ' "'\''')"
fi
if [ "$APP_ENV_VALUE" = "local" ]; then
  php artisan app:ensure-local-demo --no-interaction
fi

exec php artisan serve --host=0.0.0.0 --port=8000
