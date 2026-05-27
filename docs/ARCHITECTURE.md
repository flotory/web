# Architecture

This app is a Laravel/Vue monolith for hospitality loyalty. A user can belong to multiple venues with different roles, each venue membership has its own QR token and stamp balance, staff add stars in venue context, and customers or staff can redeem unlocked rewards with audit trails via `redeemed_by` and `created_by`.

## High-Level Structure

```text
app/
  Enums/                  UserRole (admin, customer)
  Events/                 Broadcast events (StampAdded)
  Http/Controllers/Api/   REST API controllers
  Http/Requests/          Request validation
  Models/                 Venue, VenueUser, Customer, Reward, Visit, User
  Services/               LoyaltyStampService
  Support/                VenueAccess (membership authorization)

config/
  broadcasting.php        Reverb broadcaster config
  reverb.php              Reverb WebSocket server config

database/
  migrations/             venues, venue_users, customers, rewards, visits
  seeders/                Demo venues, memberships, customers, rewards

resources/js/
  components/             UI and loyalty components (SwipeToRedeem, etc.)
  layouts/                AppShell (workspace vs customer nav)
  lib/                    API and Echo/Reverb clients
  pages/                  Route-level Vue pages
  router/                 Vue Router (workspace meta flag)
  stores/                 auth, realtime

routes/
  api.php                 API routes (/venues/...)
  channels.php            Private broadcast channels
  web.php                 SPA fallback
```

## Domain Model

| Model | Purpose |
|-------|---------|
| `User` | Login identity. Global role: `admin` or `customer`. |
| `Venue` | Hospitality workspace (cafe, bar, restaurant). `owner_user_id`, soft deletes, profile fields. |
| `VenueUser` | Membership pivot: `venue_id`, `user_id`, `role` (`owner`, `manager`, `staff`). |
| `Customer` | One user’s loyalty card at one venue: `qr_token`, `stamps`. |
| `Reward` | Venue reward tiers (`required_stamps`, `active`). |
| `Visit` | Stamp/visit history; `created_by` = staff user who added stars. |
| `RewardRedemption` | Redemption record; `redeemed_by` = user who redeemed. |

Important: QR tokens and stamp balances are **per venue membership** (`customers` row), not global per user.

## Role Model

```text
Global (users.role)
  admin     → platform-wide access
  customer  → default for everyone (including venue owners and staff)

Venue-scoped (venue_users.role)
  owner     → full venue + team + archive
  manager   → edit venue, rewards, logo, invite staff
  staff     → scanner, customers, staff redemption
```

Authorization uses `App\Support\VenueAccess`:

- Platform admin bypasses membership checks.
- Otherwise require a `venue_users` row for the target venue.
- Optional role list: e.g. `['owner', 'manager']` for team management.

`users.active_venue_id` is the **current workspace** for dashboard, rewards, team, and default scanner — not the only way to scope the scanner (`?venue_id=` query param).

## Multi-Venue Workspaces

Owners manage venues from `/my-venues`.

- Creating a venue sets `owner_user_id` and creates `venue_users` with role `owner`.
- Active workspace: `POST /api/venues/{venue}/select` updates `active_venue_id`.
- Archive: soft delete on `venues`.
- Settings: `/my-venues/:id/settings` (logo upload to `public/uploads/venue-logos/`).
- Team: `/team` lists and invites members for the active venue.

## Main Flows

### Customer Joins a Venue

1. Customer opens `/cafes`.
2. `POST /api/venues/{venue:slug}/join`
3. Backend creates `Customer` for `user_id` + `venue_id`.
4. Customer opens `/card?venue_id=<id>` for that card’s QR.

### Staff Adds Stars

1. Open `/scanner` (active venue) or `/scanner?venue_id=<id>`.
2. Choose star amount (1–5 preset or custom 1–100).
3. Scan QR or use customer search fallback.
4. `POST /api/venues/{venue}/scanner/stamps` with `qr_token` and `stamps`.
5. `VenueAccess` requires `owner`, `manager`, or `staff`.
6. `LoyaltyStampService::addStamp()` updates stamps, creates `Visit` with `created_by`, broadcasts `StampAdded`.

