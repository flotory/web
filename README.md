# Flotory

Modern hospitality loyalty platform for independent cafes, bars, restaurants, and venues.

The MVP focuses on venue QR onboarding, digital stamp cards, a fast staff scanner, milestone-based progression rewards, multi-venue workspaces, team memberships, Google sign-in, and retention analytics.

## Stack

- Laravel 12, PHP 8.3+, MySQL, Sanctum, REST APIs, Reverb, Laravel Socialite (Google)
- Vue 3, Vite, Pinia, Vue Router, TailwindCSS, shadcn-vue style components
- Monolith architecture for VPS deployment

## Production deploy flow

Git is the source of truth. The server pulls from GitHub; your Mac runs one deploy command.

### Current production

- Domain: `https://flotory.com`
- Redirect: `https://www.flotory.com` → `https://flotory.com`
- Droplet IP: `64.226.84.118`
- App path on server: `/var/www/web`
- GitHub repo: `git@github.com:flotory/web.git`

### One-time setup

1. **Server bootstrap**:
   ```bash
   ssh root@YOUR_IP 'bash -s' < deploy/setup-server.sh
   ```

2. **Git deploy on the server** (generates a deploy key — add it in GitHub):
   ```bash
   ssh root@YOUR_IP 'bash -s' < deploy/setup-git-deploy.sh
   ```
   GitHub → repo **Settings → Deploy keys → Add** → paste the printed public key (read-only).

3. **Production `.env` on the server** (only once):
   ```bash
   ssh root@YOUR_IP
   cp /var/www/web/deploy/env.production.example /var/www/web/.env
   # Edit passwords, APP_URL, GOOGLE_CLIENT_SECRET, Reverb keys
   SEED_DATABASE=1 /var/www/web/deploy/deploy.sh
   ```

4. **Local config**:
   ```bash
   cp deploy/config.example.sh deploy/config.sh
   ```

See [deploy/DEPLOY.md](deploy/DEPLOY.md) for the full production checklist.

### Every code change (normal flow)

```bash
git add .
git commit -m "Describe your change"
./deploy/push-prod.sh
```

That script:

1. Pushes `main` to GitHub  
2. SSHs to the droplet  
3. Runs `git pull` + `deploy/deploy.sh` (build assets, Docker, migrations, Nginx)

Manual server deploy (without pushing from Mac):

```bash
ssh root@YOUR_IP 'cd /var/www/web && ./deploy/pull-and-deploy.sh'
```

- App: port 80 via Nginx → Laravel on `127.0.0.1:8000`  
- Reverb/WebSocket proxy: `/app/` → `127.0.0.1:8080`
- HTTPS certs: Let's Encrypt via Certbot (auto-renew with `certbot.timer`)

## Local Setup

Portable defaults use **`localhost` only** — same on every Mac/PC. Do not put your Wi‑Fi IP in `.env` unless you are doing optional phone testing (Google sign-in will not work on a LAN IP).

### New machine (or second computer)

```bash
git clone git@github.com:flotory/web.git
cd web
cp .env.secrets.example .env.secrets   # once — paste GOOGLE_CLIENT_SECRET from your password manager
./scripts/setup-local.sh
docker compose up --build
```

Open **http://localhost:8000** on that computer.

| File | Committed? | Purpose |
|------|------------|---------|
| `.env.example` | Yes | Shared template (`localhost`, same on all machines) |
| `.env.secrets` | No | `GOOGLE_CLIENT_SECRET` — copy manually to each computer |
| `.env` | No | Generated locally by `setup-local.sh` |

**Sync code:** `git pull` / `git push` on `main`  
**Never commit:** `.env`, `.env.secrets`

Each machine can have its own `APP_KEY` (Docker generates one on first boot). Local databases are separate per machine.

### Docker (recommended)

```bash
cp .env.secrets.example .env.secrets   # add secret, then:
./scripts/setup-local.sh
docker compose up --build
```

Or manually:

```bash
cp .env.example .env
docker compose up --build
```

Open:

- App: http://localhost:8000
- Vite HMR (dev): http://localhost:5173

**Important:** For Google OAuth and post-login redirects, set `FRONTEND_URL=http://localhost:8000` in `.env` (the Laravel app URL, not the Vite dev server). OAuth callbacks still use `APP_URL`.

Reset database after schema changes:

```bash
docker compose exec app php artisan migrate:fresh --seed
```

Run pending migrations only:

```bash
docker compose exec app php artisan migrate --force
```

### Native

If you are not using Docker, install PHP 8.3+ and Composer first.

