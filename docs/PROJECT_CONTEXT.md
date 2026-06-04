# Project Context

Flotory is a hospitality loyalty platform in **MVP** stage. This document is the entry point for product and engineering context. Detailed specs live in sibling docs — avoid duplicating them here.

| Document | Purpose |
|----------|---------|
| [PRODUCT.md](./PRODUCT.md) | What we build, for whom, journeys, MVP scope, vision |
| [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) | Phased SaaS roadmap from loyalty foundation to growth platform |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack, domain model, API flows, code layout |
| [MVP_DECISIONS.md](./MVP_DECISIONS.md) | Approved decisions AI and developers must not undo |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | Product invariants and business expectations (no implementation) |
| [KNOWN_RISKS.md](./KNOWN_RISKS.md) | Accepted risks, open edge cases, resolved issues |
| [PILOT_CAFE.md](./PILOT_CAFE.md) | Playbook to onboard the first real pilot venue |
| [NEXT_STEPS.md](./NEXT_STEPS.md) | What to do next, how, and expected outcomes |
| [ADMIN_ACCESS.md](./ADMIN_ACCESS.md) | Super admin login and activity log |

Operational setup (local dev, deploy, demo accounts) stays in the root [README.md](../README.md).

## Stage and Goals

**Stage:** MVP — validating product–market fit with real venues.

**Near-term goals:**

- Onboard first paying or pilot venues
- Prove owner onboarding and staff scanner work in live service
- Measure retention signals (repeat visits, milestone claims, cycle completion)
- Keep the monolith simple enough to ship weekly

**Not in scope yet:** billing, POS integrations, push notifications, advanced segmentation, multi-owner venues.

## What Flotory Does (One Paragraph)

Venues get a QR-driven digital stamp card. Customers join via scan, collect **stamps** toward milestone **rewards**, and claim unlocked perks by showing a **claim QR** (Rewards → Claim) that staff scan on the same counter scanner used for stamps. Owners configure rewards, download QR assets, invite staff, and view visit-based analytics.

**Core value:** Turn occasional customers into regulars.

## Terminology

Use the right words for the audience. Mixing them causes UX and schema bugs.

| Audience | Use | Meaning |
|----------|-----|---------|
| Customer-facing UI & copy | **Stamps**, **Rewards**, **Progress** | Stamps earned toward milestones; progress bar on the loyalty card |
| Owner/staff UI & analytics | **Visits**, **Customers**, **Loyalty activity** | A visit is recorded when staff award stamps; analytics count visits, not stamp totals |

**Rules:**

- Rewards are earned via **stamps** (`required_stamps` on milestones). **Never** use visits as reward requirements.
- A single customer visit (staff action) may award **multiple stamps** (1–100). One `visits` row is created per stamp action, not per individual stamp.
- “Claim” / “redeem” in code means marking a milestone as used (`reward_unlocks.claimed_at`). Stamps are **not** deducted on claim.
- Prefer **milestone** in owner docs when referring to configured rewards; **reward** is fine in customer copy.

## Identity Model (Summary)

There is no global “owner” or “customer” role on `users`.

| Layer | Where | Values |
|-------|-------|--------|
| Platform | `users.is_admin` | `true` = platform admin; `false` = everyone else |
| Venue team | `venue_users.role` | `owner`, `staff` |
| Loyalty participation | `customers` | One row per user per venue (QR token, stamp balance) |

A single user can be **owner** at venue A, **staff** at venue B, and a **customer** at venue C.

## Engineering Principles

- **Backend owns business logic** — `LoyaltyStampService` for stamps, unlocks, claims, cycles; `VenueStaffInvitationService` for team invites; `VenueAccess` for authorization.
- **Thin controllers and models** — validate, authorize, delegate, return JSON.
- **Vue is presentation** — no loyalty rules in the SPA; call the API.
- **Monolith first** — Laravel API + Vue SPA in one repo for fast MVP iteration.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure and [MVP_DECISIONS.md](./MVP_DECISIONS.md) for locked product and schema choices.