Duplicate scan guard: same card cannot be stamped again within **5 seconds** (intentionally short so staff can correct mistakes).

### Customer Redeems Reward

1. `/card` or `/rewards` → wallet overlay → swipe to redeem.
2. `POST /api/customers/{customer}/rewards/{reward}/redeem`
3. Validates card ownership, deducts stamps, sets `redeemed_by` to the customer.

### Staff Redeems Reward

1. `POST /api/venues/{venue}/customers/{customer}/rewards/{reward}/redeem`
2. Requires venue membership (`owner`, `manager`, `staff`).
3. Sets `redeemed_by` to the staff user.

### Realtime

1. Customer subscribes to `private-customer.{customerId}`.
2. Event `stamp.added` payload includes `venue` (not `restaurant`).
3. UI updates card; optional redirect to `/card?venue_id=...`.

Auth: `POST /api/broadcasting/auth` with Sanctum bearer token.

## Key Backend Files

### `app/Support/VenueAccess.php`

- `membership($user, $venue)` → `VenueUser|null`
- `canAccess($user, $venue, $roles = [])` → bool
- `requireAccess($user, $venue, $roles = [])` → abort 403

### `app/Services/LoyaltyStampService.php`

- `addStamp(Customer, User $staff, int $stamps)` — lock row, increment stamps, visit, broadcast
- `redeemReward(Customer, Reward, User $redeemer)` — validate venue match, deduct stamps, redemption row
- `nextRewardFor` / `availableRewardsFor`

### `app/Http/Controllers/Api/VenueController.php`

- `index` — venues the user is a member of (or all for admin)
- `discover` — all venues for customer browse/join
- `current` — `active_venue_id` venue
- `select` — set active workspace
- `store` / `update` / `destroy` (archive)
- `uploadLogo` / `destroyLogo`
- `customers` — CRM list for venue

### `app/Http/Controllers/Api/VenueTeamController.php`

- `index` — team members (owner/manager only)
- `invite` — create user if needed, attach `manager` or `staff`
- `update` — change role (owner only)
- `destroy` — remove membership

### `app/Http/Controllers/Api/StaffScanController.php`

- `lookup` / `addStamp` — venue-scoped QR validation

### `app/Events/StampAdded.php`

Broadcast payload keys: `customer`, `venue`, `previous_stamps`, `added_stamps`, `stamps`, `next_reward`, `available_rewards`, `message`, `occurred_at`.

## Frontend Structure

### Workspace vs customer UI

Router meta `workspace: true` enables owner/staff sidebar: Dashboard, My Venues, Customers, Rewards, Analytics, Team, Settings.

Customers see: Card, Cafes, Rewards.

### Key pages

| Page | Route | Purpose |
|------|-------|---------|
| My Venues | `/my-venues` | List/create/archive/switch venues |
| Venue settings | `/my-venues/:id/settings` | Edit venue + logo |
| Team | `/team` | Invite/remove staff for active venue |
| Scanner | `/scanner?venue_id=` | Staff star flow |
| Customer card | `/card?venue_id=` | QR + redeem |
| Cafes | `/cafes` | Discover/join venues |

### Stores

- `auth.ts` — token, user (`active_venue_id`, `active_venue`)
- `realtime.ts` — Echo subscriptions, `venue_id` in redirects

## API Route Summary

Public:

- `POST /api/auth/register`
- `POST /api/auth/login`

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
| vite | 5173 | Vue dev server |
| reverb | 8080 | WebSockets |
| mysql | (internal) | Database |

The `app` container broadcasts to Reverb via `host.docker.internal:8080` when Docker DNS for the `reverb` service name is unreliable.

## Seeded Demo Data

- 4 venues: Demo Cafe, Harbor Coffee, North Star Burgers, Olive Street Kitchen
- Owner membership on all four
- Staff membership on Demo Cafe only
- `customer@example.com` has 100 stamps at Demo Cafe for reward testing

## Implementation Notes

- Global `users.role` does not grant scanner or admin UI access; use `venue_users` or `active_venue_id`.
- `owner_user_id` on `venues` is the creating owner record; permissions use `venue_users.role = owner`.
- Logo files: `/uploads/venue-logos/`.
- Staff invite creates new users with password `password` (MVP; replace with email invites later).
