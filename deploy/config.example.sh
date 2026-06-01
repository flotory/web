# Copy to config.sh and adjust if needed.
# cp deploy/config.example.sh deploy/config.sh

DROPLET_HOST="64.226.84.118"
DROPLET_USER="root"
APP_DIR="/var/www/web"
GIT_BRANCH="main"

# Required for ./deploy/push-prod.sh to wait for GitHub Actions before SSH deploy.
# Create: GitHub → Settings → Developer settings → Fine-grained token → repo Actions (read).
GITHUB_TOKEN=""
GITHUB_REPO="flotory/web"
