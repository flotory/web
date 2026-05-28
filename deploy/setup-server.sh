#!/usr/bin/env bash
# One-time VPS bootstrap (Ubuntu 24.04). Run as root on the droplet.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "==> Updating packages..."
apt-get update -qq
apt-get upgrade -y -qq

echo "==> Installing base packages..."
apt-get install -y -qq ca-certificates curl git nginx ufw

echo "==> Installing Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${VERSION_CODENAME:-$VERSION_ID}") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "==> Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> App directory..."
mkdir -p /var/www/web
chown -R root:root /var/www/web

echo "==> Scheduler cron (Laravel)..."
cat > /etc/cron.d/flotory <<'CRON'
* * * * * root cd /var/www/web && docker compose -f docker-compose.prod.yml exec -T app php artisan schedule:run >> /var/log/flotory-schedule.log 2>&1
CRON
chmod 644 /etc/cron.d/flotory

echo "==> Done. Next: sync code to /var/www/web and run deploy/deploy.sh"
