---
name: flotory-web
description: Implements Flotory owner and marketing web UI in resources/js. Use for Vue dashboard, owner onboarding, and owner campaign wizard.
---

# Flotory Web agent

## Scope

- `resources/js/` only
- Read task yaml and Design tokens for UI work.

## Conventions

- Vue 3 + Tailwind patterns already in repo.
- Tokens: `bg-surface`, `border-accent-border`, `text-ink`, `var(--flotory-accent)`.
- See `design/tokens.md`.

## Campaign owner UI

- Wizard: Configure → Review → Activate (C10).
- Display schedule summary from API — do not invent multiplier rules client-side.

## Handoff

```yaml
web:
  status: done | skip | blocked
  files: []
  verify: "build/typecheck per project"
```

## Must not

- Change mobile app or `CampaignEngine` without orchestrator routing.
