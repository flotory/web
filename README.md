# Flotory

[![Tests](https://github.com/flotory/web/actions/workflows/tests.yml/badge.svg)](https://github.com/flotory/web/actions/workflows/tests.yml)

Modern hospitality loyalty platform for independent cafes, bars, restaurants, and venues.

The MVP focuses on venue QR onboarding, digital stamp cards, **NFC stamp stands** (`https://flotory.com/t/{token}`), customer slide-to-redeem rewards, multi-venue owner workspaces, Google sign-in, English/Armenian localization, and retention analytics.

## Stack

- Laravel 12, PHP 8.4, MySQL, Sanctum, REST APIs, Laravel Socialite (Google)
- Vue 3, Vite, Pinia, Vue Router, TailwindCSS, vue-i18n, shadcn-vue style components
- Expo + React Native mobile app with i18next localization
- Monolith architecture for VPS deployment

## Production deploy

Ship from your Mac:

```bash
git commit -m "Describe your change"
./deploy/push-prod.sh
```

That runs local CI, pushes `main`, waits for GitHub **Tests**, then deploys to **https://flotory.com** (droplet `64.226.84.118`, app at `/var/www/web`).

**Full checklist** — one-time server bootstrap, production `.env`, post-deploy verification, manual pull, emergency deploy: **[deploy/DEPLOY.md](deploy/DEPLOY.md)**.

Test gates and coverage: **[docs/TESTING.md](docs/TESTING.md)**.

## Local setup (Docker)

Portable defaults use **`localhost` only** — same on every Mac/PC. Do not put your Wi‑Fi IP in `.env` unless you are doing optional phone testing (Google sign-in will not work on a LAN IP).

```bash
git clone git@github.com:flotory/web.git && cd web
cp .env.secrets.example .env.secrets   # GOOGLE_CLIENT_SECRET + Maps API keys
./scripts/setup-local.sh
./scripts/docker-up.sh --build
```

Open **http://localhost:8000** (not the Vite port for login or OAuth). Vite HMR: usually http://localhost:5173 — if that port is taken by another dev server, `docker-up.sh` starts Vite on **5174+** and prints the URL.

| File | Committed? | Purpose |
|------|------------|---------|
| `.env.example` | Yes | Shared template (`localhost`, same on all machines) |
| `.env.secrets` | No | `GOOGLE_CLIENT_SECRET`, `VITE_GOOGLE_MAPS_API_KEY` (browser), `GOOGLE_MAPS_SERVER_API_KEY` (Time Zone API) |
| `.env` | No | Generated locally by `setup-local.sh` |

**Never commit:** `.env`, `.env.secrets`. Each machine has its own `APP_KEY` and database.

Compose project name is **`flotory`** (`flotory-app-1`, `flotory-mysql-1`, …). Data persists in volume **`mysql_data`** — restarting containers is safe; **`docker compose down -v`** deletes all local data.

```bash
docker compose exec app php artisan migrate --force                    # pending migrations
docker compose exec app php artisan app:ensure-local-demo                # restore demo logins
docker compose exec app php artisan app:ensure-local-demo --with-demo-data  # sample visits/campaigns
docker compose exec app php artisan migrate:fresh --seed                 # full reset (destructive)
```

Set `FRONTEND_URL=http://localhost:8000` for Google OAuth (Laravel app URL, not the Vite dev server).

**Login issues?** Use http://localhost:8000 and [demo accounts](#demo-accounts) (`password`). If auth still fails after a corrupted `.env`:

```bash
./scripts/restore-docker-env.sh
docker compose restart app
docker compose exec app php artisan app:ensure-local-demo
```

E2E tests use isolated `.env.e2e` and do not modify your Docker `.env`.

**Tests:** **[docs/TESTING.md](docs/TESTING.md)** — `./scripts/ci-local.sh` mirrors CI; `./scripts/e2e-local.sh` or `./scripts/run-e2e-smoke.sh` for Playwright only.

### Native

If you are not using Docker, install PHP 8.4+ and Composer first.

```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
npm install
npm run dev
php artisan serve
```

## Google Sign-In

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/).
2. Set authorized redirect URI:
   - Local: `http://localhost:8000/auth/google/callback`
   - Production: `https://flotory.com/auth/google/callback`
3. Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"
   FRONTEND_URL=http://localhost:8000
   ```
4. Run migrations (adds `google_id` / `google_avatar` on `users`).

**Mobile app** uses the same Google account via in-app browser → web OAuth → `flotory://login?oauth_token=...`. Setup: [apps/mobile/README.md](apps/mobile/README.md#google-sign-in).

## Google Maps (venue address autocomplete)

Address fields use the **Places API** in the browser. The key is **not** committed to git — store it in `.env.secrets` (same as OAuth secret):

```bash
# .env.secrets
GOOGLE_MAPS_API_KEY=your-browser-restricted-key
```

Then merge into `.env` and restart:

```bash
./scripts/setup-local.sh
docker compose up --build
```

In [Google Cloud Console](https://console.cloud.google.com/):

1. Enable **Maps JavaScript API** and **Places API**
2. Create an API key restricted to HTTP referrers: `http://localhost:8000/*` (and your production domain later)

Verify:

```bash
curl -s http://localhost:8000/api/public/app-config
# Should return {"google_maps_key":"AIza..."} — not null
```

If you see “Google address search is not configured”, the key is missing from `.env` or Docker was not restarted after adding it.

OAuth owner login:

- **Provisioned owners** (`intent=owner` on login): sign in to the dashboard if they already have a venue membership.
- **New prospects** are sent to **`/book-demo`** — owner self-registration and venue creation are disabled.
- **Customers** use the **Flotory mobile app** — web `/app` explains how to install/open it.

## Onboarding flows

### Customer (QR scan → mobile app)

1. Guest scans QR → `/v/{venue-slug}` (web bridge with venue preview).
2. Taps **Open in Flotory app** → joins in the mobile app (register or Google sign-in).
3. Collects stamps via **NFC tap** at the counter; redeems with **slide to redeem** when a reward is ready.

### Owner (sales-led — web)

**Post-demo pipeline (email only, no venue yet):**

1. Prospect books **`/book-demo`** or contacts sales.
2. Admin opens **Owner onboarding** (`/admin/owner-onboarding`) and sends an invitation (email + optional business name).
3. Owner registers via the expiring `/register?invite=…` link, creates their venue, uploads files at **My Venues → Files & docs**, and submits for review.
4. Platform admin approves at **Venue listings** (`/admin/venues`).

**Ops-heavy provisioning (venue exists before the owner signs in):**

1. Admin creates a draft venue at **Manage venues → Create venue** (creates or matches the owner user by email with a random password).
2. Share login instructions: owner uses **Forgot password** on `/login` or Google sign-in with the same email.

New venues start as **`draft`**. Guests cannot join via `/v/{slug}` until the owner completes the **listing checklist**, submits for review, and a platform admin approves at `/admin/venues`.

Invitation links expire after **`FLOTORY_OWNER_INVITATION_TTL_DAYS`** (default 7). Configure in `.env`:

```env
FLOTORY_OWNER_INVITATION_TTL_DAYS=7
```

**Listing workflow:** owners upload raw files at **My Venues → Files & docs**. Admins open **Venue listings → Review & set up** (or **Manage venues**), crop logo/cover from owner files, then approve.

Full journeys: **[docs/PRODUCT.md](docs/PRODUCT.md)** · admin approval: **[docs/ADMIN_ACCESS.md](docs/ADMIN_ACCESS.md)**.

### Owner demo booking (marketing)

Prospects book a walkthrough at **`/book-demo`** (also `/demo`) — Calendly iframe only, no Flotory signup. Set the event URL in `.env`:

```env
FLOTORY_DEMO_CALENDLY_URL=https://calendly.com/flotoryapp/30min
```

Local verify: `curl -s http://localhost:8000/api/public/demo-booking` should return `calendly_url`. In Calendly **Embed → Domain restrictions**, allow `localhost` for local iframe tests.

## Phone Testing

Google sign-in **does not work** on a LAN IP (`192.168.x.x`). Use **email/password** on your phone, or stay on `localhost` on your laptop.

Build assets first, then open the Laravel app from your phone using your Mac's local network IP.

```bash
npm run build
docker compose up --build app mysql
```

Find your Mac IP:

```bash
ipconfig getifaddr en0
```

Then open `http://YOUR_MAC_IP:8000` on your phone while both devices are on the same Wi-Fi.

The app includes PWA metadata and mobile icons. On iPhone, open Safari, tap Share, then Add to Home Screen.

## Demo accounts

All seeded accounts use password **`password`** (re-ensured on each Docker app start when `APP_ENV=local`).

| Account | Email | What to test |
|--------|--------|----------------|
| **Platform admin** | `admin@flotory.com` | Venue listings, **Manage venues**, design palette, activity log |
| **Venue owner** | `owner@example.com` | Web: My Venues, dashboard, rewards, campaigns, analytics |
| **Customer** | `customer@example.com` | Mobile: Home, Wallet, **Stamp** (NFC), Venues — 7 stamps at Demo Cafe with a **ready reward** to slide-redeem |

Demo Cafe is the single showcase venue: ~280 guests, ~50–150 visits per month across the last 12 months, milestone unlocks, and claimed rewards for sales demos. Log in as `owner@example.com` to explore dashboard and analytics.

**Demo Cafe milestones** (5 / 10 / 15 stamps): **50% off ice cream**, **Free coffee**, **Free piece of cake** — each with a square reward photo under `public/images/defaults/rewards/`.

**Dashboard date range** — owner dashboard and analytics accept `?period=` presets (`7d`, `14d`, `28d` default, `2m`, `3m`, `6m`, `12m`) or custom `from` / `to` dates. KPI trends compare against the **previous period of equal length** (e.g. last 6 months vs the 6 months before).

Demo Cafe includes an NFC tag (`Counter stand`, token `democafenfcstandlocaltest00001`) and active campaigns after `db:seed`. Setup guide: [docs/NFC_VENUE_SETUP.md](docs/NFC_VENUE_SETUP.md).

### Optional large-scale stress dataset

For multi-venue load-style demos, seed ~150 venues, ~2,400 guests, and ~12,000 stamp visits:

```bash
# After migrate (keeps owner@ / customer@ demo accounts from the default seeder)
SEED_DEMO_SCALE=1 php artisan db:seed

# Or run only the scale seeder (adds on top of existing data)
php artisan db:seed --class=DemoScaleSeeder
```

Scale accounts use password **`password`** and emails like `scale-owner-{slug}@demo.flotory.test`, `scale-guest-{n}@demo.flotory.test`. Includes visits, milestone unlocks, and claimed rewards.

Walkthroughs: **[docs/PRODUCT.md](docs/PRODUCT.md)** and **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Roles

### Platform (`users.is_admin`)

- **true** — platform administrator (`admin@flotory.com` seeded locally and on deploy with `SEED_DATABASE=1`). Admins review venue listings and manage platform settings — they **cannot** own venues or use owner/staff workspace tools.
- **false** — default for all sign-ups (owners and loyalty guests)

### Per venue (`venue_users.role`)

- **owner** — full venue control on web (dashboard, rewards, campaigns, CRM, settings)

Venue permissions use `venue_users`. Loyalty progress uses `customers`. A user can be an owner at one venue and a customer at many others.

## MVP scope

Full feature list: **[docs/PRODUCT.md](docs/PRODUCT.md)**.

Highlights: venue QR bridge → mobile app, NFC stamp stands, owner web dashboard, slide-to-redeem wallet, listing approval workflow ([apps/mobile/README.md](apps/mobile/README.md)).

## Loyalty rules

Canonical rules (stamps, milestones, NFC, slide redeem): **[docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md)**.

API routes, models, and flows: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Documentation

These files are the source of truth for product, architecture, and MVP decisions (for developers and AI tools):

- [docs/README.md](docs/README.md) — **documentation index** (start here)
- [docs/TESTING.md](docs/TESTING.md) — CI gates, local commands, coverage gaps
- [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md) — canonical product rules
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — stack, domain model, API
- [docs/PRODUCT.md](docs/PRODUCT.md) — product overview
- [docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md) — shipped phases and what's next
- [docs/MVP_DECISIONS.md](docs/MVP_DECISIONS.md) — locked decisions
- [docs/CAMPAIGNS.md](docs/CAMPAIGNS.md) — stamp campaign templates and rules
- [docs/ADMIN_ACCESS.md](docs/ADMIN_ACCESS.md) — platform admin and venue listing approval
- [apps/mobile/README.md](apps/mobile/README.md) — Expo app setup and API map

## Roadmap

Future: PWA polish, push notifications, billing per venue, POS integrations, segmentation, and marketing tools — layered on the monolith when there is product demand.
