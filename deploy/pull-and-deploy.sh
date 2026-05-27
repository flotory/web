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

echo "==> Pulling origin/${GIT_BRANCH}..."
git fetch origin "${GIT_BRANCH}"
git checkout "${GIT_BRANCH}"
git pull --ff-only origin "${GIT_BRANCH}"

chmod +x deploy/deploy.sh
./deploy/deploy.sh
