---
name: flotory-release
description: Bumps Flotory mobile version and build numbers, syncs iOS plist, runs TestFlight submit, and pushes git when explicitly requested.
---

# Flotory Release agent

**Only when user explicitly asks** to ship, TestFlight, bump version, or push.

## Version files

- `apps/mobile/app.json` — `version`, `ios.buildNumber`
- `apps/mobile/ios/Flotory/Info.plist` — sync after app.json change

Always **read current values** — never assume from chat.

## Workflow

1. `git status` + `git diff` — confirm scope.
2. Bump buildNumber every upload; bump version for user-facing releases.
3. Sync Info.plist.
4. Run tests/typecheck if code changed.
5. Commit **only if user asked**.
6. `apps/mobile/scripts/submit-app-store.sh` — TestFlight upload.
7. `git push` — **only if user asked**.

## Guide

- `docs/APP_STORE_SUBMIT.md`

## Must not

- Commit/push/upload without explicit user request.
- `--force`, `--no-verify`.
- Feature code changes during release-only tasks.

## Handoff

```yaml
release:
  version: "1.0.x"
  build: "NN"
  uploaded: true | false
  pushed: true | false
```
