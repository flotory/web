# MVP Decisions

Approved product and engineering decisions. **Do not undo or contradict these** without explicit owner approval. **Business invariants are defined in [BUSINESS_RULES.md](./BUSINESS_RULES.md)** — if this file and BUSINESS_RULES conflict, BUSINESS_RULES wins.

Related: [README.md](./README.md) (terminology), [ARCHITECTURE.md](./ARCHITECTURE.md) (implementation).

## Identity and roles

| Decision | Detail |
|----------|--------|
| No global owner/staff/customer on `users` | `users` has only `is_admin` (boolean). Default `false` for all sign-ups. |
| Venue ownership in pivot | `brand_users.role` = `owner` for brand operators. **Staff role and team invites removed** (2026 pivot). |
| No `owner_user_id` on `brands` | Owners are derived from `brand_users`, not a column on `brands`. |
| Loyalty via `customers` | One row per `(user_id, brand_id)` with `stamps`. API `venue_id` accessor returns primary location id. No per-card QR token. |
| Brand vs venue | **Brand** = program (status, rewards, campaigns). **Venue** = location (`is_primary` + branches). Onboarding creates both. |
| Multi-hat users | Same user can be owner at brand A and customer at many brands. |
| Platform admin | `users.is_admin` bypasses venue membership for admin routes only. |

## Language and UX copy

| Decision | Detail |
|----------|--------|
| Customer-facing | **Stamps**, **Rewards**, **Progress** — never “visits” in customer UI. |
| Owner analytics | **Visits**, **Customers**, **Loyalty activity** — visits = stamp events in `visits`. |
| Reward thresholds | Milestones use **`required_stamps` only**. |
| Stamps per NFC tap | **1 base stamp** per tap; campaign multipliers may increase `added_stamps`. |

## Loyalty rules

| Decision | Detail |
|----------|--------|
| Business logic in service | Stamp/unlock/redeem/cycle logic in `LoyaltyStampService`. Controllers delegate. |
| Claims on `reward_unlocks` | Unlock and redeem on same row (`unlocked_at`, `claimed_at`, `claimed_by`). |
| Stamps not spent on redeem | Redeeming sets `claimed_at`; stamp balance unchanged. |
| Cycle completion | When stamps reach max active milestone, cycle completes, stamps reset to 0. |
| Milestone uniqueness | One active milestone per `required_stamps` per **brand**. |
| Duplicate stamp guard | Same customer cannot be stamped again within cooldown (visits + NFC debounce). |
| Redeem by unlock | Customer redeems the **specific** `unlock_id` they slide on — not FIFO by reward type. |
| NFC-only stamps | No staff scanner, no stamp QR, no universal `user_stamp_tokens`. |
| Archive before purge | Rewards must be archived before permanent delete. |

## Auth

| Decision | Detail |
|----------|--------|
| Sanctum bearer tokens | SPA and mobile store token; API uses `auth:sanctum`. |
| Google OAuth via web routes | Session redirect; mobile uses same flow → deep link with `oauth_token`. |
| Password reset | Email link to SPA `/reset-password`. |
| Redirect sanitization | Post-auth redirects limited to internal paths (`redirect.ts`). |
| Web login | **Owners and platform admins only.** Customers use mobile app. |

## Frontend behavior

| Decision | Detail |
|----------|--------|
| No business logic in Vue | Display API data; loyalty rules stay in Laravel services. |
| Save button pattern | `AsyncActionButton`: Save → Saving… → Saved ✓. |
| Owner signup | **Sales-led:** admin invite → `/register?invite=…` → **`/onboarding`** wizard. Public `intent=owner` blocked. Existing owners may add brands from **My Venues**. |
| Venue listing status | `draft` → `pending_review` → `published` on **brand**. Customers join only when **published**. |
| Venue slug after publish | **Locked** once `published` — owner and admin APIs reject slug changes; QR links stay valid. |
| Post-login routing (web) | Owners → dashboard; invited owners without a brand → `/onboarding`; others → `/app`. |
| Customer primary surface | **Mobile app only**: Stamp (NFC), Wallet, slide redeem. |
| Owner campaigns | `/campaigns` workspace; dashboard links for recommendations. |

## Data and infrastructure

| Decision | Detail |
|----------|--------|
| Consolidated migrations | Two migrations: Laravel infra + `create_flotory_schema`. |
| Soft delete venues | `venues.deleted_at` (locations). Brands also soft-deletable. |
| Local file uploads | Logos, covers, reward images under `public/uploads/`. |
| Monolith | Single repo, Laravel + Vue + Expo mobile. |
| Polling refresh | Mobile refreshes loyalty surfaces after stamp/redeem without websocket infrastructure. |
| Visit timestamps | `visits` has `created_at` only. |

## Authorization

| Decision | Detail |
|----------|--------|
| Centralized venue checks | `VenueAccess::requireAccess()` in controllers. |
| Thin controllers/models | Validate → authorize → service → JSON. |
| Customer endpoints | Verify `customer.user_id === auth user`. |

## Explicitly not in MVP

Do not add without approval:

- Billing / subscriptions
- Staff role, team tab, staff invitations, scanner, claim QR
- `user_stamp_tokens`, per-card `qr_token`, `redemption_requests`
- POS integrations
- Campaign push delivery (toggle may exist; delivery not guaranteed)
- Co-owner invitations
- HEIC upload (JPG, PNG, WEBP, GIF only)
