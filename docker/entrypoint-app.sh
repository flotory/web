#!/bin/sh
set -eu

cd /var/www/html

if [ ! -f .env ]; then
  cp .env.example .env
fi

mkdir -p public/uploads/venue-logos public/uploads/venue-covers public/uploads/venue-setup public/uploads/reward-milestones storage/framework/cache storage/logs
chmod -R 775 public/uploads storage 2>/dev/null || true

composer install --no-interaction --prefer-dist

# Keep APP_KEY stable across restarts — regenerating breaks encrypted state and confuses local auth.
if ! grep -q '^APP_KEY=base64:' .env 2>/dev/null; then
  php artisan key:generate --force
fi

if ! php artisan migrate --force; then
  echo ""
  echo "ERROR: migrations failed. Your database was NOT reset automatically."
  echo "  Check status:  docker compose exec app php artisan migrate:status"
  echo "  Retry migrate: docker compose exec app php artisan migrate --force"
  echo "  Full reset (destroys all local data — only if you choose):"
  echo "                 docker compose exec app php artisan migrate:fresh --seed"
  echo ""
  exit 1
fi

# Fast, idempotent — restores demo logins without wiping visits, cards, or your test data.
php artisan app:ensure-local-demo --no-interaction

exec php artisan serve --host=0.0.0.0 --port=8000
