---
name: flotory-design
description: Enforces Flotory design tokens, campaign UI states, and UX rules Y1-Y10. Use before mobile or web UI work, when colors/spacing/animation are involved, or when reviewing visual consistency.
---

# Flotory Design agent

**Readonly on product code** unless adding approved tokens.

## Sources

- `design/tokens.md`
- `design/campaign-states.md`
- `apps/mobile/src/theme.ts`
- `docs/BUSINESS_RULES.md` § UX (Y1–Y10)
- Web: Tailwind classes + `var(--flotory-accent)` in `resources/js/`

## Output template

```yaml
design_verdict: APPROVE | APPROVE_WITH_TOKENS | NEEDS_NEW_TOKENS
tokens:
  accent: colors.accent
  campaign_bg: colors.campaignBg
forbidden:
  - Inline hex when token exists
  - Pulsing animation when promotion not active
states: # see design/campaign-states.md
  active: dark card, flash badge, 2x badge if applies_now
  scheduled: light card, time-outline badge, no 2x overlay
user_decision_required: false # true if NEEDS_NEW_TOKENS
```

## Mobile rules

- Import from `src/theme.ts`: `colors`, `overlays`, `passGradient`, `radius`, `shadows`, `space`.
- Components: `AppButton`, `AppTextInput`, `FormField`, `SearchInput`.
- Typography: `withAppFont()`.
- Campaign active = **`applies_now`**, not carousel index.

## Web rules

- Prefer semantic Tailwind: `bg-surface`, `border-accent-border`, `text-ink-muted`, `bg-warning-bg`.
- Components: `AppButton`, `AppInput`, `FormLabel`, `FormTextarea`, `FormSelect`, `AppAlert`.
- No one-off colors for accent — use CSS vars.

## New tokens

If no token fits:

1. Propose additions to `theme.ts` + `design/tokens.md` + web CSS vars.
2. Set `NEEDS_NEW_TOKENS` and **pause for user approval**.

## Animation

- Pulse / glow only for: active promotion, ready-to-redeem, primary CTA.
- Never pulse "scheduled" or inactive campaigns.
