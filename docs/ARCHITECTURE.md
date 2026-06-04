# Architecture

Laravel/Vue monolith for hospitality loyalty. One login identity (`users`) can hold venue team memberships (`venue_users`), loyalty cards (`customers`), or both. Business rules live in services; the SPA renders API state.

See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for terminology and [MVP_DECISIONS.md](./MVP_DECISIONS.md) for locked decisions.

## Stack

| Layer | Technology |
|-------|------------|
| API | Laravel 12, PHP 8.3+, MySQL |
| Auth | Laravel Sanctum (bearer tokens) |
| OAuth | Laravel Socialite (Google) via web routes |
| Realtime | Laravel Reverb + Echo (optional; stamp events) |
| Frontend | Vue 3, Vite, Pinia, Vue Router, TailwindCSS |
| Uploads | Local filesystem under `public/uploads/` |
| Deploy | Docker on VPS; Nginx → Laravel |

## Repository Layout

```text
app/
  Events/                    StampAdded broadcast event
  Http/Controllers/Api/      REST API
  Http/Controllers/Auth/       Google OAuth
  Http/Requests/               Form validation
  Models/                    Eloquent domain models
  Services/                  CampaignService (facade), CampaignEngine, CampaignOwnerPresenter,
                             CustomerRetentionService, LoyaltyStampService, RedemptionClaimService,
                             VenueAnalyticsService, VenueStaffInvitationService, ImageThumbnailService
  Support/                   VenueAccess, CampaignTemplates

resources/js/
  components/                UI + loyalty (ClaimRewardModal, VenueFilter, …)
  composables/               useAsyncAction, useVenueTeam
  layouts/                   AppShell (owner vs staff vs customer nav)
  lib/                       api, onboarding, redirect, toast, realtime
  pages/                     Route-level Vue pages
  router/                    Guards (auth, ownerOnly, workspace)
  stores/                    auth, workspace, realtime

routes/
  api.php                    JSON API
  web.php                    Google OAuth + SPA fallback
  channels.php               Private customer broadcast channels
```

## Backend Layers

```text
Request → Route → Controller → (VenueAccess) → Service → Model/DB → JSON
                      ↓
                 FormRequest validation
```

**Rules:**

| Layer | Responsibility |
|-------|----------------|
| Routes | HTTP mapping, middleware (`auth:sanctum`) |
| Controllers | Authorize, validate, delegate, respond — no loyalty math |
| Services | Stamp awards, unlocks, claims, cycles; staff invitation lifecycle; campaign multipliers (see [CAMPAIGNS.md](./CAMPAIGNS.md)) |
| Models | Relationships, casts, accessors — no multi-step workflows |
| Vue | Fetch, display, forms — **no business logic** |

## Domain Model

```text
User ──┬──< VenueUser >── Venue ──< Reward
       │                      │
       └──< Customer ─────────┘
                │
                ├──< Visit
                ├──< CustomerRewardCycle
                └──< RewardUnlock >── Reward
```

| Model | Table | Purpose |
|-------|-------|---------|
| `User` | `users` | Login identity. `is_admin` for platform admin only. `active_venue_id` for workspace selection. Optional `google_id`, `google_avatar`. |
| `Venue` | `venues` | Workspace. Slug, category, branding, soft deletes. **No** `owner_user_id`. |
| `VenueUser` | `venue_users` | Team membership pivot: `role` = `owner` \| `staff`. |
| `Customer` | `customers` | Loyalty card: one row per `(user_id, venue_id)` with `stamps`. `qr_token` deprecated (nullable, hidden from API). |
| `Reward` | `rewards` | Milestone definition: `required_stamps`, optional image, `active`, `reward_type` (= `milestone`). |
| `Visit` | `visits` | Audit row when staff award stamps via `addStamp`. `created_by` = staff user. |
| `CustomerRewardCycle` | `customer_reward_cycles` | Cycle counter; `completed_at` when top milestone reached. |
| `RewardUnlock` | `reward_unlocks` | Unlock + claim in one row (`unlocked_at`, `claimed_at`, `claimed_by`). **No** separate redemptions table. |
| `VenueStaffInvitation` | `venue_staff_invitations` | Pending staff invites (email, token, 7-day expiry). |

QR tokens and stamp balances are **per customer row**, not per user globally or per venue membership.

## Ownership and Authorization

**Platform:** `users.is_admin === true` bypasses venue membership checks.

**Venue team:** `venue_users.role`

| Role | Access |
|------|--------|
| `owner` | Dashboard, analytics, rewards, settings, team, venues, scanner, customers |
| `staff` | Scanner, customers (read), staff redemption, account |

**Loyalty:** `customers` row = participation at that venue (any signed-in user can join).

`App\Support\VenueAccess`:

- `membership($user, $venue)` → `VenueUser|null`
- `canAccess($user, $venue, $roles = [])` → bool
- `requireAccess($user, $venue, $roles = [])` → abort 403

