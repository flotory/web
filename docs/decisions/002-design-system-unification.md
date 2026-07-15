# ADR 002: Unified design system components and tokens

Date: 2026-07-15  
Status: accepted

## Context

Audit found ~79 inline color literals on mobile, duplicated form markup on web (20+ copy-pastes), unused `SecondaryButton`/`AppText`, and `owner-dashboard` entirely off-palette.

## Decision

1. **Mobile:** Add `overlays`, `passGradient`, `surfaceWarm`; `AppButton`, `AppTextInput`, `FormField`, `SearchInput`; `syncDerivedTheme()` on palette load.
2. **Web:** Add warning tokens, `AppInput`, `FormLabel`, `FormTextarea`, `AppAlert`, `PaginationControls`; `AppButton` `danger` variant; global `.btn-glow` / `.shadow-card`.
3. **Fonts:** Keep Noto Sans Armenian (mobile) and Plus Jakarta Sans (web) — intentional.
4. Migrate auth, wallet search, owner dashboard, top customer cards, and primary owner form pages to shared components.

## Consequences

- New UI must use shared components before raw `TextInput` / inline form classes.
- Remaining one-off rgba values without tokens should get new `overlays.*` entries when repeated.
- Large admin/venue pages may still use `formFieldClassSm` compact dialect — document in tokens.md if expanded.

## Rule IDs

- **Y1–Y10** — UX consistency
