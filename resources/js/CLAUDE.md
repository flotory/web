# Web (Vue owner/admin) — layer rules

Owns `resources/js/` (Vue owner dashboard, marketing pages). Role detail:
[.claude/skills/flotory-web/SKILL.md](../../.claude/skills/flotory-web/SKILL.md).

## Design tokens

- Use Tailwind + CSS vars: `bg-surface`, `border-accent-border`, `text-ink`, `var(--flotory-accent)`.
- See `design/tokens.md` for web/mobile parity notes.

## Business logic

- The server is the source of truth for campaigns, stamps, rewards.
- Do not reimplement `CampaignEngine` rules in the client.

## Verify

- Typecheck / build per project scripts when touching TS/Vue.
- Backend tests if the API contract changed.

## Must not

- Change the mobile app or migrations without orchestrator routing.
