# Architecture

This app is a Laravel/Vue monolith for hospitality loyalty. A user can belong to multiple venues with different roles, each venue membership has its own QR token and progression balance, staff add stars in venue context, and customers or staff claim unlocked milestones with audit trails via `redeemed_by` and `created_by`.

## High-Level Structure

```text
app/
  Enums/                  UserRole (admin, customer)
  Events/                 Broadcast events (StampAdded)
  Http/Controllers/Api/   REST API controllers
  Http/Controllers/Auth/  Google OAuth (Socialite)
  Http/Requests/          Request validation
  Models/                 Venue, VenueUser, Customer, Reward, RewardUnlock, CustomerRewardCycle, Visit, User
  Services/               LoyaltyStampService (progression engine)
  Support/                VenueAccess (membership authorization)

config/
  broadcasting.php        Reverb broadcaster config
  reverb.php              Reverb WebSocket server config
  services.php            Google OAuth client config

database/
  migrations/             venues, venue_users, customers, rewards, progression tables, visits, google fields
  seeders/                Demo venues, memberships, customers, milestones

resources/js/
  components/             UI and loyalty components (SwipeToRedeem, VenueFilter, etc.)
  layouts/                AppShell (workspace vs customer nav)
  lib/                    API, Echo/Reverb, onboarding helpers, redirect sanitization
  pages/                  Route-level Vue pages
  router/                 Vue Router (workspace meta flag)
  stores/                 auth, workspace, realtime

routes/
  api.php                 API routes (/venues/...)
  web.php                 Google OAuth + SPA fallback
  channels.php            Private broadcast channels
```

## Domain Model

| Model | Purpose |
|-------|---------|
| `User` | Login identity. Global role: `admin` or `customer`. Optional `google_id`, `google_avatar`. |
| `Venue` | Hospitality workspace (cafe, bar, restaurant). `owner_user_id`, soft deletes, profile fields. |
| `VenueUser` | Membership pivot: `venue_id`, `user_id`, `role` (`owner`, `manager`, `staff`). |
| `Customer` | One user’s loyalty card at one venue: `qr_token`, `stamps`. |
| `Reward` | Venue milestone definitions (`required_stamps`, optional description/image, `active`). |
| `RewardUnlock` | Per-customer milestone unlock state for each cycle (including claim status). |
| `CustomerRewardCycle` | Tracks cycle number and completion per customer. |
| `Visit` | Stamp/visit history; `created_by` = staff user who added stars. |
| `RewardRedemption` | Redemption record; `redeemed_by` = user who redeemed. |

Important: QR tokens and stamp balances are **per venue membership** (`customers` row), not global per user.

## Role Model

```text
Global (users.role)
  admin     → platform-wide access
  customer  → default for everyone (including venue owners and staff)

Venue-scoped (venue_users.role)
  owner     → full venue + team + soft delete
  manager   → edit venue, rewards, logo, invite staff
  staff     → scanner, customers, staff redemption
```

Authorization uses `App\Support\VenueAccess`:

- Platform admin bypasses membership checks.
- Otherwise require a `venue_users` row for the target venue.
- Optional role list: e.g. `['owner', 'manager']` for team management.
- Scanner and venue dashboard APIs call `requireAccess` before processing.

Workspace selection auto-selects the first active venue when none is chosen (MVP single-venue UX). The venue filter no longer exposes an “all venues” aggregate view on dashboard/customers.

## Authentication

### Email / password

- `POST /api/auth/register`, `POST /api/auth/login`
- Sanctum bearer token returned to the SPA

### Google OAuth

Web routes (session-backed redirect flow):

- `GET /auth/google/redirect` — stores `venue_slug`, `redirect`, `intent` in session, redirects to Google
- `GET /auth/google/callback` — creates/updates user, issues Sanctum token, redirects to `FRONTEND_URL/login?oauth_token=...`

Frontend (`resources/js/lib/onboarding.ts`):

- `buildGoogleAuthUrlWithIntent(venueSlug, nextPath, intent)` builds the redirect URL
- `intent=owner` → post-auth owner onboarding (`/onboarding/create-venue`)
- `venue_slug` present → customer flow, auto-join after login

