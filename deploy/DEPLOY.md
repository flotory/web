# Production deploy

## Flow

```
Mac: edit code → git commit → ./deploy/push-prod.sh
                              ↓
                         GitHub (main)
                              ↓
                         Droplet: git pull → deploy.sh
```

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

```bash
git add .
git commit -m "Your change"
./deploy/push-prod.sh
```

`push-prod.sh` requires a clean working tree (commit first). It pushes `main` to GitHub, then SSHs to the droplet and runs `pull-and-deploy.sh`.

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
