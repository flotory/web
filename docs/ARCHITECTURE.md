# Architecture

Laravel/Vue monolith for hospitality loyalty. One login identity (`users`) can hold venue team memberships (`venue_users`), loyalty cards (`customers`), or both. Business rules live in services; the SPA renders API state.

See [README.md](./README.md) for terminology and [MVP_DECISIONS.md](./MVP_DECISIONS.md) for locked decisions.

## Stack

| Layer | Technology |
|-------|------------|
| API | Laravel 12, PHP 8.3+, MySQL |
| Auth | Laravel Sanctum (bearer tokens) |
| OAuth | Laravel Socialite (Google) via web routes; mobile via `POST /api/auth/google` + `id_token` verify |
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
  Services/                  LoyaltyStampService, VenueBrandingService, VenueSetupFileService, VenueStaffInvitationService
  Support/                   VenueAccess authorization

resources/js/
  components/                UI + loyalty (VenueFilter, listing, admin setup files, …)
  composables/               useAsyncAction, useVenueTeam
  layouts/                   AppShell (owner workspace + platform admin nav)
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
| Services | Stamp awards, unlocks, claims, cycles; staff invitation lifecycle |
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
| `Venue` | `venues` | Workspace. Slug, category, branding, `status` (`draft` \| `pending_review` \| `published`), soft deletes. **No** `owner_user_id`. |
| `VenueUser` | `venue_users` | Team membership pivot: `role` = `owner` \| `staff`. |
| `Customer` | `customers` | Loyalty card: one row per `(user_id, venue_id)` with `qr_token`, `stamps`. |
| `Reward` | `rewards` | Milestone definition: `required_stamps`, optional image, `active`, `reward_type` (= `milestone`). |
| `Visit` | `visits` | Audit row when staff award stamps via `addStamp`. `created_by` = staff user. |
| `CustomerRewardCycle` | `customer_reward_cycles` | Cycle counter; `completed_at` when top milestone reached. |
| `RewardUnlock` | `reward_unlocks` | Unlock + claim in one row (`unlocked_at`, `claimed_at`, `claimed_by`). **No** separate redemptions table. |
| `VenueStaffInvitation` | `venue_staff_invitations` | Pending staff invites (email, token, 7-day expiry). |

QR tokens and stamp balances are **per customer row**, not per user globally or per venue membership.

## Ownership and Authorization

**Platform:** `users.is_admin === true` — system operator only. Platform admins **cannot** use venue owner/staff tools (`VenueAccess::assertNotPlatformAdmin`). Admin UI: `/admin/venues`, `/admin/manage-venues`, `/admin/palette`, `/admin/activity`.

**Venue team:** `venue_users.role`

| Role | Access |
|------|--------|
| `owner` | Web: dashboard, analytics, rewards, settings, team, my-venues, customers CRM. Mobile: scanner at counter. |
| `staff` | Web: `/invite/{token}` accept, `/account`. Mobile: scanner, staff redemption. |

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
- `POST /api/auth/google` — mobile: verify Google `id_token`, upsert user, return Sanctum token

Frontend helpers in `resources/js/lib/onboarding.ts` and `redirect.ts` (internal paths only).

## Main Flows

### Guest QR landing

1. `GET /v/{slug}` (web bridge) → `GET /api/public/venues/{slug}/landing` → deep link `flotory://v/{slug}`
2. Join in mobile app → register/login
3. `POST /api/venues/{slug}/join` → mobile wallet

### Owner onboarding

1. Register with owner intent → `/onboarding/create-venue` (4 steps: name+slug → category → rewards → QR)
2. Venue created as `draft` → owner completes listing checklist → submit → admin approve → `published`
3. Complete wizard → `/dashboard?onboarding=completed`

### Staff scanner (auto-detect — mobile app)

Mobile scanner screen; camera payload determines the action:

| QR type | Payload | API |
|---------|---------|-----|
| **Stamp (My QR)** | `flotory:member:{public_token}` from `user_stamp_tokens` | `POST /api/venues/{venue}/scanner/stamps` |
| **Reward claim** | `flotory:redeem:{token}` or `https://{app}/r/{redemption_token}` | `POST /api/venues/{venue}/scanner/redeem` |

Legacy per-card `customers.qr_token` is deprecated (`LOYALTY_LEGACY_CARD_QR=false` by default).

Parsed server-side via `App\Support\LoyaltyQr`; mobile client helpers in `apps/mobile/src/lib/`.

After a **stamp** scan, if the customer has unclaimed unlocks, the response includes `pending_claim_warning` (staff UI shows an info banner: ask the customer to open **Rewards → Claim**, not the stamp card).

### Customer reward claim (QR — mobile app)

1. Rewards screen → `GET /api/customer/rewards/wallet` (one row per unclaimed unlock)
2. Tap **Claim** → `POST /api/customer/rewards/unlocks/{unlock}/claim-session` → short-lived `redemption_requests` row (10 min TTL)
3. Screen shows claim QR (`/r/{token}`); customer polls `GET /api/customer/rewards/claim-sessions/{token}` until `status: claimed`
4. Staff scans claim QR on the mobile scanner → redeem flow above