Redirect paths are sanitized in `resources/js/lib/redirect.ts` (internal paths only).

## Multi-Venue Workspaces

Owners manage venues from `/my-venues`.

- Creating a venue sets `owner_user_id` and creates `venue_users` with role `owner`.
- First-time owners without membership are routed to `/onboarding` (5-step wizard).
- Delete: soft delete on `venues` (removed from UI immediately in workspace store).
- Settings: `/my-venues/:id/settings` (logo, QR download PNG, invite link).
- Team: `/team` lists and invites members for the filtered venue.

## Main Flows

### Guest Venue Landing (QR)

1. Guest opens `/v/{slug}` (no auth required).
2. `GET /api/public/venues/{slug}/landing` returns venue name, logo, reward previews.
3. **Join** → `/register` or `/login` with `venue_slug` and safe `redirect`.
4. After auth, `joinVenueFromIntent()` calls `POST /api/venues/{slug}/join`.
5. Customer lands on `/card` for that venue.

### Owner Onboarding

1. Homepage CTA → `/register?intent=owner` (or Google with `intent=owner`).
2. After auth → `/onboarding/create-venue` (5 steps: name, category, logo, rewards, QR).
3. On completion → `/dashboard?onboarding=completed` (toast, no extra completion screen).

### Customer Joins a Venue (in-app)

1. Customer opens `/cafes` or arrives from QR landing.
2. `POST /api/venues/{venue:slug}/join`
3. Backend creates `Customer` for `user_id` + `venue_id`.
4. Customer opens `/card?venue_id=<id>` for that card’s QR.

### Staff Adds Stars

1. Open `/scanner` (active venue) or `/scanner?venue_id=<id>`.
2. Choose star amount (1–5 preset or custom 1–100).
3. Scan QR or use customer search fallback.
4. `POST /api/venues/{venue}/scanner/stamps` with `qr_token` and `stamps`.
5. `VenueAccess::requireAccess($user, $venue, ['owner', 'manager', 'staff'])`.
6. `LoyaltyStampService::addStamp()` updates stamps, creates `Visit` with `created_by`, broadcasts `StampAdded`.

Duplicate scan guard: same card cannot be stamped again within **5 seconds**.

### Customer Claims Milestone

1. `/card` or `/rewards` → wallet overlay → swipe to redeem.
2. `POST /api/customers/{customer}/rewards/{reward}/redeem`
3. Validates card ownership, requires unlocked milestone in current cycle.

### Staff Claims Milestone

1. `POST /api/venues/{venue}/customers/{customer}/rewards/{reward}/redeem`
2. Requires venue membership (`owner`, `manager`, `staff`).

### Realtime

1. Customer subscribes to `private-customer.{customerId}`.
2. Event `stamp.added` payload includes `venue`, progression, milestones.
3. UI updates card; optional redirect to `/card?venue_id=...`.

Auth: `POST /api/broadcasting/auth` with Sanctum bearer token.

## Key Backend Files

### `app/Support/VenueAccess.php`

- `membership($user, $venue)` → `VenueUser|null`
- `canAccess($user, $venue, $roles = [])` → bool
- `requireAccess($user, $venue, $roles = [])` → abort 403

### `app/Services/LoyaltyStampService.php`

- `addStamp(Customer, User $staff, int $stamps)` — lock row, increment stamps, visit, broadcast
- `redeemReward(Customer, Reward, User $redeemer)` — validate venue match, redemption row
- `nextRewardFor` / `availableRewardsFor`

### `app/Http/Controllers/Api/VenueController.php`

- `index` — venues the user is a member of (or all for admin)
- `discover` — all venues for customer browse/join
- `publicLanding` — public venue + rewards preview for `/v/:slug`
- `current` — `active_venue_id` venue
- `select` — set active workspace
- `store` / `update` / `destroy` (soft delete)
- `uploadLogo` / `destroyLogo`
- `customers` — CRM list for venue

### `app/Http/Controllers/Auth/GoogleAuthController.php`

- `redirect` — session intent (`venue_slug`, `redirect`, `intent`)
- `callback` — user upsert, token, redirect to frontend login with `oauth_token`

### `app/Http/Controllers/Api/StaffScanController.php`