Example: scanner requires `['owner', 'staff']`; team management requires `['owner']`.

## Loyalty Engine (`LoyaltyStampService`)

**`addStamp(Customer, User $staff, int $stamps)`**

1. Reject duplicate scan within 5 seconds (same customer).
2. Lock customer row; increment stamps (1–100).
3. Unlock milestones at or below current stamp count for active cycle.
4. If stamps ≥ max active milestone threshold: complete cycle, reset stamps to 0, start next cycle.
5. Create one `Visit` row (`created_by` = staff).
6. Broadcast `StampAdded` on `private-customer.{customerId}`.

**`redeemReward(Customer, Reward, User $redeemer)`**

- Finds the **oldest unclaimed** `RewardUnlock` for that `reward_id` (FIFO by `cycle_number`), including unlocks from prior cycles.
- Sets `claimed_at` and `claimed_by`. Does **not** reduce stamps.
- Wallet UI lists one row per unlock (`unlock_id`), but the API redeems by `reward_id` and always claims the oldest pending unlock first.

**Helpers:** `nextRewardFor`, `availableRewardsFor` (unique reward types with pending unlocks), `pendingUnlocksFor`, `pendingRewardCountFor`, `journeyFor`.

## Authentication

### Email / password

- `POST /api/auth/register`, `POST /api/auth/login`
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `PUT /api/auth/password` (authenticated)
- Sanctum bearer token returned to SPA

### Google OAuth

Web routes (session-backed):

- `GET /auth/google/redirect` — stores `venue_slug`, `redirect`, `intent` in session
- `GET /auth/google/callback` — upserts user, issues token, redirects to `FRONTEND_URL/login?oauth_token=...`

Frontend helpers in `resources/js/lib/onboarding.ts` and `redirect.ts` (internal paths only).

## Main Flows

### Guest QR landing

1. `GET /v/{slug}` → `GET /api/public/venues/{slug}/landing`
2. Join → register/login with `venue_slug`
3. `POST /api/venues/{slug}/join` → `/wallet?venue_id=…`

### Owner onboarding

1. Register with owner intent → `/onboarding/create-venue` (5 steps)
2. Complete → `/dashboard?onboarding=completed`

### Staff scanner (auto-detect)

One `/scanner` page; camera payload determines the action:

| QR type | Payload | API |
|---------|---------|-----|
| **Stamp (My QR)** | `flotory:member:{user_stamp_token}` | `POST /api/venues/{venue}/scanner/scan` or `.../stamps` |
| **Reward claim** | `flotory:redeem:{token}` or `/r/{token}` | `POST /api/venues/{venue}/scanner/redeem` or unified `scan` |

Parsed via `App\Support\LoyaltyQr` / `resources/js/lib/loyaltyQr.ts`. `ScannerService` resolves user → customer at scanner venue (auto-join). Legacy per-card `customers.qr_token` only if `LOYALTY_LEGACY_CARD_QR=true` (Phase 3 default: off). Staff manual fallback: `customer_id` on `.../stamps`.

Customer stamp QR: `GET /api/customer/stamp-qr`. **`qr_token` is not exposed** on customer API responses.

After a **stamp** scan, if the customer has unclaimed unlocks, the response includes `pending_claim_warning` (staff UI: ask guest to open **Rewards → Claim**, not My QR).

### Customer reward claim (QR)

1. `/customer/rewards` → `GET /api/customer/rewards/wallet` (one row per unclaimed unlock)
2. Tap **Claim** → `POST /api/customer/rewards/unlocks/{unlock}/claim-session` → short-lived `redemption_requests` row (10 min TTL)
3. Modal shows claim QR (`flotory:redeem:…`); customer polls claim session until `status: claimed`
4. Staff scans claim QR on the same scanner → redeem flow above

Claim QRs never appear on wallet/My QR — stamps only there.

### Staff claim (manual fallback)

`POST /api/venues/{venue}/customers/{customer}/rewards/{reward}/redeem` — still available for integrations; primary counter flow uses scanner redeem.

### Customer self-redeem (legacy API)

`POST /api/customers/{customer}/rewards/{reward}/redeem` remains for tests/backward compatibility; the product UI uses staff-scanned claim QRs instead of swipe-to-redeem.

### Staff invitation

1. Owner: `POST /api/venues/{venue}/team/invite`
2. Email link → `/invite/{token}`
3. New user: `POST /api/invites/{token}/register`; existing: sign in + `POST /api/invites/{token}/accept`

### Realtime (optional)

- Channel: `customer.{customerId}` (authorized via `customers.user_id`)
- Events: `.stamp.added`, `.reward.redeemed`
- Auth: `POST /api/broadcasting/auth`

## Frontend Structure

### Navigation modes (`AppShell`)

