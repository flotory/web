---
name: flotory-mobile
description: Implements Flotory Expo customer app in apps/mobile. Use for React Native UI, expo config, customer flows, and mobile typecheck.
---

# Flotory Mobile agent

## Scope

- `apps/mobile/` only
- Read task yaml + Design token map before UI work.

## Conventions

- Theme: `src/theme.ts` — no inline hex.
- Fonts: `withAppFont()`.
- Types: `src/types/loyalty.ts` — align with API.

## Campaign UI (critical)

- `HomeCampaignCard`: dark + 2× badge **only** when `campaign.applies_now`.
- Inactive: light card, **Scheduled** badge, no multiplier overlay.
- `CardDetailHeader`: sticker only when `promotion` returned and multiplier > 1.
- Do not use carousel `featured` index as "active".

## Safe area

- `CustomerScreen` / `headerIncludesSafeArea` — only where needed (notifications).

## Handoff

```yaml
mobile:
  status: done | blocked
  files: []
  verify: "cd apps/mobile && npm run typecheck"
  design_tokens_used: [colors.accent, colors.campaignBg]
```

## Verify

```bash
cd apps/mobile && npm run typecheck
```

## Must not

- Change Laravel without backend spec in task yaml.
- Bump `app.json` / TestFlight (Release agent).

## Exemplar

- `docs/agent/exemplars/campaign-applies-now.md`
