#!/usr/bin/env bash
# Deploy / update Loyalty on the VPS. Run from /var/www/loyalty as root.
set -euo pipefail

cd /var/www/loyalty

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing. Copy deploy/env.production.example to .env and set secrets."
  exit 1
fi

if ! grep -q '^APP_KEY=base64:' .env 2>/dev/null; then
  echo "==> Generating APP_KEY..."
  docker compose -f docker-compose.prod.yml run --rm --no-deps app php artisan key:generate --force
fi

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

echo "==> Refreshing Laravel caches..."
docker compose -f docker-compose.prod.yml exec -T app php artisan config:clear
docker compose -f docker-compose.prod.yml exec -T app php artisan route:cache
docker compose -f docker-compose.prod.yml exec -T app php artisan view:cache

echo "==> Nginx..."
if [[ -f deploy/nginx-loyalty.conf ]]; then
  cp deploy/nginx-loyalty.conf /etc/nginx/sites-available/loyalty
  ln -sf /etc/nginx/sites-available/loyalty /etc/nginx/sites-enabled/loyalty
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx
fi

echo "==> First-time seed (optional)..."
if [[ "${SEED_DATABASE:-}" == "1" ]]; then
  docker compose -f docker-compose.prod.yml exec -T app php artisan db:seed --force
fi

echo "==> Deploy complete."
docker compose -f docker-compose.prod.yml ps
