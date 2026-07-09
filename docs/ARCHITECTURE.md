# Architecture

Laravel/Vue monolith for hospitality loyalty. One login identity (`users`) can hold **brand** owner memberships (`brand_users`), loyalty cards (`customers`), or both. A **brand** is the loyalty program; **venues** are physical locations (primary + branches). Business rules live in services; the SPA renders API state.

See [README.md](./README.md) for terminology and [MVP_DECISIONS.md](./MVP_DECISIONS.md) for locked decisions.

## Stack

| Layer | Technology |
|-------|------------|
| API | Laravel 12, PHP 8.4, MySQL |
| Auth | Laravel Sanctum (bearer tokens) |
| OAuth | Laravel Socialite (Google) via web routes; mobile via web OAuth → `flotory://login?oauth_token=...` |
| Frontend | Vue 3, Vite, Pinia, Vue Router, TailwindCSS, vue-i18n |
| Mobile | Expo + React Native (`apps/mobile`), i18next |
| Uploads | Local filesystem under `public/uploads/` |
| Deploy | Docker on VPS; Nginx → Laravel |

## Repository layout

```text
app/
  Http/Controllers/Api/      REST API
  Http/Controllers/Auth/     Google OAuth
  Models/                    Eloquent domain models
  Services/                  LoyaltyStampService, NfcStampService, CampaignService, …
  Support/                   VenueAccess, AuditLog

database/migrations/
  2026_06_01_000000_create_laravel_infrastructure_tables.php
  2026_06_01_000001_create_flotory_schema.php   # consolidated product schema

resources/js/                Owner web SPA (Vue)
apps/mobile/                 Customer iOS app (Expo)

routes/api.php               JSON API
routes/web.php               Google OAuth + SPA fallback
```

## Backend layers

```text
Request → Route → Controller → (VenueAccess) → Service → Model/DB → JSON
```

| Layer | Responsibility |
|-------|----------------|
| Routes | HTTP mapping, middleware (`auth:sanctum`) |
| Controllers | Authorize, validate, delegate, respond — no loyalty math |
| Services | Stamps, unlocks, redeem, cycles, NFC, campaigns |
| Models | Relationships, casts — no multi-step workflows |
| Vue / mobile | Fetch, display, forms — **no business logic** |

## Domain model

```text
User ──┬──< BrandUser >── Brand ──< Venue (locations: primary + branches)
       │                  │            └──< NfcTag
       │                  ├──< Reward
       │                  ├──< Campaign
       │                  └──< Customer
       │                         ├──< Visit (venue_id = tap location)
       │                         ├──< CustomerRewardCycle
       │                         ├──< RewardUnlock >── Reward
       │                         └──< StampEvent >── NfcTag
```

| Model | Table | Purpose |
|-------|-------|---------|
| `User` | `users` | Login identity. `is_admin` for platform admin. `active_venue_id` for workspace selection (a location id). `locale` stores UI language (`en` or `hy`). |
| `Brand` | `brands` | Loyalty program: name, slug, category, branding, `status` (`draft` \| `pending_review` \| `published`), soft deletes. |
| `Venue` | `venues` | Physical location under a brand: address, geo, timezone, `is_primary`. Branch rows share the brand’s rewards and customer wallet. |
| `BrandUser` | `brand_users` | Membership pivot: `role` = `owner` (product is owner-only). |
| `Customer` | `customers` | Loyalty card: one row per `(user_id, brand_id)` with `stamps`. API exposes `venue_id` as the **primary** location id for backward compatibility. |
| `Reward` | `rewards` | Milestone on a brand: `required_stamps`, optional image, `active`. |
| `Visit` | `visits` | Analytics row per stamp award; `venue_id` is the **tap location** (branch or primary). `created_by` is null for NFC taps. |
| `CustomerRewardCycle` | `customer_reward_cycles` | Cycle counter; `completed_at` when top milestone reached. |
| `RewardUnlock` | `reward_unlocks` | Unlock + redeem in one row (`unlocked_at`, `claimed_at`, `claimed_by`). |
| `NfcTag` | `nfc_tags` | Physical stand → **venue** (branch or primary): `token`, `label`, `active`. |
| `StampEvent` | `stamp_events` | Audit per NFC tap; `venue_id` = tap location; powers debounce / burst limits. |
| `Campaign` | `campaigns` | Brand-scoped stamp multiplier campaigns (Bring Back, Quiet Day, Happy Hour, VIP). |

`VenuePresenter` merges brand fields (name, slug, status, logo, …) onto venue API payloads so owner and guest UIs can keep using venue-shaped JSON while the schema splits program vs location.

