# Flotory production deploy context

## Workspace
- Path: `/workspace` (cloud) or `/Users/narek/Desktop/Loyalty` (Mac)
- Branch: `main`
- GitHub: https://github.com/flotory/web (`git@github.com:flotory/web.git`)

## Production
- URL: https://flotory.com
- Droplet: `root@64.226.84.118`
- App dir on server: `/var/www/web`
- Docker project: `flotory` (`flotory-app-1`, `flotory-mysql-1`, `flotory-queue-1`, `flotory-reverb-1`)
- Nginx: `deploy/nginx-flotory.conf` → HTTPS on 443

## Platform split (current)
- **Web:** owner dashboard + platform admin + thin public pages (`/v/:slug` bridge, `/app`, `/invite/:token`)
- **Mobile app (Expo):** customers + staff scanner — **not** deployed by `push-prod.sh`

## Deploy command (run from repo root on Mac)
```bash
./deploy/push-prod.sh
```

Flow:
1. Local CI (`./scripts/ci-local.sh`) — PHPUnit, vue build, vitest, mobile tsc
2. `git push origin main`
3. Wait for GitHub Actions **Tests** workflow (needs `GITHUB_TOKEN`)
4. SSH to droplet → `./deploy/pull-and-deploy.sh` → `./deploy/deploy.sh`

Emergency only: `SKIP_CI_GATE=1 ./deploy/push-prod.sh`

Manual server-only deploy (no push from Mac):
```bash
ssh root@64.226.84.118 'cd /var/www/web && ./deploy/pull-and-deploy.sh'
```

## Local files on Mac (gitignored — never commit)
- `deploy/config.sh` — `DROPLET_HOST`, `DROPLET_USER`, `APP_DIR`, `GITHUB_REPO`, `GITHUB_TOKEN`
- `~/.ssh/id_ed25519` (or your default key) — private key for SSH to droplet

Optional:
- `deploy/config.secrets.sh` — alternative place for `GITHUB_TOKEN` only

Copy templates if missing:
```bash
cp deploy/config.example.sh deploy/config.sh
cp deploy/config.secrets.example.sh deploy/config.secrets.sh
```

## Cloud agent deploy (Cursor)
Mac gitignored files are **not** available in cloud agents. Use **Cursor Cloud Agents → Secrets**:

| Secret | Type | Purpose |
|--------|------|---------|
| `SSH_PRIVATE_KEY` | Runtime Secret | Full private key for SSH to droplet |
| `GITHUB_TOKEN` | Runtime Secret | CI gate in `push-prod.sh` |
| `DROPLET_HOST` | Env var | `64.226.84.118` |
| `DROPLET_USER` | Env var | `root` |
| `APP_DIR` | Env var | `/var/www/web` |

Public key for `SSH_PRIVATE_KEY` must be in droplet `~/.ssh/authorized_keys`.

Deploy from agent after secrets are set:
```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
printf '%s\n' "$SSH_PRIVATE_KEY" > ~/.ssh/cursor_deploy
chmod 600 ~/.ssh/cursor_deploy
ssh-keyscan -H "$DROPLET_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true
ssh -i ~/.ssh/cursor_deploy -o BatchMode=yes "${DROPLET_USER}@${DROPLET_HOST}" \
  "cd ${APP_DIR} && ./deploy/pull-and-deploy.sh"
```

Restart the cloud agent after adding secrets.

## GitHub token (for CI gate in push-prod.sh)
- Fine-grained PAT on repo `flotory/web`
- Permissions: Actions (read), Metadata (read)
- Or: `gh auth login`

## Server GitHub deploy key (server-side only — for git pull on droplet)
- Path on server: `/root/.ssh/flotory_web_deploy_key` (+ `.pub`)
- SSH config on server: `Host github.com` → `IdentityFile ~/.ssh/flotory_web_deploy_key`
- Public key in GitHub → `flotory/web` → Settings → Deploy keys
- **Not** used for SSH from Mac/agent to droplet

## Agent permissions needed
- `full_network` + `all` (SSH, npm, remote deploy)
- `git_write` only when committing

## Deploy rules
- Working tree must be clean before `push-prod.sh`
- Never commit `deploy/config.sh`, `deploy/config.secrets.sh`, or `.env`
- Never force-push `main`
- Only deploy after changes are committed and on `origin/main`

## Post-deploy smoke checks
- https://flotory.com loads
- https://flotory.com/v/demo-cafe — venue app bridge (200)
- https://flotory.com/app — mobile app page
- Owner: `owner@example.com` / `password` → `/dashboard`
- Admin: `admin@flotory.com` / `password` → `/admin/venues`
- Customer/staff flows: **mobile app** only (not web `/home` or `/scanner`)

## Docs in repo
- `deploy/DEPLOY.md` — full checklist
- `scripts/ci-local.sh` — local CI mirror of GitHub Actions
- `README.md` — stack + deploy overview

## Mobile app (Expo)
- Path: `apps/mobile/`
- NOT deployed by `push-prod.sh` — separate Expo/EAS build
- API: `EXPO_PUBLIC_API_BASE_URL` → `https://flotory.com/api`
