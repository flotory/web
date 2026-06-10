#!/usr/bin/env bash
# Run on your Mac: verify CI, push to GitHub, wait for GitHub Actions, then deploy on the droplet.
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

SECRETS="${ROOT}/deploy/config.secrets.sh"
if [[ -f "${SECRETS}" ]]; then
  # shellcheck source=/dev/null
  source "${SECRETS}"
fi
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

if [[ -z "${GITHUB_TOKEN}" ]] && command -v gh >/dev/null 2>&1; then
  GITHUB_TOKEN="$(gh auth token 2>/dev/null || true)"
fi

BRANCH="${GIT_BRANCH:-main}"
SSH_TARGET="${DROPLET_USER}@${DROPLET_HOST}"
export GITHUB_REPO="${GITHUB_REPO:-flotory/web}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "You have uncommitted changes. Commit first, then run this script again."
  git status -sb
  exit 1
fi

if [[ "${SKIP_CI_GATE:-}" != "1" && -z "${GITHUB_TOKEN:-}" ]]; then
  echo ""
  echo "ERROR: GITHUB_TOKEN is not set."
  echo "Deploy requires GitHub Actions to pass after push."
  echo "  cp deploy/config.secrets.example.sh deploy/config.secrets.sh"
  echo "  # edit config.secrets.sh — fine-grained token: flotory/web, Actions (read)"
  echo "Or: export GITHUB_TOKEN=... / install gh and gh auth login"
  echo "Emergency only: SKIP_CI_GATE=1 ./deploy/push-prod.sh"
  exit 1
fi

if [[ "${SKIP_CI_GATE:-}" == "1" ]]; then
  echo "WARNING: SKIP_CI_GATE=1 — skipping local and GitHub CI gates (emergency only)."
elif [[ "${SKIP_LOCAL_CI:-}" == "1" ]]; then
  echo "SKIP_LOCAL_CI=1 — skipping local CI; GitHub Actions will run tests after push."
else
  echo "==> Running local CI (PHPUnit + frontend + mobile)..."
  "${ROOT}/scripts/ci-local.sh"
fi

echo "==> Pushing to GitHub (origin ${BRANCH})..."
git push origin "${BRANCH}"

if [[ "${SKIP_CI_GATE:-}" != "1" ]]; then
  export GITHUB_TOKEN
  "${ROOT}/scripts/wait-for-github-ci.sh"
fi

echo "==> Deploying on ${SSH_TARGET}..."
ssh "${SSH_TARGET}" "cd ${APP_DIR} && chmod +x deploy/pull-and-deploy.sh deploy/deploy.sh && ./deploy/pull-and-deploy.sh"

echo "==> Done. App: https://flotory.com"
