# Mobile (Expo) — layer rules

Owns `apps/mobile/` only. Role detail:
[.claude/skills/flotory-mobile/SKILL.md](../../.claude/skills/flotory-mobile/SKILL.md).

## Design tokens

- Use `colors`, `overlays`, `passGradient` from `src/theme.ts`.
- Use `withAppFont()` from `src/lib/typography.ts`.
- Forms: `FormField` + `AppTextInput`; buttons: `AppButton`; search: `SearchInput`.
- No inline hex/rgba when a token exists.

## Campaign UI

- Active promo is `campaign.applies_now === true` — not a carousel `featured` index.
- Card-detail `promotion` is venue-wide; show the sticker only when the API returns a promotion.

## Safe area

- `headerIncludesSafeArea` only for screens that need it (e.g. notifications), not every tab screen.

## Verify

```bash
cd apps/mobile && npm run typecheck && npm run test:unit
```

## Must not

- Change the Laravel API without a backend spec in the task yaml.
- Version bump / TestFlight — that is the Release role.