```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
npm install
npm run dev
php artisan serve
php artisan reverb:start --host=0.0.0.0 --port=8080
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

OAuth preserves onboarding intent:

- **Customer** (from venue QR): returns to loyalty card after sign-in.
- **Owner** (`intent=owner` from homepage): continues to `/onboarding/create-venue`.

## Onboarding Flows

### Customer (QR scan)

1. Guest opens `/v/{venue-slug}` (public landing with rewards preview).
2. Taps **Join** → register or Google sign-in.
3. After auth, auto-joins the venue and opens `/card`.

### Owner (homepage)

1. Clicks **Get started free** → `/register?intent=owner`.
2. Creates account (email or Google).
3. 5-step wizard: venue name → category → logo → rewards presets → QR.
4. Lands on `/dashboard?onboarding=completed` with a success toast.

Venue owners manage QR download, invite link, and settings under **My Venues → Settings**.

## Phone Testing

Google sign-in **does not work** on a LAN IP (`192.168.x.x`). Use **email/password** on your phone, or stay on `localhost` on your laptop.

Build assets first, then open the Laravel app from your phone using your Mac's local network IP.

```bash
npm run build
docker compose up --build app mysql reverb
```

Find your Mac IP:

```bash
ipconfig getifaddr en0
```

Then open `http://YOUR_MAC_IP:8000` on your phone while both devices are on the same Wi-Fi.

The app includes PWA metadata and mobile icons. On iPhone, open Safari, tap Share, then Add to Home Screen.

## Demo Accounts

All seeded accounts use password: **`password`**

| Account | Email | What to test |
|--------|--------|----------------|
| **Venue owner** | `owner@example.com` | My Venues, dashboard, rewards, team, scanner, analytics |
| **Staff** | `staff@example.com` | Scanner at Demo Cafe only (staff membership) |
| **Customer** | `customer@example.com` | Flotory card, milestone journey, unlock + claim flow |

Additional seeded customers (same password): `maya@example.com`, `alex@example.com`, and others — useful for scanner fallback search.

### Quick test paths

**Owner / staff workspace**

1. Log in as `owner@example.com` or `staff@example.com`
2. Open **Scanner** (header) or **My Venues → Open scanner**
3. Scan or search for `customer@example.com` and add stars
4. Download QR from dashboard hero or venue settings

**Customer**

1. Log in as `customer@example.com`
2. Open **Card** or visit `/v/demo-cafe` as a guest, then join
3. Claim an unlocked milestone reward from the journey

**Team**

1. Log in as `owner@example.com`
2. Open **Team** → invite a new email (new users are created with password `password`)

**QR onboarding (guest)**

1. Open `http://localhost:8000/v/demo-cafe` (no login required to preview)
2. Register as a new customer and confirm auto-join to Demo Cafe

## Roles

### Platform (`users.is_admin`)

- **true** — platform administrator (not seeded by default)
- **false** — default for all sign-ups (owners, staff, and loyalty guests)

### Per venue (`venue_users.role`)

- **owner** — full venue control, delete venue (soft delete), manage team
- **staff** — scanner, customers list, staff redemption

Venue permissions use `venue_users`. Loyalty progress uses `customers`. A user can be owner, staff, and customer at different venues. Scanner routes require an active `venue_users` row for the target venue.

## MVP Scope

- Guest venue landing page (`/v/:slug`) with public reward preview
- Customer registration/login (email + Google) with intent-based redirects
- Owner 5-step onboarding wizard and dashboard success state
- Customer loyalty card per venue with QR token
- Multi-venue owner workspace (`/my-venues`) with search, filters, and premium venue cards
- Single-venue-focused dashboard (auto-selects first venue)
- Venue settings, logo upload, QR download PNG, soft delete
- Team invite/remove (`/team`)
- Staff scanner: add stars only (1–5 or custom); venue-scoped authorization
- Customer search fallback when QR scan fails
- Customer milestone claim from card/rewards
- Staff milestone claim (venue-scoped API)
- Realtime stamp updates on customer devices (Reverb)
- Dashboard stats and guided empty states per active venue

## Progression And QR Model

- A customer has **one loyalty card per venue** they join (`customers` row per `user_id` + `venue_id`).
- Each card has its own **QR token** and **progress balance**.
- Staff scan in the context of **one venue** (`POST /api/venues/{venue}/scanner/stamps`).
- `VenueAccess::requireAccess` enforces membership before scanner operations.
- If the QR belongs to another venue, the API rejects the request.
- Milestones unlock at thresholds and can be claimed once per cycle.
- Progress is not spent on claim; when max milestone is reached, cycle completes and progress resets to 0.
- Customers claim from `/card` or `/rewards`. Staff can also claim via the venue API when needed.
- Open scanner for a specific venue: `/scanner?venue_id=<id>`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for API routes, models, and flows.

## Roadmap

Future: PWA polish, push notifications, email invites for team, billing per venue, POS integrations, segmentation, and marketing tools — layered on the monolith when there is product demand.
