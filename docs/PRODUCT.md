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

1. **Sign up** — Homepage → register with `intent=owner`.
2. **Create venue** — **My Venues** (`/my-venues?create=1`): name, address, category.
3. **Launch** — Listing checklist (setup files, rewards) → **Submit for listing** → admin approves → **published**.
4. **Operate** — Dashboard, rewards, campaigns, customers CRM, analytics.
5. **NFC** — Platform admin (or owner via support) provisions NFC stands; program tags with tap URL.

## MVP scope (current)

**Web (owners + platform admin)**

- Dashboard, my-venues, rewards, campaigns, analytics, customers CRM, settings
- Public venue bridge `/v/:slug`
- Platform admin: listing review, manage venues, NFC tags, palette, activity log

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
