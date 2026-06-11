#!/usr/bin/env bash
# Deploy / update Flotory on the VPS. Run from /var/www/web as root.
set -euo pipefail

cd /var/www/web

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing. Copy deploy/env.production.example to .env and set secrets."
  exit 1
fi

if ! grep -q '^APP_KEY=base64:' .env 2>/dev/null; then
  echo "==> Generating APP_KEY..."
  docker compose -f docker-compose.prod.yml run --rm --no-deps app php artisan key:generate --force
fi

echo "==> Upload directories..."
mkdir -p public/uploads/venue-logos public/uploads/venue-covers public/uploads/reward-milestones
chmod -R 775 public/uploads 2>/dev/null || true

echo "==> Building frontend assets..."
rm -f public/hot
docker run --rm \
  -v "$(pwd):/app" \
  -w /app \
  node:24-alpine \
  sh -c "npm ci && npm run build"
rm -f public/hot

echo "==> Starting production containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Generating missing media thumbnails..."
docker compose -f docker-compose.prod.yml exec -T app php artisan media:generate-thumbs || true

echo "==> Reconciling consolidated migrations (existing production DBs)..."
docker compose -f docker-compose.prod.yml exec -T app php artisan migrate:reconcile-consolidated

echo "==> Running migrations..."
docker compose -f docker-compose.prod.yml exec -T app php artisan migrate --force

echo "==> Ensuring super admin account..."
docker compose -f docker-compose.prod.yml exec -T app php artisan db:seed --class=AdminUserSeeder --force

echo "==> Refreshing Laravel caches..."
docker compose -f docker-compose.prod.yml exec -T app php artisan config:clear
docker compose -f docker-compose.prod.yml exec -T app php artisan route:cache
docker compose -f docker-compose.prod.yml exec -T app php artisan view:cache

echo "==> Nginx..."
if [[ -f deploy/nginx-flotory.conf ]]; then
  cp deploy/nginx-flotory.conf /etc/nginx/sites-available/flotory
  ln -sf /etc/nginx/sites-available/flotory /etc/nginx/sites-enabled/flotory
  rm -f /etc/nginx/sites-enabled/loyalty /etc/nginx/sites-available/loyalty
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx
fi

echo "==> First-time seed (optional)..."
if [[ "${SEED_DATABASE:-}" == "1" ]]; then
  docker compose -f docker-compose.prod.yml exec -T app php artisan db:seed --force
fi

echo "==> Post-deploy smoke checks..."
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8000}"
PUBLIC_URL="${PUBLIC_URL:-https://flotory.com}"
export BACKEND_URL PUBLIC_URL
bash deploy/smoke.sh

echo "==> Deploy complete."
docker compose -f docker-compose.prod.yml ps
