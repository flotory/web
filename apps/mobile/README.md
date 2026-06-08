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

For production realtime (stamp animations after staff scan), set Reverb env to match the server (see `deploy/env.production.example`):

```bash
EXPO_PUBLIC_API_BASE_URL=https://flotory.com/api \
EXPO_PUBLIC_REVERB_APP_KEY=your-prod-reverb-key \
EXPO_PUBLIC_REVERB_HOST=flotory.com \
EXPO_PUBLIC_REVERB_PORT=443 \
EXPO_PUBLIC_REVERB_SCHEME=https \
npm --prefix apps/mobile run start
```

Without matching keys, the app still detects new stamps via polling (fast on Home/My QR/card, slower elsewhere) and opens your venue card with animation.

## Google sign-in

Login screen: **Continue with Google** (same accounts as the website).

Uses the **same web OAuth flow** as [flotory.com](https://flotory.com):

1. In-app browser opens `https://flotory.com/auth/google/redirect?mobile=1`
2. Google authenticates via the existing web OAuth client (no separate iOS/Android client required)
3. Server redirects back to `flotory://login?oauth_token=...`
4. App stores the Sanctum token and opens Home

No extra Google Cloud redirect URIs beyond the web callback (`https://flotory.com/auth/google/callback`).

`POST /api/auth/google` (id_token) remains available for future native Google SDK integration.

## Automated checks in CI

On every push to `main`, GitHub runs:

- `npm run typecheck --prefix apps/mobile`
- `npm run test:unit -- apps/mobile/src` (from repo root, after `npm ci`)

Shared unit tests live beside mobile libs (`src/lib/*.test.ts`). See [docs/TESTING.md](../../docs/TESTING.md).

## Mobile E2E Smoke Tests

We use [Maestro](https://maestro.mobile.dev/) for local mobile smoke tests. These are intentionally small and manual-first.

Install Maestro once:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Run the app in a simulator, then run:

```bash
# Dev build app id
APP_ID=com.flotory.mobile \
CUSTOMER_EMAIL=customer@example.com \
CUSTOMER_PASSWORD=password \
TEST_VENUE_NAME="Demo Cafe" \
npm run test:mobile:e2e

# Expo Go app id, if testing through Expo Go
APP_ID=host.exp.Exponent \
CUSTOMER_EMAIL=customer@example.com \
CUSTOMER_PASSWORD=password \
TEST_VENUE_NAME="Demo Cafe" \
npm run test:mobile:e2e
```

The flows live in `.maestro/mobile` and cover:

- login -> Home
- Wallet -> cafe card
- ready reward -> claim QR

The claim QR smoke expects seeded demo data with a ready reward. Re-run local seed if it fails because demo rewards were already claimed.

## Architecture (customer app)

- **Tabs:** custom `CustomerTabBar` — Home, Wallet, center My QR (`TabBarQrButton`), Venues, Profile; Notifications is a hidden stack route
- **Data:** `src/lib/customerData.ts` + `src/lib/resourceCache.ts` — shared API fetchers with short-lived in-memory cache
- **Hooks:** `src/hooks/` — `useCustomerCards`, `useRewardsWallet`, `useDiscoverVenues`, `useCardDetail`, `useStampQr`, `useScreenResource`
- **Screens:** prefer hooks over inline `useEffect` fetch blocks; use `CustomerScreen` for loading/error/refresh shell
- **UI:** customer screens use `ScreenGradientLayout`, theme tokens, `GradientCard`, `StateCard`, `HomeRewardTicketCard`, `HomeScreenHeader` (bell → notifications; unread dot when `unreadCount > 0`)

### Conventions

1. Customer data goes through hooks in `src/hooks/`, not direct `apiRequest` in screens
2. Use theme tokens — no inline hex in customer UI
3. Empty/error states use `StateCard`
4. Card detail requires `venueId`; `cardId` is validated against the loaded card

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

- `ScreenHeader` / `HomeScreenHeader`: standard title blocks; home header includes notifications bell
- `StickyBackButton`: floating back control on scrollable detail screens
- `PrimaryButton`: default CTA (optional `pulse`, `haptic`)
- `GradientCard`: soft gradient card with optional cover overlap (`overlap` slot for wallet avatars)
- `GradientOutlineButton`: white pill CTA used on reward cards
- `CustomerScreen`: shared loading/error/refresh shell for customer tabs
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

