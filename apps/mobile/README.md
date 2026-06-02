# Flotory Mobile (Expo + React Native)

Mobile app lives in `apps/mobile` and uses the Laravel API as source of truth.

## Stack

- Expo + React Native + TypeScript
- `expo-router` for routing
- Token auth via `expo-secure-store`
- API default: `https://flotory.com/api` (override with `EXPO_PUBLIC_API_BASE_URL`)

## Run

From repo root:

```bash
npm --prefix apps/mobile run start
```

From `apps/mobile`:

```bash
npm run start
```

For local backend:

```bash
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:8000/api npm --prefix apps/mobile run start
```

## Design System (Current)

Theme tokens live in `src/theme.ts`:

- `colors`: semantic palette (bg, surface, text, border, primary, accent, success, etc.)
- `space`: spacing scale (`screenX`, `headerBottom`, `sectionY`, `sectionGap`, `cardPad`, `cardGap`, `listGap`)
- `radius`: shared radii (`card`, `mediaTop`, etc.)
- `media`: shared cover dimensions (`coverHeight: 140`)
- `motion`: animation timings (`giftBellIntervalMs`, `fadeInMs`, etc.)
- `rewardReady`: gift badge tokens (icon, size, colors) used by `ShakeGiftBadge`
- `shadows`: shared depth presets (`sm`, `md`, `button`)
- `type`: typography presets (`hero`, `section`, `body`, `caption`, `label`)

Use theme tokens instead of hardcoded values in screens.

## Shared UI Primitives

Reusable building blocks are in `src/components/ui`:

- `ScreenHeader`: standard title/subtitle/pretitle block
- `PrimaryButton`: default CTA (optional `pulse`, `haptic`)
- `ElevatedCard`: consistent card container with tokenized border/shadow
- `CoverImage`: unified list-card cover height + top corner radius
- `StateCard`: empty/error states with primary + secondary recovery actions
- `PressableCard`: subtle press-scale on tappable cards
- `AnimatedSection`: fade + slide-in on section load
- `ShakeGiftBadge`: reward-ready gift icon with bell shake (`rewardReady` + `motion` tokens)
- `ScreenSkeleton` / `SkeletonBlock`: loading placeholders

When adding new screens or redesigning existing ones, prefer these primitives before introducing screen-specific variants.

## Copy + Feedback Helpers

- `src/lib/progressCopy.ts`: human progress lines (e.g. `2 visits to free coffee`)
- `src/lib/haptics.ts`: `hapticTabChange`, `hapticLightTap`, `hapticSuccess` (tabs, CTAs, join/unlock/claim)

## Media + Performance

- Media URL helpers are in `src/lib/media.ts`.
- Use thumbnail-first fields where available (`cover_image_thumb`, `image_thumb`) to improve perceived load speed.

## Branding

- App icon and native splash come from `assets/`.
- After splash/icon updates, restart Expo with cleared cache:

```bash
npm --prefix apps/mobile run start -- --clear
```