| Mode | Who | Primary routes |
|------|-----|----------------|
| Owner workspace | `venue_users.role = owner` | Dashboard, My Venues, Customers, Rewards, Analytics, Team, Settings |
| Staff workspace | staff-only membership | Scanner, Customers, Account |
| Customer | No team membership (or `workspace: false` routes) | Card, **Rewards** (`/customer/rewards`), Venues (`/venues`), Settings (`/customer/settings`) — bottom tab bar only, no top header |

Router guards: `requiresAuth`, `workspace`, `ownerOnly`, `allowWithoutMembership` (onboarding).

Post-login routing (`venueRoles.ts`): owners → dashboard; staff-only → scanner; customers → card.

Customer stamp updates animate on the progress grid; reward unlocks show a brief celebration overlay and bounce the Rewards tab badge. Redeem from **Rewards → Claim** (claim QR for staff) → poll until claimed → success celebration.

### Key pages

| Route | Page | Role |
|-------|------|------|
| `/v/:slug` | Venue landing | Guest |
| `/onboarding/create-venue` | Onboarding wizard | New owner |
| `/dashboard` | Operational dashboard (KPIs, insights, scanner) | Owner |
| `/my-venues`, `/my-venues/:id/settings` | Venue list & settings | Owner |
| `/rewards` | Milestone CRUD on guest stamp grid (click reward → toolbar: Edit / Archive) | Owner |
| `/scanner` | QR scanner | Owner, staff |
| `/customers` | Retention list (activity filters, last visit, redeems) | Owner, staff |
| `/customers/:customerId` | Profile: timeline, visits, rewards, notes, birthday | Owner, staff |
| `/analytics` | Retention stats | Owner |
| `/team` | Invitations & members | Owner |
| `/wallet` | Loyalty wallet (venue list + per-venue card detail) | Customer |
| `/customer/rewards` | Rewards wallet (pending unlocks) | Customer |
| `/venues` | Browse/search all venues, join or open card | Customer |
| `/customer/settings` | Account details + logout | Customer |
| `/invite/:token` | Accept staff invite | Invitee |

Workspace store auto-selects the first active venue when none is chosen (MVP single-venue focus).

## API Route Summary

**Public**

- `POST /api/auth/register`, `/login`, `/forgot-password`, `/reset-password`
- `GET /api/public/venues/{slug}/landing`
- `GET /api/invites/{token}`, `POST /api/invites/{token}/register`

**Authenticated**

- Auth: `/auth/me`, `/logout`, `/password`
- `POST /api/broadcasting/auth`
- Venues: CRUD, select, logo/cover upload, join, **discover**, customers, dashboard
- Rewards: nested CRUD + archive/reactivate/purge
- Scanner: lookup, stamps, **redeem** (claim QR token)
- Customer claim: `POST .../unlocks/{unlock}/claim-session`, `GET .../claim-sessions/{token}`
- Team: list, invite, resend/cancel invitation, update/remove member
- Customer: cards, card detail, rewards journey, **rewards wallet** (`GET /api/customer/rewards/wallet`), redeem
- Staff redeem: venue-scoped claim endpoint

Full list: `routes/api.php`.

## File Uploads

| Asset | Path | Thumbnail |
|-------|------|-----------|
| Venue logo | `/uploads/venue-logos/` | `{name}-thumb.jpg` (256px max) → `logo_thumb` |
| Venue cover | `/uploads/venue-covers/` | `{name}-thumb.jpg` (640px max) → `cover_image_thumb` |
| Reward image | `/uploads/reward-milestones/` | `{name}-thumb.jpg` (320px max) → `image_thumb` |

Upload handlers use `ImageThumbnailService` (PHP GD) to store full-size originals plus JPEG thumbnails. List/card UI loads thumbs via `rewardThumbUrl`, `venueLogoThumbUrl`, and `venueCoverThumbUrl`; detail/hero views use full URLs with thumb fallback.

Backfill existing uploads: `php artisan media:generate-thumbs` (runs on deploy).

Uploaded files are gitignored; directories created at deploy/boot.

## Docker Services (local)

| Service | Port | Role |
|---------|------|------|
| app | 8000 | Laravel HTTP |
| vite | 5173 | Vue HMR |
| reverb | 8080 | WebSockets |
| mysql | internal | Database |

## UI Patterns (frontend)

- **Settings / save actions:** `AsyncActionButton` — idle → `Saving…` → `Saved ✓`
- **Validation:** inline field errors from API (`ApiError`)
- **Destructive actions:** confirmation modal (delete venue, delete/archive reward)
- **Cross-page feedback:** `vue-sonner` toaster wired in `App.vue` (infrastructure present; use for global success/error)
- **Customer reward claim:** `ClaimRewardModal` — claim session QR, poll until staff scan; `RewardRedeemedCelebration` on success

## Seeded Demo Data

- Venues: Demo Cafe (`demo-cafe`), Harbor Coffee, North Star Burgers, Olive Street Kitchen
- `owner@example.com` — owner on all four
- `staff@example.com` — staff at Demo Cafe only
- `customer@example.com` — 100 stamps at Demo Cafe for reward testing

Demo password: `password` (local seed only).
