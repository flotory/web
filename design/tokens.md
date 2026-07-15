# Flotory design tokens

Source of truth for the Design agent. Code must match these files.

## Fonts (intentional cross-platform split)

| Surface | Font | File |
|---------|------|------|
| **Mobile (customer)** | Noto Sans Armenian | `apps/mobile/src/lib/typography.ts` |
| **Web (owner + marketing)** | Plus Jakarta Sans | `resources/css/app.css` `@theme --font-sans` |

Same **semantic** tokens (accent, surface, ink); different families for locale coverage.

## Mobile (`apps/mobile/src/theme.ts`)

| Token | Use |
|-------|-----|
| `colors.accent` | Gold accent, badges, campaign highlights |
| `colors.accentActive` | Stronger accent text |
| `colors.accentSoft` / `accentBorder` | Soft accent backgrounds / borders |
| `colors.campaignBg` / `campaignBorder` | Dark campaign card |
| `colors.surface` / `surfaceMuted` / `surfaceWarm` | Cards, warm ivory `#FFFCF6` |
| `colors.lavender` / `lavenderBorder` | Scheduled badges |
| `colors.ink` / `inkMuted` / `inkSoft` | Text hierarchy |
| `colors.primaryText` | Text on dark/cover headers |
| `overlays.*` | Semi-transparent scrims (never inline rgba when token exists) |
| `passGradient.start` / `end` | Redeem pass dark gradient anchors |
| `radius.*`, `shadows.*`, `space.*` | Layout |
| `type.*` | Typography presets (refresh on palette via `syncDerivedTheme()`) |

Typography: `withAppFont()` + `fonts` from `src/lib/typography.ts`.

### Shared mobile components

| Component | Path |
|-----------|------|
| `AppButton` | `variants: primary \| secondary \| danger \| ghost` |
| `AppTextInput` | Single-line input |
| `FormField` | Label + input + error/success |
| `SearchInput` | Search bar shell |
| `PrimaryButton` / `SecondaryButton` | Thin wrappers over `AppButton` |

## Web (`resources/css/app.css`)

Tailwind v4 `@theme` maps to `--flotory-*` CSS variables (runtime palette via `applyPalette.ts`).

| Utility | Maps to |
|---------|---------|
| `bg-surface`, `text-ink`, `border-border` | Core surfaces |
| `bg-warning-bg`, `text-warning-text`, `border-warning-border` | Pending/dev banners |
| `bg-danger`, `bg-danger-soft` | Errors / destructive |
| `.btn-glow`, `.shadow-card` | Marketing + card elevation |

### Shared web components

| Component | Path |
|-----------|------|
| `AppButton` | `primary \| secondary \| ghost \| danger` |
| `AppInput` | Text input (`authForm` classes) |
| `FormLabel` | Field labels |
| `FormTextarea` | Multi-line |
| `FormSelect` | Native select |
| `AppAlert` | Error / success / info banners |
| `PaginationControls` | Admin list pagination |

Form class helpers: `resources/js/lib/authForm.ts` (canonical).

## Rules

1. **No inline hex** when a token exists.
2. **No inline rgba** on customer UI when `overlays.*` fits.
3. New colors → update this file + mobile `theme.ts` + web `:root` + **user approval**.
4. Third-party brand colors (Google logo) are allowed exceptions.

## Changelog

| Date | Change |
|------|--------|
| 2026-07-15 | Initial token map for agent workflow |
| 2026-07-15 | Added overlays, passGradient, surfaceWarm; web warning tokens; shared form/button components |