- `lookup` / `addStamp` — venue-scoped QR validation

## Frontend Structure

### Workspace vs customer UI

Router `workspace` mode enables owner/staff sidebar: Dashboard, My Venues, Customers, Rewards, Analytics, Team, Settings.

Customers see: Card, Cafes, Rewards.

Guests see: Landing (`/`), Venue landing (`/v/:slug`), Login, Register.

### Key pages

| Page | Route | Purpose |
|------|-------|---------|
| Venue landing | `/v/:slug` | Guest QR preview + join CTA |
| Register / Login | `/register`, `/login` | Unified auth; venue context + owner intent |
| Owner onboarding | `/onboarding/create-venue` | 5-step venue setup wizard |
| Dashboard | `/dashboard` | Single-venue hero, QR, rewards preview, setup assistant |
| My Venues | `/my-venues` | Multi-location command center |
| Venue settings | `/my-venues/:id/settings` | Edit venue, logo, QR download |
| Team | `/team` | Invite/remove staff for active venue |
| Scanner | `/scanner?venue_id=` | Staff star flow (membership required) |
| Customer card | `/card?venue_id=` | QR + redeem |
| Cafes | `/cafes` | Discover/join venues |

### Stores

- `auth.ts` — token, user identity, `loginWithToken` for OAuth handoff
- `workspace.ts` — venues, auto-select first venue, filter context
- `realtime.ts` — Echo subscriptions, `venue_id` in redirects

## API Route Summary

Public:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/public/venues/{slug}/landing`

Web (non-API):

- `GET /auth/google/redirect`
- `GET /auth/google/callback`

Authenticated:

- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/broadcasting/auth`

Venues:

- `GET /api/venues` — member venues
- `GET /api/venues/discover` — customer discovery
- `GET /api/venues/current`
- `POST /api/venues`
- `GET|PUT|DELETE /api/venues/{venue}`
- `POST /api/venues/{venue}/select`
- `POST|DELETE /api/venues/{venue}/logo`
- `GET /api/venues/{venue}/customers`
- `GET /api/venues/{venue}/dashboard`
- `GET /api/dashboard?venue_id=`
- `GET|POST|PUT|DELETE /api/venues/{venue}/rewards`
- `POST /api/venues/{venue}/scanner/lookup`
- `POST /api/venues/{venue}/scanner/stamps`
- `POST /api/venues/{venue:slug}/join`
- `POST /api/venues/{venue}/customers/{customer}/rewards/{reward}/redeem`

Team:

- `GET /api/venues/{venue}/team`
- `POST /api/venues/{venue}/team/invite`
- `PATCH /api/venues/{venue}/team/{user}`
- `DELETE /api/venues/{venue}/team/{user}`

Customer:

- `GET /api/customer/cards?venue_id=`
- `GET /api/customers/{customer}/card`
- `GET /api/customers/{customer}/rewards`
- `POST /api/customers/{customer}/rewards/{reward}/redeem`

## Docker Services

| Service | Port | Role |
|---------|------|------|
| app | 8000 | Laravel HTTP |
| vite | 5173 | Vue dev server (HMR) |
| reverb | 8080 | WebSockets |
| mysql | (internal) | Database |

The `app` container broadcasts to Reverb via `host.docker.internal:8080` when Docker DNS for the `reverb` service name is unreliable.

## Seeded Demo Data

- 4 venues: Demo Cafe, Harbor Coffee, North Star Burgers, Olive Street Kitchen
- Owner membership on all four
- Staff membership on Demo Cafe only
- `customer@example.com` has 100 stamps at Demo Cafe for reward testing
- Demo Cafe slug: `demo-cafe` → guest landing at `/v/demo-cafe`

## Implementation Notes

- Global `users.role` does not grant scanner or admin UI access; use `venue_users`.
- `owner_user_id` on `venues` is the creating owner record; permissions use `venue_users.role = owner`.
- Logo files: `/uploads/venue-logos/`.
- Staff invite creates new users with password `password` (MVP; replace with email invites later).
- `FRONTEND_URL` must point at the SPA origin used after OAuth (production: `https://flotory.com`; local Docker: `http://localhost:8000`).