Wallet detail QR is **stamps only**. Claim QRs (`flotory:redeem:…`) only appear on the claim screen.

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
- Event: `.stamp.added`
- Auth: `POST /api/broadcasting/auth`

## Frontend Structure

### Navigation modes

**Web (`AppShell`) — owners and platform admin only**

| Mode | Who | Primary routes |
|------|-----|----------------|
| Owner workspace | `venue_users.role = owner` | Dashboard, My Venues, Customers, Rewards, Campaigns, Analytics, Team, Settings |
| Platform admin | `users.is_admin = true` | Venue listings, Manage venues, Design palette, Activity log — no owner workspace |
| Staff / customer (web) | No owner membership | `/app` mobile download bridge; `/invite/{token}` for staff accept; `/account` for password |

**Mobile app — customers and staff**

| Who | Primary screens |
|-----|-----------------|
| Customer | Home, Wallet, **My QR** (center), Venues, Profile; Rewards claim flow |
| Staff / owner at counter | Scanner (venue-scoped), customer search fallback |

Router guards (web): `requiresAuth`, `workspace`, `ownerOnly`, `allowWithoutMembership` (onboarding).

Post-login routing (`venueRoles.ts`): owners → dashboard; staff-only and pure customers → `/app`.

### Key web routes

| Route | Page | Role |
|-------|------|------|
| `/v/:slug` | Venue app bridge (QR entry) | Guest |
| `/app` | Mobile app download / open | Guest, staff, customer |
| `/onboarding/create-venue` | Onboarding wizard | New owner |
| `/dashboard` | Operational dashboard (KPIs, insights) | Owner |
| `/my-venues`, `/my-venues/:id/settings` | Venue list & settings | Owner |
| `/rewards` | Milestone CRUD | Owner |
| `/campaigns` | Campaign templates, activation, history | Owner |
| `/customers` | Retention list | Owner |
| `/customers/:customerId` | Profile: timeline, visits, rewards, notes | Owner |
| `/analytics` | Retention stats | Owner |
| `/team` | Invitations & members | Owner |
| `/invite/:token` | Accept staff invite | Invitee |

Customer wallet, My QR, rewards claim, and staff scanner live in the **mobile app** — see [apps/mobile/README.md](../apps/mobile/README.md).

Workspace store auto-selects the first active venue when none is chosen (MVP single-venue focus).

## API Route Summary

**Public**

- `POST /api/auth/register`, `/login`, `/forgot-password`, `/reset-password`
- `GET /api/public/venues/{slug}/landing`
- `GET /api/invites/{token}`, `POST /api/invites/{token}/register`

**Authenticated**

- Auth: `/auth/me`, `/logout`, `/password`
- `POST /api/broadcasting/auth`
- Venues: CRUD, select, owner setup-files, join, **discover**, customers, dashboard
- Admin: manage-venues (update, logo/cover apply from cropped setup files), listing review
- Rewards: nested CRUD + archive/reactivate/purge
- Campaigns: templates, nested campaign CRUD, preview, activate/pause/end
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

Upload handlers use `ImageThumbnailService` (PHP GD) to store full-size originals plus JPEG thumbnails. Final venue logo/cover paths are applied by admins via `VenueBrandingService` (`POST /api/admin/manage-venues/{venue}/logo|cover`) after cropping owner setup files. List/card UI loads thumbs via `rewardThumbUrl`, `venueLogoThumbUrl`, and `venueCoverThumbUrl`; detail/hero views use full URLs with thumb fallback.

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

## Universal My QR

Stamp scans use one token per user (`user_stamp_tokens.public_token`), not per venue card.

| Item | Detail |
| --- | --- |
| Payload | `flotory:member:{public_token}` |
| Customer UI | `/my-qr` (web), center tab (mobile) |
| Scanner | Resolves user → card at scanner venue (auto-join) |
| Claim QR | Unchanged: `flotory:redeem:{token}` |

| Env | Default | Meaning |
| --- | --- | --- |
| `LOYALTY_UNIVERSAL_QR` | `true` | Use `user_stamp_tokens` for stamp scans |
| `LOYALTY_LEGACY_CARD_QR` | `false` | Accept old per-card `customers.qr_token` |
| `LOYALTY_LEGACY_CARD_QR_SUNSET_AT` | *(empty)* | Optional ISO datetime to force legacy off |

API: `GET /api/customer/stamp-qr`, `POST /api/venues/{venue}/scanner/scan`. Backfill: `php artisan app:backfill-user-stamp-tokens`.

## Seeded Demo Data

- Venues: Demo Cafe (`demo-cafe`), Harbor Coffee, North Star Burgers, Olive Street Kitchen
- `owner@example.com` — owner on all four
- `staff@example.com` — staff at Demo Cafe only
- `customer@example.com` — separate card per venue (e.g. 7 stamps at Demo Cafe with 5-stamp reward already claimed; 4 at Harbor Coffee); one universal My QR via `user_stamp_tokens`

Demo password: `password` (local seed only).
