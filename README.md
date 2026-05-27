# Loyalty App

Modern hospitality loyalty platform for independent cafes, bars, restaurants, and venues.

The MVP focuses on digital stamp cards, venue-specific QR cards, a fast staff scanner, customer- and staff-managed reward redemption, multi-venue workspaces, team memberships, and simple retention analytics.

## Stack

- Laravel 12, PHP 8.3+, MySQL, Sanctum, REST APIs, Reverb
- Vue 3, Vite, Pinia, Vue Router, TailwindCSS, shadcn-vue style components
- Monolith architecture for VPS deployment

## Local Setup

### Docker (recommended)

```bash
cp .env.example .env
docker compose up --build
```

Open:

- App: http://localhost:8000
- Vite: http://localhost:5173
- Reverb WebSocket: ws://localhost:8080

Reset database after schema changes:

```bash
docker compose exec app php artisan migrate:fresh --seed
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

## Phone Testing

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
| **Customer** | `customer@example.com` | Loyalty card, rewards, swipe-to-redeem (100 stamps at Demo Cafe) |

Additional seeded customers (same password): `maya@example.com`, `alex@example.com`, and others — useful for scanner fallback search.

### Quick test paths

**Owner / staff workspace**

1. Log in as `owner@example.com` or `staff@example.com`
2. Open **Scanner** (or **My Venues** → Scan at a venue)
3. Scan or search for `customer@example.com` and add stars

**Customer**

1. Log in as `customer@example.com`
2. Open **Card** or **Cafes** → join/open Demo Cafe
3. Redeem an unlocked reward with swipe-to-redeem

**Team**

1. Log in as `owner@example.com`
2. Open **Team** → invite a new email (new users are created with password `password`)

## Roles

### Global (`users.role`)

- **admin** — platform administrator (not seeded by default)
- **customer** — default for all sign-ups (owners and staff use this globally too)

### Per venue (`venue_users.role`)

- **owner** — full venue control, archive venue, manage team
- **manager** — edit venue, rewards, logo, invite staff
- **staff** — scanner, customers list, staff redemption

Permissions are checked via venue membership, not the global `users.role` field.

## MVP Scope

- Customer registration/login and personal QR loyalty card per venue
- Multi-venue owner workspace (`/my-venues`)
- Venue settings, logo upload, archive
- Team invite/remove (`/team`)
- Active venue context (`users.active_venue_id`)
- Staff scanner: add stars only (1–5 or custom)
- Customer search fallback when QR scan fails
- Customer reward redemption from card/rewards
- Staff reward redemption (venue-scoped API)
- Realtime stamp updates on customer devices (Reverb)
- Dashboard stats per active venue

## Scanner And QR Model

- A customer has **one loyalty card per venue** they join (`customers` row per `user_id` + `venue_id`).
- Each card has its own **QR token** and **stamp balance**.
- Staff scan in the context of **one venue** (`POST /api/venues/{venue}/scanner/stamps`).
- If the QR belongs to another venue, the API rejects the request.
- Customers redeem from `/card` or `/rewards`. Staff can also redeem via the venue API when needed.
- Open scanner for a specific venue: `/scanner?venue_id=<id>` without changing active workspace.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for API routes, models, and flows.

## Roadmap

Future: PWA polish, push notifications, email invites for team, billing per venue, POS integrations, segmentation, and marketing tools — layered on the monolith when there is product demand.