### Branches

- Onboarding creates a **brand** plus one **primary** `venues` row.
- Additional locations are **branches** (`is_primary = false`, same `brand_id`).
- Owner API: `GET/POST/PATCH/DELETE /api/venues/{venue}/branches` — `{venue}` may be any location in the brand; the service anchors on the primary venue.
- **My Venues** lists every location (primary + branches) as its own card; rewards/campaigns are edited at brand scope via the active workspace venue.
- **Discover** returns primary venues with `branches` and `branches_count`.
- **Join** via any location slug enrolls on the **brand** (one shared wallet).
- **NFC** at a branch tag credits the brand wallet; `visits` and `stamp_events` record the branch `venue_id` for per-location analytics.

**Removed tables** (no longer in schema): `redemption_requests`, `venue_staff_invitations`, `user_stamp_tokens`, `demo_leads`. **No** `customers.qr_token`.

## Roles and authorization

**Platform:** `users.is_admin === true` — listing review, manage venues, palette, activity. Cannot use owner workspace tools.

**Brand (owner):** `brand_users.role === 'owner'` — web dashboard, rewards, campaigns, customers CRM, settings for all locations under that brand.

**Customer:** `customers` row — mobile app only (stamp, wallet, slide redeem).

`App\Support\VenueAccess` centralizes membership checks. Owner-only API routes use `requireAccess($user, $venue, ['owner'])`.

## Loyalty engine (`LoyaltyStampService`)

**`addStamp(Customer, User $actor, int $stamps, ?StampAwardContext $context)`**

1. Reject duplicate award within cooldown (`loyalty.stamp_cooldown_seconds`, default 3s) via recent `visits`.
2. Lock customer; award stamps (NFC: always base 1 × campaign multiplier).
3. Unlock milestones at or below current stamp count for active cycle.
4. If stamps ≥ max active milestone: complete cycle, reset stamps to 0, start next cycle.
5. Create one `Visit` row (`created_by` null for NFC).

**`redeemUnlock(RewardUnlock, User $customerUser)`**

- Customer self-serve redeem (slide in app). Sets `claimed_at` / `claimed_by`. Does **not** reduce stamps.

**Helpers:** `nextRewardFor`, `availableRewardsFor`, `pendingUnlocksFor`, `journeyFor`, `syncEligibleUnlocks`.

## NFC stamping (`NfcStampService`)

Physical stands use URL `https://flotory.com/t/{token}` (deep link `flotory://t/{token}`).

| Step | Endpoint |
|------|----------|
| Resolve tag | `GET /api/public/nfc/t/{token}` |
| Award stamp | `POST /api/nfc/t/{token}/stamp` (authenticated customer) |

Flow: tap → auto-join venue if needed → `LoyaltyStampService::addStamp` with `StampAwardContext::nfcTap()` → `stamp_events` row.

Rate limits (`config/loyalty.php` → `nfc.*`): debounce per user+tag; max stamps per user+venue per window.

**Admin:** `/admin/manage-venues/{id}` → NFC stamp stands (create, copy tap URL, activate/deactivate, rotate token).

## Authentication

- Email/password: `POST /api/auth/register`, `/login`, password reset
- Google web: `/auth/google/redirect` → callback → `oauth_token` on login page
- Google mobile: in-app browser → same web flow → `flotory://login?oauth_token=...`
- Sanctum bearer token for API

## Localization

Supported UI locales are `en` and `hy`; English is the fallback. Locale is stored on `users.locale` and exposed by `/api/auth/me`. Authenticated clients save changes through `PUT /api/auth/locale`; web and mobile also persist the selected locale locally for pre-auth/guest screens.

| Surface | Implementation |
| ------- | -------------- |
| Web owner/admin SPA | `resources/js/i18n`, `resources/js/stores/locale.ts`, `vue-i18n` |
| Mobile customer app | `apps/mobile/src/i18n`, `LocaleProvider`, `react-i18next` |
| API requests | Web and mobile send `Accept-Language` for future backend message localization |
| Fonts | Mobile uses Noto Sans Armenian so Armenian UI text renders without missing glyphs |

Static UI chrome is translated. Venue names, reward titles, campaign names, and descriptions are persisted user content and are displayed as entered.

## Main flows

### Guest join (QR bridge → mobile)

1. `GET /v/{slug}` (web) → `GET /api/public/venues/{slug}/landing`
2. Customer registers/logs in on mobile
3. `POST /api/venues/{slug}/join` (venue must be `published`)

