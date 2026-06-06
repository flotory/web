# Super admin access

Flotory super admins (`users.is_admin = true`) control the **platform only** — venue listings, design palette, and activity log. They do **not** own venues, join teams, or use owner tools (scanner, rewards, dashboard).

There is no separate admin URL or login form — use `/login` with an admin account.

## Demo accounts (local)

After `php artisan migrate:fresh --seed` (or Docker equivalent), all passwords are **`password`**:

| Account | Email | `is_admin` | What you get |
|---------|--------|------------|----------------|
| **Super admin** | `admin@flotory.com` | yes | **Venue listings**, **Design palette**, **Activity log** only — no scanner or My Venues |
| **Venue owner** | `owner@example.com` | no | Normal owner (dashboard, rewards, team, scanner) — **no** activity log |
| **Staff** | `staff@example.com` | no | Scanner + customers for Demo Cafe |
| **Customer** | `customer@example.com` | no | Wallet / guest flows |

**Common mistake:** logging in as `owner@example.com` and expecting the activity log. That user is intentionally not an admin.

### Activity log in the UI

- Sidebar nav: **Venue listings** (approve/reject owner submissions), **Activity log**
- Direct URLs: `/admin/venues`, `/admin/activity`
- Dedicated platform sidebar (left on desktop) — not the owner dashboard

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
