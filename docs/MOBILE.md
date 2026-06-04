# Mobile app (Expo)

Customer and staff loyalty flows on iOS/Android via **Expo Router** (`apps/mobile`). The app uses the same Laravel JSON API as the Vue owner SPA, with bearer tokens from Sanctum.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for backend layers and [CAMPAIGNS.md](./CAMPAIGNS.md) for stamp campaigns (owner web only; customers see `home_campaigns` on `GET /customer/cards`).

## Stack

| Piece | Technology |
|-------|------------|
| Framework | Expo SDK, React Native |
| Routing | Expo Router (`app/` file-based routes) |
| Auth | `AuthProvider` + secure token storage |
| API | `src/lib/api.ts` → `EXPO_PUBLIC_API_URL` + `/api` prefix |
| Data | Hooks in `src/hooks/` wrapping `src/lib/customerData.ts` |

## Local run

```bash
cd apps/mobile
npm ci
npm run typecheck
npx expo start
```

Set `EXPO_PUBLIC_API_URL` to your Laravel host (e.g. `http://localhost` when using Docker).

## Role routing

After login, `AuthProvider` loads `/auth/me` and `/venues`. Role drives the default tab:

| Role | Default experience |
|------|-------------------|
| `owner` | Owner dashboard (`owner-dashboard.tsx`) |
| `staff` | QR scanner (`scanner.tsx`) |
| `customer` | Customer tabs under `app/(customer)/` |

**Campaigns** are managed in the **Vue owner app** (`/campaigns`), not in mobile.

## Customer tab bar

Custom bottom bar (`CustomerTabBar` + `TabBarQrButton`) with a center scoop for **My QR**.

| Tab | Route | Visible in bar |
|-----|-------|----------------|
| Home | `/(customer)/home` | Yes |
| Wallet | `/(customer)/wallet` | Yes |
| My QR | `/(customer)/qr` | Center button (no label) |
| Venues | `/(customer)/venues` | Yes |
| Profile | `/(customer)/settings` | Yes |
| Rewards | `/(customer)/rewards` | Hidden (`href: null`) — opened from home/wallet CTAs |
| Notifications | `/(customer)/notifications` | Hidden — opened from home header bell |

Home shows reward **ticket cards** for ready-to-claim items, a **campaign carousel** (`home_campaigns`), and quick actions. The notifications bell shows an unread dot only when `unreadCount > 0` (inbox API is future work).

## Screens ↔ API

### Auth

| Screen | Path | API |
|--------|------|-----|
| Login | `app/login.tsx` | `POST /auth/login` |
| Register | (via provider) | `POST /auth/register` |
| Session | `AuthProvider` | `GET /auth/me`, `GET /venues`, `POST /auth/logout` |

### Customer

| Screen | Path | API |
|--------|------|-----|
| Home | `app/(customer)/home.tsx` | `GET /customer/cards` (`home_campaigns`), `GET /customer/rewards/wallet` |
| **My QR** | `app/(customer)/qr.tsx` | `GET /customer/stamp-qr` |
| Wallet list | `app/(customer)/wallet.tsx` | `GET /customer/cards` |
| Card detail | `app/card/[cardId].tsx` | `GET /customer/cards?venue_id={id}` — progress, reward-ready section; stamps via My QR |
| Rewards | `app/(customer)/rewards.tsx` | Wallet + cards hooks |
| Notifications | `app/(customer)/notifications.tsx` | Placeholder (push inbox not implemented) |
| Discover | `app/(customer)/venues.tsx` | `GET /venues/discover`, `POST /venues/{slug}/join` |
| Profile | `app/(customer)/settings.tsx` | Auth + stats from cards |
| Claim flow | `app/claim/[unlockId].tsx` | `POST /customer/rewards/unlocks/{id}/claim-session`, poll claim session |
| Public landing | `app/v/[slug].tsx` | `GET /public/venues/{slug}/landing`, join when logged in |

### Staff / owner (mobile)

| Screen | Path | API |
|--------|------|-----|
| Scanner | `app/scanner.tsx` | `GET /venues`, `GET /venues/{id}/customers`, `POST /venues/{id}/scanner/scan` |
| Owner dashboard | `app/owner-dashboard.tsx` | `GET /dashboard` (includes `active_campaigns`, recommendations) |

Scanner responses may include `active_campaign` when a stamp multiplier applies (same engine as web scanner).

## Conventions

1. Screens call **hooks** (`useCustomerCards`, `useCardDetail`, `useStampQr`, …), not `apiRequest` directly.
2. Use `useCallback` for `useScreenResource` loaders to avoid refetch loops.
3. Invalidate caches via `invalidateCustomerCaches` after stamp/claim/join.
4. Types live in `src/types/` (`loyalty.ts`, `auth.ts`).

## CI

GitHub Actions job **Mobile typecheck** runs `npm run typecheck` in `apps/mobile` on every PR to `main`.
