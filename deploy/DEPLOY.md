# Production deploy

## Flow

```
Mac: edit code → git commit → ./deploy/push-prod.sh
                              ↓
                    local CI (PHPUnit + build + Vitest + mobile + Playwright*)
                              ↓
                         git push → GitHub Actions (PHPUnit + Frontend + Playwright + Mobile)
                              * Playwright in local CI when PHP is installed; always on GitHub
                              ↓
                    wait until CI is green (GITHUB_TOKEN)
                              ↓
                         Droplet: git pull → deploy.sh
```

Production deploy **does not run** if:
- local CI fails (backend PHPUnit or frontend build/unit tests), or
- `GITHUB_TOKEN` is missing (`deploy/config.secrets.sh` or env), or
- the GitHub **Tests** workflow fails on the pushed commit.

Local CI uses Docker for PHPUnit when PHP is not installed on your Mac.

Emergency bypass (avoid unless prod is down): `SKIP_CI_GATE=1 ./deploy/push-prod.sh`

### Recommended: branch protection on `main`

In GitHub → **Settings → Branches → Branch protection rules** for `main`:

- Require status checks: **PHPUnit**, **Frontend build**, **Playwright smoke**, **Mobile typecheck**
- Require branches to be up to date before merging (if you use PRs)

That blocks merging broken code; `push-prod.sh` blocks deploying it.

## One-time setup

Add the server deploy key to GitHub:

1. Open https://github.com/flotory/web/settings/keys
2. **Add deploy key** → Title: `flotory-prod`
3. Key (from server):

```bash
ssh root@64.226.84.118 'cat /root/.ssh/flotory_deploy.pub'
```

4. Enable **Allow write access** only if you need the server to push (not required).

5. Finish git on the server:

```bash
ssh root@64.226.84.118 'bash /var/www/web/deploy/setup-git-deploy.sh'
```

6. Commit deploy tooling and push from your Mac:

```bash
git add deploy/ docker-compose.prod.yml README.md .gitignore
git commit -m "Add Git-based production deploy scripts"
git push origin main
```

## Every release

1. One-time: `cp deploy/config.secrets.example.sh deploy/config.secrets.sh` and set `GITHUB_TOKEN` (see comments in that file). `config.secrets.sh` is gitignored.
2. Commit and deploy:

```bash
git add .
git commit -m "Your change"
./deploy/push-prod.sh
```

`push-prod.sh` requires a clean working tree. It runs local CI, pushes `main`, waits for GitHub Actions to pass, then SSHs to the droplet and runs `pull-and-deploy.sh`.

Run the same checks without deploying:

```bash
./scripts/ci-local.sh
```

This mirrors the GitHub **Tests** workflow: **PHPUnit**, **npm run build**, **web Vitest**, **mobile typecheck**, **mobile Vitest**, and **Playwright** (when PHP or Docker is available). See [docs/TESTING.md](../docs/TESTING.md).

### CI status (read this if Actions looks “broken”)

Open the **latest** run on `main`, not an old failed one:

- [Actions → Tests workflow](https://github.com/flotory/web/actions/workflows/tests.yml)
### Post-deploy checks

- https://flotory.com loads the SPA
- Owner login: `owner@example.com` / `password`
- Admin login: `admin@flotory.com` / `password` → `/admin/venues`
- Google sign-in on web (if `GOOGLE_CLIENT_SECRET` is set on the server)
- Mobile app: **Continue with Google** on login (requires this deploy for `POST /api/auth/google`)
- Guest venue landing: `https://flotory.com/v/demo-cafe` (published venue QR entry)
- NFC tap bridge: `https://flotory.com/t/{token}` (after admin creates a tag on **Manage venues → edit venue**)
- Mobile NFC deep link: `flotory://t/{token}` → stamp screen with +1 animation
- Owner demo booking: `https://flotory.com/book-demo` (Calendly iframe; requires `FLOTORY_DEMO_CALENDLY_URL` in server `.env`)
- Owner **Rewards** (`/rewards`): loyalty card grid loads; **Create milestone** saves; tap a gift slot to edit
- Owner **Campaigns** (`/campaigns`): templates load; activate/pause a test campaign
- Listing flow: submit a draft venue from owner dashboard; approve as admin; confirm `/v/{slug}` returns 200

If migrations were added locally, they run automatically via `deploy.sh` on the server.

After enabling **Time Zone API** and setting `GOOGLE_MAPS_SERVER_API_KEY` on the server:

```bash
ssh root@64.226.84.118 'cd /var/www/web && docker compose -f docker-compose.prod.yml exec -T app php artisan venues:sync-timezones'
```

## Files

| Script | Where | Purpose |
|--------|-------|---------|
| `push-prod.sh` | Mac | Push to GitHub + remote deploy |
| `pull-and-deploy.sh` | Server | `git pull` + build |
| `deploy.sh` | Server | Docker build, migrate, Nginx, smoke checks |
| `smoke.sh` | Server | Post-deploy health: Laravel on `:8000` (`/up`, `/`, API 401) + `https://flotory.com` |
| `setup-git-deploy.sh` | Server | Deploy key + git init (once) |
| `setup-server.sh` | Server | Docker/Nginx/UFW (once) |
| `config.sh` | Mac (gitignored) | Droplet IP/user/app path |

## Current production values

- Repo: `git@github.com:flotory/web.git`
- Host: `64.226.84.118`
- App dir: `/var/www/web`
- Domain: `https://flotory.com`
- `www` redirect: `https://www.flotory.com` → `https://flotory.com`

## HTTPS / Google sign-in

`deploy/nginx-flotory.conf` must include **port 443** and Let's Encrypt certificate paths. A plain HTTP-only config breaks `https://flotory.com` and Google OAuth (callback URL is always HTTPS).

After deploy, verify:

```bash
curl -sI https://flotory.com/auth/google/redirect | head -3   # expect HTTP/2 302
```

## Docker naming

Compose project name is **`flotory`** (`name:` in `docker-compose.prod.yml`). Containers are `flotory-app-1`, `flotory-mysql-1`, etc. The MySQL volume stays **`web_mysql_data`** so renaming from the old `web-*` project does not reset the database. Nginx site config is `deploy/nginx-flotory.conf` → `/etc/nginx/sites-available/flotory`.
