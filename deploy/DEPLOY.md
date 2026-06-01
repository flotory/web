# Production deploy

## Flow

```
Mac: edit code → git commit → ./deploy/push-prod.sh
                              ↓
                    local CI (PHPUnit + npm build)
                              ↓
                         git push → GitHub Actions (Tests)
                              ↓
                    wait until CI is green (GITHUB_TOKEN)
                              ↓
                         Droplet: git pull → deploy.sh
```

Production deploy **does not run** if local tests fail or if the GitHub **Tests** workflow fails on the pushed commit.

Emergency bypass (avoid unless prod is down): `SKIP_CI_GATE=1 ./deploy/push-prod.sh`

### Recommended: branch protection on `main`

In GitHub → **Settings → Branches → Branch protection rules** for `main`:

- Require status checks: **PHPUnit** and **Frontend build**
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

1. Add `GITHUB_TOKEN` to `deploy/config.sh` (see `deploy/config.example.sh`).
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

### Post-deploy checks

- https://flotory.com loads the SPA
- Owner login: `owner@example.com` / `password`
- Google sign-in (if `GOOGLE_CLIENT_SECRET` is set on the server)
- Guest venue landing: `https://flotory.com/v/{venue-slug}` (QR entry point)

If migrations were added locally, they run automatically via `deploy.sh` on the server.

## Files

| Script | Where | Purpose |
|--------|-------|---------|
| `push-prod.sh` | Mac | Push to GitHub + remote deploy |
| `pull-and-deploy.sh` | Server | `git pull` + build |
| `deploy.sh` | Server | Docker build, migrate, Nginx, smoke checks |
| `smoke.sh` | Server | Quick post-deploy HTTP health checks |
| `setup-git-deploy.sh` | Server | Deploy key + git init (once) |
| `setup-server.sh` | Server | Docker/Nginx/UFW (once) |
| `config.sh` | Mac (gitignored) | Droplet IP/user/app path |

## Current production values

- Repo: `git@github.com:flotory/web.git`
- Host: `64.226.84.118`
- App dir: `/var/www/web`
- Domain: `https://flotory.com`
- `www` redirect: `https://www.flotory.com` → `https://flotory.com`

## Docker naming

Compose project name is **`flotory`** (`name:` in `docker-compose.prod.yml`). Containers are `flotory-app-1`, `flotory-mysql-1`, etc. The MySQL volume stays **`web_mysql_data`** so renaming from the old `web-*` project does not reset the database. Nginx site config is `deploy/nginx-flotory.conf` → `/etc/nginx/sites-available/flotory`.
