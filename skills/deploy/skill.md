---
name: deploy
description: Deploy any project with one command. Use before deploying — detects project type, picks the right deploy strategy, runs it, verifies success.
---

# Deploy Skill

## Principle
One command. No manual steps. Verified success.

## Process

### Step 1 — Detect project type
Check in order:
- `Dockerfile` or `docker-compose.yml` → Docker deploy
- `fly.toml` → Fly.io
- `railway.json` or `railway.toml` → Railway
- `vercel.json` or Next.js/Vite → Vercel
- `netlify.toml` → Netlify
- `.github/workflows/deploy.yml` → GitHub Actions trigger
- `requirements.txt` + no framework → raw VPS deploy
- `package.json` with `deploy` script → `npm run deploy`

### Step 2 — Pre-deploy checklist (run all, stop on fail)
- [ ] Tests pass: run the test suite
- [ ] No uncommitted changes: `git status`
- [ ] Env vars set: check required vars exist
- [ ] Build succeeds: run build command
- [ ] Health endpoint exists (if web service)

### Step 3 — Deploy
Run the detected deploy command. Show only:
- The command being run
- Exit code
- URL or error if applicable

### Step 4 — Verify
- If web service: curl the health endpoint, expect 200
- If bot/worker: check process is running
- If static site: fetch the index, check title or known string

### Step 5 — Report
```
✓ Deployed to: [URL or service]
  Build: [Ns]
  Health: [200 OK / error]
```

## Common Deploy Commands Reference

| Platform | Command |
|----------|---------|
| Fly.io | `fly deploy` |
| Railway | `railway up` |
| Vercel | `vercel --prod` |
| Netlify | `netlify deploy --prod` |
| Docker | `docker compose up -d --build` |
| VPS | `rsync + systemctl restart` |
| GitHub Actions | `gh workflow run deploy.yml` |

## Rollback
If health check fails after deploy:
1. Note the previous commit hash
2. Ask: rollback automatically? (only if user said yes to auto-rollback upfront)
3. Otherwise: show the rollback command, don't run it
