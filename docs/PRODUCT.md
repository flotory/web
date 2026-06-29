# Product

## What is Flotory?

Flotory is digital loyalty for independent cafes, bars, restaurants, and bakeries. Guests join via a venue QR bridge, collect **stamps** with **NFC stands** (or in-app NFC on iPhone), and **slide to redeem** unlocked rewards in the mobile app. **Owners** run everything from the **web dashboard**.

**Tagline value:** Turn occasional customers into regulars.

## Problem

Paper punch cards get lost, are easy to fraud, and give owners no insight into who comes back. Generic loyalty apps are expensive and overbuilt for a single-location venue.

## Users

| Role | Surface | Goal |
|------|---------|------|
| **Owner** | Web dashboard | Set up venue, rewards, campaigns, NFC stands; grow repeat visits |
| **Customer** | iOS mobile app | Join venues, tap NFC for stamps, slide to redeem rewards |
| **Platform admin** | Web `/admin` | Approve venue listings, manage platform |

Staff scanner, team invites, and claim QR were **removed** in the 2026 pivot — see [BUSINESS_RULES.md](./BUSINESS_RULES.md).

## Value proposition

| For owners | For customers |
|------------|---------------|
| Live in minutes with QR onboarding + NFC stands | Wallet with per-venue progress |
| Stamp campaigns (Bring Back, Happy Hour, VIP, …) | Tap phone on counter stand — no app friction after first join |
| Retention CRM and analytics | Slide to redeem when a reward is ready |
| Listing approval workflow for quality control | Polling refresh after stamps and redeems |

## Customer journey (mobile)

1. **Discover** — Scan venue QR → web bridge `/v/{slug}` → open Flotory app.
2. **Join** — Register or Google sign-in; `POST /api/venues/{slug}/join` when venue is **published**.
3. **Stamp** — Tap NFC stand at counter **or** use **Stamp** tab (in-app NFC on native iOS build). Each tap = +1 stamp (campaign multipliers apply).
4. **Progress** — **Home** and **Wallet** show cards, journey, and ready rewards.
5. **Redeem** — **Slide to redeem** on a ready reward (`POST /api/customer/rewards/unlocks/{unlock}/redeem`). Stamps are not deducted.
6. **Return** — When the top milestone is reached, the cycle completes and stamps reset; unclaimed unlocks from prior cycles stay in the wallet.

## Owner journey (web)

Sales-led onboarding (default after a demo):

1. **Invite** — Flotory admin sends an owner invitation from **Owner onboarding** (`/admin/owner-onboarding`): email + optional business name.
2. **Register** — Owner opens `/register?invite=…`, sets a password (invite expires after `FLOTORY_OWNER_INVITATION_TTL_DAYS`, default 7).
3. **Create venue** — **My Venues** (`/my-venues?create=1`): name, address, category. Only users with an accepted invitation may self-create a venue (one per invite).
4. **Launch** — Upload files on **Files & docs**, complete listing checklist → **Submit for listing** → platform admin approves → **published**.
5. **Operate** — Dashboard, rewards, campaigns, customers CRM, analytics.
6. **NFC** — Platform admin provisions NFC stands; program tags with tap URL.

**Ops-heavy path:** admin provisions the venue first at **Manage venues → Create venue**; owner resets password or uses Google with the same email.

Public self-serve owner signup (`/register?intent=owner`) is disabled — prospects use **Book a demo** or **Contact us**.

## MVP scope (current)

**Web (owners + platform admin)**

- Dashboard, my-venues, rewards, campaigns, analytics, customers CRM, settings
- Public venue bridge `/v/:slug`
- Platform admin: listing review, **owner onboarding** (sales invites), manage venues, NFC tags, palette, activity log

**Mobile (customers — iOS focus)**

- Tabs: Home, Wallet, **Stamp** (NFC), Venues, Profile
- Slide-to-redeem rewards
- Google + email auth

**API**

- NFC stamp: `POST /api/nfc/t/{token}/stamp`
- Self-redeem: `POST /api/customer/rewards/unlocks/{unlock}/redeem`
- Stamp campaigns (4 templates)
- Venue listing workflow (`draft` → `pending_review` → `published`)

**Venue categories:** cafe, bar, restaurant, bakery.

## Future (not MVP)

Billing, POS integrations, push delivery, Android native NFC parity, co-owner invites — see [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) and [MVP_DECISIONS.md](./MVP_DECISIONS.md).
