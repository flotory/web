# Flotory design tokens

Source of truth for the Design agent. Code must match these files.

## Mobile (`apps/mobile/src/theme.ts`)

| Token | Use |
|-------|-----|
| `colors.accent` | Gold accent, badges, campaign highlights |
| `colors.accentActive` | Stronger accent text |
| `colors.accentSoft` | Soft accent backgrounds |
| `colors.accentBorder` | Accent borders |
| `colors.campaignBg` | Dark campaign card background |
| `colors.campaignBorder` | Dark campaign card border |
| `colors.surface` | Light card background |
| `colors.lavender` / `lavenderBorder` | Scheduled / secondary badges |
| `colors.ink` / `inkMuted` / `inkSoft` | Text hierarchy |
| `colors.primaryText` | Text on dark/cover headers |
| `radius.card`, `radius.button` | Corner radius |
| `shadows.md`, `shadows.sm` | iOS elevation |
| `space.screenX`, `space.cardPad` | Layout spacing |

Typography: `withAppFont()` + `fonts` from `src/lib/typography.ts`.

## Web (`resources/js/`)

Prefer Tailwind semantic classes backed by CSS variables:

- `bg-surface`, `bg-surface-muted`
- `border-border`, `border-accent-border`
- `text-ink`, `text-ink-muted`
- `var(--flotory-accent)` for accent fills/outlines

## Rules

1. **No inline hex** in components when a token exists.
2. New colors require updates here + `theme.ts` + web CSS vars + **user approval**.
3. Customer app and owner web may differ intentionally; document parity gaps in PR/task yaml.

## Changelog

| Date | Change |
|------|--------|
| 2026-07-15 | Initial token map for agent workflow |
