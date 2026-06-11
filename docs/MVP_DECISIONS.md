# MVP Decisions

Approved product and engineering decisions. **Do not undo or contradict these** without explicit owner approval. **Business invariants are defined in [BUSINESS_RULES.md](./BUSINESS_RULES.md)** — if this file and BUSINESS_RULES conflict, BUSINESS_RULES wins.

Related: [README.md](./README.md) (terminology), [ARCHITECTURE.md](./ARCHITECTURE.md) (implementation).

## Identity and roles

| Decision | Detail |
|----------|--------|
| No global owner/staff/customer on `users` | `users` has only `is_admin` (boolean). Default `false` for all sign-ups. |
| Venue ownership in pivot | `venue_users.role` = `owner` for venue operators. **Staff role and team invites removed** (2026 pivot). |
| No `owner_user_id` on `venues` | Owners are derived from `venue_users`, not a column on `venues`. |
| Loyalty via `customers` | One row per `(user_id, venue_id)` with `stamps`. No per-card QR token. |
| Multi-hat users | Same user can be owner at venue A and customer at many venues. |
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
| Milestone uniqueness | One active milestone per `required_stamps` per venue. |
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
| Owner signup | Register with owner intent → **My Venues** create form. |
| Venue listing status | `draft` → `pending_review` → `published`. Customers join only when **published**. |
| Post-login routing (web) | Owners → dashboard; non-owners → `/app` (mobile download). |
| Customer primary surface | **Mobile app only**: Stamp (NFC), Wallet, slide redeem. |
| Owner campaigns | `/campaigns` workspace; dashboard links for recommendations. |

## Data and infrastructure

| Decision | Detail |
|----------|--------|
| Consolidated migrations | Two migrations: Laravel infra + `create_flotory_schema`. |
| Soft delete venues | `venues.deleted_at`. |
| Local file uploads | Logos, covers, reward images under `public/uploads/`. |
| Monolith | Single repo, Laravel + Vue + Expo mobile. |
| Reverb optional | Realtime enhances UX; polling fallback on mobile. |
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