### Stamp (NFC only)

1. Customer taps stand or uses in-app NFC on **Stamp** tab
2. `POST /api/nfc/t/{token}/stamp` → +1 stamp (× campaign multiplier when eligible)

### Redeem (customer self-serve)

1. `GET /api/customer/rewards/wallet` — pending unlocks
2. Slide to redeem → `POST /api/customer/rewards/unlocks/{unlock}/redeem`

### Owner workspace (web)

**Sales-led (default):**

1. Admin sends invite → owner registers via `/register?invite=…`
2. First brand: owner completes **`/onboarding`** wizard (profile, location, Files, first reward, submit). **Additional brands:** existing owners use **My Venues → Create venue** → **`/my-venues/create/*`** wizard (details → files → reward → review). No brand/venue row is created until **Submit for review**; progress is stored in **`owner_onboarding_drafts`**.
3. Listing checklist → submit → admin approve → `published`
4. Dashboard, rewards, campaigns, customers, analytics, NFC stand setup

**Provisioned venue:** admin creates venue + owner user at **Manage venues**; owner uses forgot-password or Google.

Public `intent=owner` self-signup is blocked. Venue **create** API allows users who are already **owners** at any brand or who have an **accepted** owner invitation.

## Frontend (web)

**`AppShell`** — owner + platform admin only.

| Route | Page |
|-------|------|
| `/dashboard` | KPIs, insights |
| `/my-venues` | Location list, **Create venue** → `/my-venues/create/*`, add branch |
| `/my-venues/create/:step` | Additional brand wizard (`details` → `files` → `reward` → `review`) |
| `/onboarding/:step?` | First-venue onboarding wizard (draft until submit) |
| `/my-venues/:id/settings` | Per-venue settings |
| `/my-venues/:id/setup-files` | Owner Files (logo/cover uploads) |
| `/rewards`, `/campaigns`, `/customers`, `/analytics` | Owner tools |
| `/settings` | Legacy redirect → `/my-venues` |
| `/admin/*` | Platform admin |
| `/app` | Mobile download bridge for non-owners |

Customer wallet, NFC stamp, and slide redeem live in **`apps/mobile`** — see [apps/mobile/README.md](../apps/mobile/README.md).

## API summary

**Public:** auth register/login, venue landing, NFC tag resolve, app config, demo booking, **`GET/POST /api/public/owner-invitations/{token}`** (invite preview + accept).

**Authenticated (highlights):**

- Venues: CRUD (legacy `POST /api/venues` still exists; owner UI uses draft flow instead), **branches**, discover, join, customers CRM, dashboard, setup files
- **Owner onboarding drafts:** `GET /api/owner-onboarding`, `GET /api/owner-onboarding/additional-venue`, `PUT/DELETE /api/owner-onboarding/draft`, draft file CRUD, `POST /api/owner-onboarding/submit` — persists brand+venue only on submit
- Rewards: nested CRUD + archive/reactivate/purge
- Campaigns: templates, CRUD, preview, activate/pause/end
- Customer: cards, wallet, card detail, **`POST .../unlocks/{unlock}/redeem`**
- NFC: **`POST /api/nfc/t/{token}/stamp`**
- Admin: listing review, **owner invitations** (`/api/admin/owner-invitations`), manage venues, NFC tags, palette, activity

Full list: `routes/api.php`.

## Database migrations

Fresh installs use **two** migrations only:

1. Laravel infrastructure (sessions, cache, jobs, Sanctum tokens)
2. `create_flotory_schema` — full product schema

```bash
php artisan migrate:fresh --seed
```

## Seeded demo data

| Account | Email | Role |
|---------|-------|------|
| Platform admin | `admin@flotory.com` | Admin UI |
| Owner | `owner@example.com` | All four demo venues |
| Customer | `customer@example.com` | Cards at demo venues (7 stamps at Demo Cafe) |

Password: `password`. Demo Cafe has active campaigns and an NFC tag (`Counter stand`). See root [README.md](../README.md).

## File uploads

| Asset | Path |
|-------|------|
| Brand logo / cover (stored on brand) | `/uploads/venue-logos/`, `/uploads/venue-covers/` |
| Reward image (owner upload) | `/uploads/reward-milestones/` |
| Default reward (no upload) | `/images/defaults/rewards/default-reward.png` |

Thumbnails: `*-thumb.jpg` via `ImageThumbnailService`. Backfill: `php artisan media:generate-thumbs`.

## Docker (local)

| Service | Port |
|---------|------|
| app | 8000 |
| vite | 5173 |
| mysql | 3306 |
