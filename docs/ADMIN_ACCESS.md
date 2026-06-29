# Super admin access

Flotory super admins (`users.is_admin = true`) control the **platform only** — venue listings, manage venues, NFC stamp stands, design palette, and activity log. They do **not** own venues or use owner workspace tools (rewards, dashboard, campaigns).

There is no separate admin URL or login form — use `/login` with an admin account.

## Demo accounts (local)

After `php artisan migrate:fresh --seed` (or Docker equivalent), all passwords are **`password`**:

| Account | Email | `is_admin` | What you get |
|---------|--------|------------|----------------|
| **Super admin** | `admin@flotory.com` | yes | **Venue listings**, **Manage venues**, **Design palette**, **Activity log** — no My Venues or owner dashboard |
| **Venue owner** | `owner@example.com` | no | Web: dashboard, rewards, campaigns, customers CRM — **no** activity log |
| **Customer** | `customer@example.com` | no | Mobile app: Stamp (NFC), wallet, slide redeem (`/v/:slug` on web opens app bridge) |

**Common mistake:** logging in as `owner@example.com` and expecting the activity log. That user is intentionally not an admin.

### Activity log in the UI

- Sidebar nav: **Venue listings** (approve/reject owner submissions), **Owner onboarding** (post-demo sales invites), **Manage venues**, **Activity log**
- Direct URLs: `/admin/venues`, `/admin/owner-onboarding`, `/admin/manage-venues`, `/admin/activity`
- Dedicated platform sidebar (left on desktop) — not the owner dashboard

### Owner onboarding (sales pipeline)

After a demo, when you have the owner's email but no venue yet:

1. Open **Owner onboarding** (`/admin/owner-onboarding`).
2. Send an invitation (email + optional business name). The owner receives a link to `/register?invite=…`.
3. Track pipeline stages: **Invited** → **Registered** → **Venue draft** → **Pending review** → **Published**.
4. Revoke pending invites or copy the registration link from the list.

Invitations expire after `FLOTORY_OWNER_INVITATION_TTL_DAYS` (default **7**). Set in `.env` on the server.

Owners who already manage a venue cannot receive a duplicate sales invite — they should log in directly.

### Venue listing setup (owner files → admin crop → approve)

Owners upload raw branding and documents on **Files & docs** (`/my-venues/:id/setup-files`) before submitting for review. They do not crop to final app sizes.

When a venue is **pending review**, open **Venue listings** → **Review & set up** (`/admin/manage-venues/:id`). Crop logo (512×512) and optional cover (1400×700) from owner files in the **Owner setup files** section at the bottom of the page. **Approve** only works after a final logo has been applied.

### Verify you are admin

After login, open DevTools → **Network** → `auth/me` or `auth/login` → response must include `"is_admin": true`.

Or in tinker:

```bash
docker compose exec app php artisan tinker --execute="echo App\Models\User::where('email','admin@flotory.com')->value('is_admin') ? 'ok' : 'missing';"
```

## Create or refresh the admin user

**Local / any environment** (safe, idempotent):

```bash
docker compose exec app php artisan db:seed --class=AdminUserSeeder --force
```

Defaults (override in `.env`):

| Variable | Default |
|----------|---------|
| `ADMIN_EMAIL` | `admin@flotory.com` |
| `ADMIN_PASSWORD` | `password` |
| `ADMIN_NAME` | `Flotory Admin` |

Production deploy runs this seeder after migrations (`deploy/deploy.sh`).

## Promote your own user

**Production** (or local) — one-time, use a dedicated ops account:

```bash
docker compose exec app php artisan tinker
```

```php
$user = \App\Models\User::where('email', 'you@yourdomain.com')->first();
$user->forceFill(['is_admin' => true])->save();
```

Log out and log back in so the session picks up `is_admin`.

Set a strong `ADMIN_PASSWORD` in production `.env` — do not share the admin login with venue owners or staff.

## Debugging production issues

| Tool | Purpose |
|------|---------|
| **Activity log** (`/admin/activity`) | Business actions and API validation failures: stamps, redeems, rewards, joins. Filter by venue, customer, or request ID. |
| **Request ID** | Every API response includes `X-Request-Id`. Failed API errors in the UI append the same id. Search activity log or `storage/logs/laravel.log` with that value. |
| **Customer profile** | Per-guest timeline (visits, unlocks, redemptions) for owner-facing context. |

When someone reports a problem, ask for the time, venue, and (if possible) the request ID from the browser network tab on the failing call.

## What gets logged

Written to Spatie `activity_log` (log name `audit`) from loyalty services and API validation failures, including:

- `stamp.added`, `reward.redeemed`, `claim.session_created`, `claim.redeemed`
- `reward.created` / `updated` / `archived` / `reactivated` / `purged`
- `customer.joined`
- `validation.failed` (422 responses on `/api/*`)

See `app/Support/AuditLog.php` and `config/activitylog.php`.
