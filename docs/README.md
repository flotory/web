# Flotory documentation

Small, focused docs — one topic per file. Start here.

## Read first

| Doc | Who | What |
| --- | --- | --- |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | Product + engineering | **Canonical** rules (stamps, claims, campaigns, QR) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Engineering | Stack, models, API flows, code layout |
| [PRODUCT.md](./PRODUCT.md) | Product | Positioning, personas, journeys, MVP scope |

## Reference

| Doc | Purpose |
| --- | --- |
| [MVP_DECISIONS.md](./MVP_DECISIONS.md) | Locked decisions — do not undo without approval |
| [CAMPAIGNS.md](./CAMPAIGNS.md) | Campaign templates, API, owner UI |
| [ADMIN_ACCESS.md](./ADMIN_ACCESS.md) | Platform admin and venue listing approval |
| [KNOWN_RISKS.md](./KNOWN_RISKS.md) | Accepted risks and resolved issues |
| [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) | Shipped phases + what's next |

## Operations

Local dev, deploy, demo accounts: root [README.md](../README.md) and [deploy/DEPLOY.md](../deploy/DEPLOY.md).

Testing & CI gates: [TESTING.md](./TESTING.md).

Mobile app: [apps/mobile/README.md](../apps/mobile/README.md).

---

## Stage

**MVP** — validating product–market fit with real venues.

**Current focus:** first pilot venue — listing approval → join → stamp → unlock → claim QR → redeem.

**Not in scope yet:** billing, POS integrations, push delivery (mobile inbox UI exists; Expo push is future), advanced segmentation.

## What Flotory does

Venues get a QR-driven digital stamp card. Customers join via scan (once **published**), collect **stamps** with one universal **My QR**, and claim unlocked perks with a separate **claim QR**. Owners register on the web, create their first venue in **My Venues**, submit a **listing** for admin approval, configure rewards and stamp **campaigns**, invite staff, and view analytics.

## Terminology

| Audience | Use | Meaning |
| --- | --- | --- |
| Customer UI | **Stamps**, **Rewards**, **Progress** | Stamps toward milestones |
| Owner/staff UI | **Visits**, **Customers**, **Loyalty activity** | One visit row per staff stamp action |

- Rewards require **stamps**, never visits.
- Staff may award **1–100 stamps** per action; one visit row is created per action.
- **Claim** marks an unlock as used; stamps are **not** deducted.

## Identity model

| Layer | Where | Values |
| --- | --- | --- |
| Platform | `users.is_admin` | Platform admin (listing review only — no owner workspace) |
| Venue team | `venue_users.role` | `owner`, `staff` |
| Loyalty | `customers` | One card per user per venue |

A user can be owner at venue A, staff at B, and customer at C.

## Engineering principles

- Business logic in Laravel services (`LoyaltyStampService`, `VenuePublicationService`, …)
- Thin controllers; Vue is presentation only
- Monolith first — ship weekly
