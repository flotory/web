#!/usr/bin/env bash
# Run on the VPS after git is configured. Pulls latest code and deploys.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/loyalty}"
GIT_BRANCH="${GIT_BRANCH:-main}"

cd "${APP_DIR}"

if [[ ! -d .git ]]; then
  echo "ERROR: ${APP_DIR} is not a git repo. Run deploy/setup-git-deploy.sh first."
  exit 1
fi

echo "==> Syncing origin/${GIT_BRANCH}..."
git fetch origin "${GIT_BRANCH}"
git checkout "${GIT_BRANCH}"
# Discard hotfixes and generated files (views, logs) so pulls never block.
git reset --hard "origin/${GIT_BRANCH}"

chmod +x deploy/deploy.sh
./deploy/deploy.sh
