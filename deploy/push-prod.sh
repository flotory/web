#!/usr/bin/env bash
# Run on your Mac: push to GitHub, then deploy on the droplet.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

CONFIG="${ROOT}/deploy/config.sh"
if [[ ! -f "${CONFIG}" ]]; then
  echo "Copy deploy/config.example.sh to deploy/config.sh and set DROPLET_HOST."
  exit 1
fi
# shellcheck source=/dev/null
source "${CONFIG}"

BRANCH="${GIT_BRANCH:-main}"
SSH_TARGET="${DROPLET_USER}@${DROPLET_HOST}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "You have uncommitted changes. Commit first, then run this script again."
  git status -sb
  exit 1
fi

echo "==> Pushing to GitHub (origin ${BRANCH})..."
git push origin "${BRANCH}"

echo "==> Deploying on ${SSH_TARGET}..."
ssh "${SSH_TARGET}" "cd ${APP_DIR} && chmod +x deploy/pull-and-deploy.sh deploy/deploy.sh && ./deploy/pull-and-deploy.sh"

echo "==> Done. App: http://${DROPLET_HOST}"
