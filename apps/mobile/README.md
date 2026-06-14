# Flotory Mobile (Expo + React Native)

Mobile app lives in `apps/mobile` and uses the Laravel API as source of truth.

## Stack

- Expo + React Native + TypeScript
- `expo-router` for routing
- Token auth via `expo-secure-store`
- API default: `https://flotory.com/api` (override with `EXPO_PUBLIC_API_BASE_URL`)

## NFC stamp stands (native iOS — Xcode)

Stamps are **NFC-only**. Customers collect them from the center **Stamp** tab or by tapping a physical stand.

| Method | How it works | Works in Expo Go? |
|--------|----------------|-------------------|
| **Tag URL** | Tag programmed with `https://flotory.com/t/{token}`; iOS opens the app or web bridge | Yes (via system tap) |
| **In-app NFC scan** | Customer opens **Stamp** tab; Core NFC starts automatically | **No** — needs Xcode build |

Expo Go cannot load `react-native-nfc-manager` (Core NFC). Use a **development build** on a **physical iPhone** (NFC does not work in the Simulator).

`react-native-nfc-manager` v3 requires **legacy architecture** — this app sets `"newArchEnabled": false`. After changing that, run `npm run prebuild:ios` and rebuild in Xcode.

### One-time Xcode setup

1. Install deps and generate the native iOS project:

```bash
cd apps/mobile
npm install
npm run prebuild:ios
```

2. Open Xcode:

```bash
open ios/Flotory.xcworkspace
```

3. In Xcode → **Signing & Capabilities** for target `Flotory`:
   - Team: your Apple Developer team
   - Add capability **Near Field Communication Tag Reading** (if not already present from prebuild)

4. In [Apple Developer](https://developer.apple.com/account/resources/identifiers/list) → App ID `com.flotory.mobile`:
   - Enable **NFC Tag Reading**

5. Run on your iPhone (USB or wireless):

```bash
npm run run:ios
```

Or press **Run** in Xcode with your phone selected.

### Test flow

1. Admin creates a tag in **Manage venues → NFC stamp stands** and copies the tap URL.
2. Program a blank NFC tag (NDEF URI) with that URL.
3. In the app: open the **Stamp** tab (center button) and hold the phone on the stand when the NFC prompt appears.
4. App reads the URI, awards **+1 stamp** via the API, and navigates to your cafe card with animation.

Tags must contain a Flotory tap URL (`https://flotory.com/t/...` or `flotory://t/...`).

### Rewards

Ready rewards use **Slide to redeem** on Home (carousel + redeem screen), Wallet, and cafe cards (`POST /api/customer/rewards/unlocks/{unlock}/redeem`). There is no claim QR or staff scanner.

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

Stamp and redeem updates use **API polling** (fast on Home/Stamp/card screens, slower elsewhere). NFC taps still navigate to your venue card immediately from the HTTP response.

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

Run on a **simulator or device** with a **development build** (`com.flotory.mobile`), then from repo root:

```bash
chmod +x scripts/run-mobile-e2e.sh
# Seeds demo data (Docker or local PHP) and runs all Maestro flows
./scripts/run-mobile-e2e.sh
```

Or flows only when the DB is already seeded:

```bash
APP_ID=com.flotory.mobile \
CUSTOMER_EMAIL=customer@example.com \
CUSTOMER_PASSWORD=password \
TEST_VENUE_NAME="Demo Cafe" \
NFC_TAP_TOKEN=democafenfcstandlocaltest00001 \
npm run test:mobile:e2e:flows
```

Flows in `.maestro/mobile`:

| File | What it tests |
|------|----------------|
| `01-login-home.yaml` | Login → Home |
| `02-wallet-card.yaml` | Login → Wallet → venue card |
| `03-stamp-redeem.yaml` | NFC tap deep link → Home → slide redeem |
| `04-customer-tabs.yaml` | Login → Wallet / Venues / Profile / Home tabs |

`03-stamp-redeem` uses `flotory://t/{token}` — same backend path as a physical NFC tag, without radio hardware. Token is seeded on Demo Cafe (`DatabaseSeeder::DEMO_CAFE_NFC_TOKEN`).

Venue NFC setup guide for pilots: [docs/NFC_VENUE_SETUP.md](../../docs/NFC_VENUE_SETUP.md).

## Architecture (customer app)

- **Tabs:** custom `CustomerTabBar` — Home, Wallet, center Stamp (NFC radio icon), Venues, Profile; Notifications is a hidden stack route
- **Home:** unified rewards carousel (ready vouchers + in-progress cards), contextual NFC CTA (`HomeContextualCta`), campaigns carousel, activity feed
- **Data:** `src/lib/customerData.ts` + `src/lib/resourceCache.ts` — shared API fetchers with short-lived in-memory cache
- **Hooks:** `src/hooks/` — `useCustomerCards`, `useRewardsWallet`, `useDiscoverVenues`, `useCardDetail`, `useNfcStampScan`, `useScreenResource`
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
- `src/lib/haptics.ts`: `hapticTabChange`, `hapticLightTap`, `hapticSuccess` (tabs, CTAs, join/redeem)

## Media + Performance

- Media URL helpers are in `src/lib/media.ts`.
- Use thumbnail-first fields where available (`cover_image_thumb`, `image_thumb`) to improve perceived load speed.

## Branding

- App icon and native splash come from `assets/`.
- After splash/icon updates, restart Expo with cleared cache:

```bash
npm --prefix apps/mobile run start -- --clear
```

## TestFlight (EAS)

Production iOS builds use [EAS Build](https://docs.expo.dev/build/introduction/) (`apps/mobile/eas.json`). From `apps/mobile` after tests pass:

```bash
npm run typecheck
cd ../.. && npm run test:unit -- apps/mobile/src

eas build --platform ios --profile production
eas submit --platform ios --latest --profile production
```

`production` profile sets `EXPO_PUBLIC_API_BASE_URL=https://flotory.com/api` and auto-increments the iOS build number. Requires Expo account login and App Store Connect API key (or interactive Apple credentials on first submit).

