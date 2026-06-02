# Flotory Mobile (Expo + React Native)

This app lives in `apps/mobile` and uses the existing Laravel API as the source of truth.

## Current setup

- Expo + React Native + TypeScript
- `expo-router` routing
- Token auth stored in `expo-secure-store`
- API default: `https://flotory.com/api` (override via `EXPO_PUBLIC_API_BASE_URL`)

## Phased roadmap

### Phase 0 (done) - Foundation

- App scaffold, routing, session storage
- Login/logout with Laravel token auth
- Role-aware home placeholders

### Phase 1 (in progress) - Staff Scanner MVP

Goal: staff can scan customer/claim QR and trigger existing backend scanner flow.

- Camera permission + QR scanning
- Load accessible venues and pick active scanner venue
- Call `POST /venues/{venue}/scanner/scan`
- Support stamp amount presets (1-5)
- Show stamp/redeem success and API errors
- Cooldown after each scan to avoid duplicate triggers

### Phase 2 - Customer Wallet MVP

- List wallet cards (`/customer/cards`)
- Card detail progress + claim entry point
- Claim QR flow parity with web (`/customer/rewards`)

### Phase 3 - Reliability and release

- Better offline/error UX
- Deep links for claim/redeem paths
- Internal builds (EAS), pilot test loops

## Branding

- App icon and native splash use `public/icons/` exports copied into `assets/`.
- After changing splash assets, restart Expo with cache clear: `npm start -- --clear`.

## Run

```bash
npm --prefix apps/mobile start
```

For local backend:

```bash
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:8000/api npm --prefix apps/mobile start
```

