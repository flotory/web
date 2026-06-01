# MVP Decisions

Approved product and engineering decisions. **Do not undo or contradict these** without explicit owner approval. When in doubt, read the code and match existing patterns.

Related: [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) (terminology), [ARCHITECTURE.md](./ARCHITECTURE.md) (implementation).

## Identity and Roles

| Decision | Detail |
|----------|--------|
| No global owner/staff/customer on `users` | `users` has only `is_admin` (boolean). Default `false` for all sign-ups. |
| Venue ownership in pivot | `venue_users.role`: `owner` or `staff`. Creating a venue adds an `owner` row. |
| No `owner_user_id` on `venues` | Owners are derived from `venue_users`, not a column on `venues`. |
| Loyalty via `customers` | One row per `(user_id, venue_id)` with `qr_token` and `stamps`. Joining a venue creates/fetches this row. |
| Multi-hat users | Same user can be owner at A, staff at B, customer at C. |
| Platform admin | `users.is_admin` bypasses `VenueAccess` membership checks. |

## Language and UX Copy

| Decision | Detail |
|----------|--------|
| Customer-facing | **Stamps**, **Rewards**, **Progress** — never “visits” in customer UI. |
| Owner analytics | **Visits**, **Customers**, **Loyalty activity** — visits = stamp events recorded in `visits`. |
| Reward thresholds | Milestones use **`required_stamps` only**. Never visits as requirements. |
| Multiple stamps per action | Staff may award 1–100 stamps in one scan; still one `visits` row per `addStamp` call. |

## Loyalty Rules

| Decision | Detail |
|----------|--------|
| Business logic in service | All stamp/unlock/claim/cycle logic in `LoyaltyStampService`. Controllers delegate. |
| Claims on `reward_unlocks` | Unlock and claim live on the same row (`unlocked_at`, `claimed_at`, `claimed_by`). **No** `reward_redemptions` table. |
| Stamps not spent on claim | Claiming sets `claimed_at`; stamp balance unchanged. |
| Cycle completion | When stamps reach the **maximum** active milestone threshold, cycle completes, stamps reset to 0, new `CustomerRewardCycle` starts. |
| Milestone uniqueness | One active milestone per `required_stamps` value per venue (`reward_type = milestone`). |
| Duplicate scan guard | Same customer cannot be stamped again within **5 seconds**. |
| Redeem FIFO | Staff scanner redeem (and legacy `POST .../rewards/{reward}/redeem`) claims the **oldest unclaimed** unlock for that reward (`orderBy cycle_number`). Claim QR is created per `unlock_id` via `claim-session`. |
| Claim QR | `redemption_requests` table: 10 min TTL, single-use token; QR encodes `/r/{token}`. Scanner auto-detects stamp UUID vs redeem URL. |
| Stamp-scan warning | `pending_claim_warning` on stamp API when customer has unclaimed unlocks — reduces wrong-QR mistakes at counter. |
| QR venue scoping | Scanner rejects QR tokens for customers not enrolled at the active venue. |
| Archive before purge | Rewards must be archived (`active = false`) before permanent delete. |

## Team and Staff

| Decision | Detail |
|----------|--------|
| Staff onboarding via email invitation | `VenueStaffInvitationService` sends email with link to `/invite/{token}`. **No** temp passwords or auto-created credentials emailed to owners. |
| Staff role only for invites | Invitations support `staff` only — not co-owner invites in MVP. |
| Invitation expiry | 7 days; pending/expired invites can be resent (new token). |
| Email must match | Accepting requires signed-in user email to match invitation email. |
| Owner protection | Cannot invite/remove/change role of venue owner. |
| Staff nav | Staff-only members get reduced nav: Scanner, Customers, Account — not owner dashboard. |

## Auth

| Decision | Detail |
|----------|--------|
| Sanctum bearer tokens | SPA stores token; API uses `auth:sanctum`. |
| Google OAuth via web routes | Session redirect flow; frontend receives `oauth_token` on login page. |
| Password reset | Email link to SPA `/reset-password`; no security-through-obscurity on forgot-password response. |
| Redirect sanitization | Post-auth redirects limited to internal paths (`redirect.ts`). |

## Frontend Behavior

| Decision | Detail |
|----------|--------|
| No business logic in Vue | Display API data; loyalty rules stay in Laravel services. |
| Save button pattern | Settings/forms use `AsyncActionButton`: **Save** → **Saving…** → **Saved ✓**. |
| Inline validation | Form field errors shown inline from API validation messages. |
| Dangerous actions | Confirmation modal before delete venue, archive/delete reward, remove team member. |
| Cross-page feedback | Use `vue-sonner` toast for global success/error (toaster in `App.vue`). |
| Owner onboarding | 5 steps; completion redirects to `/dashboard?onboarding=completed` with a success toast, then query param is cleared. |
| Workspace venue selection | Auto-select first active venue when none chosen; MVP dashboard/analytics focus on filtered venue, not an “all venues aggregate” owner view. |
| Post-login routing | Owners → dashboard; staff-only → scanner; pure customers → card. |
| Customer primary surface | Stamp QR on `/wallet` (list all venues, tap for detail); claim QR only in **Rewards → Claim** modal. Customer bottom nav: **Wallet**, **Rewards** (wallet + Claim), **Venues**, **Settings**. Staff scanner auto-detects QR type (green stamp / indigo redeem success). Unlocked rewards stay in wallet until staff scans claim QR. Owner milestone CRUD on `/rewards` uses the same stamp grid as guests (tap gift slots to edit). |

## Data and Infrastructure

| Decision | Detail |
|----------|--------|
| Soft delete venues | `venues.deleted_at`; removed from active UI immediately. |
| Local file uploads | Logos, covers, reward images under `public/uploads/` — not S3 in MVP. Uploads generate JPEG thumbnails (`*-thumb.jpg`); list/card views load thumbs, detail views load full images. |
| Monolith | Single repo, Laravel + Vue, VPS deploy — no microservices. |
| Reverb optional | Realtime stamp updates enhance UX but app functions without WebSockets. |
| Visit timestamps | `visits` has `created_at` only (no `updated_at`). |

## Authorization

| Decision | Detail |
|----------|--------|
| Centralized venue checks | Use `VenueAccess::requireAccess()` in controllers — do not ad-hoc membership queries. |
| Thin controllers/models | Validate → authorize → service → JSON. |
| Customer endpoints | Customer-scoped routes verify `customer.user_id === auth user`. |

## Explicitly Not in MVP

Do not add without approval:

- Billing / subscriptions
- `reward_redemptions` or visit-based reward thresholds
- `owner_user_id` or role columns on `users`
- POS integrations
- Push notifications
- Customer segmentation / campaigns
- Co-owner invitations
- HEIC image upload (JPG, PNG, WEBP, GIF only)
