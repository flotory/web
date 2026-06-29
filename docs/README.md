# Flotory documentation

Small, focused docs — one topic per file. Start here.

## Read first

| Doc | Who | What |
| --- | --- | --- |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | Product + engineering | **Canonical** rules (stamps, NFC, slide redeem, campaigns) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Engineering | Stack, models, API flows, migrations |
| [PRODUCT.md](./PRODUCT.md) | Product | Positioning, personas, journeys, MVP scope |

## Reference

| Doc | Purpose |
| --- | --- |
| [MVP_DECISIONS.md](./MVP_DECISIONS.md) | Locked decisions — do not undo without approval |
| [CAMPAIGNS.md](./CAMPAIGNS.md) | Campaign templates, API, owner UI |
| [ADMIN_ACCESS.md](./ADMIN_ACCESS.md) | Platform admin and venue listing approval |
| [NFC_VENUE_SETUP.md](./NFC_VENUE_SETUP.md) | Program NFC stands, venue go-live checklist, troubleshooting |
| [APP_STORE_SUBMIT.md](./APP_STORE_SUBMIT.md) | iOS App Store ops — review status, resubmit, after approval |
| [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) | Shipped phases + what's next |
| [PROJECT_BUSINESS_REFERENCE.md](./PROJECT_BUSINESS_REFERENCE.md) | QA audit — flows, edge cases, pre-release checklist |

## Operations

Local dev, deploy, demo accounts: root [README.md](../README.md) and [deploy/DEPLOY.md](../deploy/DEPLOY.md).

Testing & CI gates: [TESTING.md](./TESTING.md).

Mobile app: [apps/mobile/README.md](../apps/mobile/README.md).

---

## Stage

**MVP** — complete product ready to onboard the first venue customer.

**Current focus:** App Store approval and end-to-end go-live — listing approval → join → NFC stamp → unlock → slide redeem.

**Not in scope yet:** billing, POS integrations, push delivery, staff scanner / claim QR / team invites.

## What Flotory does

Venues get QR onboarding and **NFC stamp stands**. Customers join via scan (once **published**), tap NFC for **stamps**, and **slide to redeem** unlocked perks. Owners are onboarded **sales-led** (admin invitation → register → create venue in **My Venues**), submit a **listing** for admin approval, configure rewards and stamp **campaigns**, and view analytics.

## Terminology

| Audience | Use | Meaning |
| --- | --- | --- |
| Customer UI | **Stamps**, **Rewards**, **Progress** | Stamps toward milestones |
| Owner UI | **Visits**, **Customers**, **Loyalty activity** | One visit row per stamp award |

- Rewards require **stamps**, never visits.
- Each NFC tap awards **1 base stamp** (campaign multipliers may apply).
- **Redeem** marks an unlock as used; stamps are **not** deducted.

## Identity model

| Layer | Where | Values |
| --- | --- | --- |
| Platform | `users.is_admin` | Platform admin (listing review only) |
| Venue team | `venue_users.role` | `owner` |
| Loyalty | `customers` | One card per user per venue |

A user can be owner at venue A and customer at many venues.

## Engineering principles

- Business logic in Laravel services (`LoyaltyStampService`, `NfcStampService`, `VenuePublicationService`, …)
- Thin controllers; Vue and mobile are presentation only
- Two consolidated migrations + `php artisan migrate:fresh --seed` for clean installs
- Monolith first — ship weekly
