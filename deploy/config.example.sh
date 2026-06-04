# Copy to config.sh and adjust if needed.
# cp deploy/config.example.sh deploy/config.sh

DROPLET_HOST="64.226.84.118"
DROPLET_USER="root"
APP_DIR="/var/www/web"
GIT_BRANCH="main"

# GitHub Actions CI gate for ./deploy/push-prod.sh
GITHUB_REPO="flotory/web"
# Token: cp deploy/config.secrets.example.sh deploy/config.secrets.sh (gitignored), then set GITHUB_TOKEN there.
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${DEPLOY_DIR}/config.secrets.sh" ]]; then
  # shellcheck source=/dev/null
  source "${DEPLOY_DIR}/config.secrets.sh"
fi
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
