# Production deploy

## Flow

```
Mac: edit code → git commit → ./deploy/push-prod.sh
                              ↓
                         GitHub (main)
                              ↓
                         Droplet: git pull → deploy.sh
```

## One-time (remaining step)

Add the server deploy key to GitHub:

1. Open https://github.com/narekdivdaryan/loyalty/settings/keys
2. **Add deploy key** → Title: `loyalty-prod`
3. Key (from server):

```bash
ssh root@159.89.111.79 'cat /root/.ssh/loyalty_deploy.pub'
```

4. Enable **Allow write access** only if you need the server to push (not required).

5. Finish git on the server:

```bash
ssh root@159.89.111.79 'bash /var/www/loyalty/deploy/setup-git-deploy.sh'
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

## Files

| Script | Where | Purpose |
|--------|-------|---------|
| `push-prod.sh` | Mac | Push to GitHub + remote deploy |
| `pull-and-deploy.sh` | Server | `git pull` + build |
| `deploy.sh` | Server | Docker build, migrate, Nginx |
| `setup-git-deploy.sh` | Server | Deploy key + git init (once) |
| `setup-server.sh` | Server | Docker/Nginx/UFW (once) |
| `config.sh` | Mac (gitignored) | Droplet IP/user |
