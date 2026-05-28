#!/usr/bin/env bash
# One-time: Git deploy key + repo on the VPS. Run on the droplet as root.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/web}"
GIT_REPO="${GIT_REPO:-git@github.com:flotory/web.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
DEPLOY_KEY="${DEPLOY_KEY:-/root/.ssh/flotory_deploy}"

echo "==> SSH key for GitHub deploy..."
mkdir -p /root/.ssh
chmod 700 /root/.ssh

if [[ ! -f "${DEPLOY_KEY}" ]]; then
  ssh-keygen -t ed25519 -C "flotory-prod-deploy" -f "${DEPLOY_KEY}" -N ""
fi
chmod 600 "${DEPLOY_KEY}"

ssh-keyscan -t ed25519 github.com >> /root/.ssh/known_hosts 2>/dev/null || true

if ! grep -q "Host github.com" /root/.ssh/config 2>/dev/null; then
  cat >> /root/.ssh/config <<EOF

Host github.com
  HostName github.com
  User git
  IdentityFile ${DEPLOY_KEY}
  IdentitiesOnly yes
EOF
  chmod 600 /root/.ssh/config
fi

echo ""
echo "=== Add this deploy key to GitHub ==="
echo "Repo → Settings → Deploy keys → Add deploy key"
echo "Title: flotory-prod"
echo "Key:"
cat "${DEPLOY_KEY}.pub"
echo "====================================="
echo ""

mkdir -p "${APP_DIR}"
cd "${APP_DIR}"

git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true

if [[ ! -d .git ]]; then
  echo "==> Initializing git in ${APP_DIR}..."
  git init -b "${GIT_BRANCH}"
fi
git remote remove origin 2>/dev/null || true
git remote add origin "${GIT_REPO}"

echo "==> Fetching from GitHub..."
if [[ -f .env ]]; then
  cp .env /tmp/flotory.env.backup
fi

git fetch origin "${GIT_BRANCH}"
# Remove rsync leftovers so checkout can succeed (.env is gitignored and kept)
git clean -fd
git checkout -B "${GIT_BRANCH}" "origin/${GIT_BRANCH}"

if [[ -f /tmp/flotory.env.backup ]] && [[ ! -f .env ]]; then
  cp /tmp/flotory.env.backup .env
fi

echo "==> Git deploy ready."
git status -sb
