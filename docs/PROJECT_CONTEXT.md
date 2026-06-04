# Project Context

Flotory is a hospitality loyalty platform in **MVP** stage. This is the short entry point; the full doc index is **[README.md](./README.md)**.

## Stage and goals

**Stage:** MVP — validating product–market fit with real venues.

**Near-term goals:**

- Onboard first paying or pilot venues ([PILOT_CAFE.md](./PILOT_CAFE.md))
- Prove owner onboarding and staff scanner work in live service
- Measure retention (repeat visits, claims, cycle completion)
- Keep the monolith simple enough to ship weekly

**Not in scope yet:** billing, POS integrations, push notifications, advanced segmentation.

## What Flotory does (one paragraph)

Venues get a QR-driven digital stamp card. Customers join via scan, collect **stamps** toward milestone **rewards**, and claim unlocked perks with a **claim QR** (Rewards → Claim) that staff scan on the same counter scanner used for stamps. Since **v2**, customers use **one My QR** for stamps at any venue; the scanner applies stamps to the **active venue’s** card.

**Core value:** Turn occasional customers into regulars.

## Terminology

| Term | Meaning |
|------|---------|
| **Stamp** | Customer-facing unit of progress (not “visit” in UI) |
| **Visit** | Owner/analytics row when staff awards stamps (`visits` table) |
| **Reward / milestone** | Unlock at `required_stamps` |
| **Claim QR** | Short-lived redeem token — separate from stamp QR |
| **My QR** | User-level stamp token (`flotory:member:…`) |

## Canonical rules

**[BUSINESS_RULES.md](./BUSINESS_RULES.md)** wins over all other docs when they disagree.

Locked engineering decisions: **[MVP_DECISIONS.md](./MVP_DECISIONS.md)**.

## v2 QR migration

See **[V2.md](./V2.md)** for config, API, and rollout (Phases 1–3 complete).
