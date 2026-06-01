# Super admin access

Flotory super admins (`users.is_admin = true`) can access all venues without membership and use internal tools such as the **Activity log** at `/admin/activity`.

## Local / demo login

After `php artisan migrate:fresh --seed` (or Docker equivalent):

| Field | Value |
|-------|--------|
| Email | `admin@flotory.com` |
| Password | `password` |

Sign in at `/login` like any other user. You will see **Activity log** in the sidebar.

## Production

Promote a user to admin (one-time):

```bash
docker compose exec app php artisan tinker
```

```php
$user = \App\Models\User::where('email', 'you@yourdomain.com')->first();
$user->forceFill(['is_admin' => true])->save();
```

Use a strong password and a dedicated ops account — not a venue owner login shared with staff.

## Debugging production issues

| Tool | Purpose |
|------|---------|
| **Activity log** (`/admin/activity`) | Business actions and API validation failures: stamps, redeems, rewards, joins. Filter by venue, customer, or request ID. |
| **Request ID** | Every API response includes `X-Request-Id`. Failed API errors in the UI append the same id. Search activity log or `storage/logs/laravel.log` with that value. |
| **Customer profile** | Per-guest timeline (visits, unlocks, redemptions) for owner-facing context. |

When someone reports a problem, ask for the time, venue, and (if possible) the request ID from the browser network tab on the failing call.
