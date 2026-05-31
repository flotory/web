# Product

## What Is Flotory?

Flotory is a digital loyalty platform for independent hospitality businesses. Venues place a QR code at the counter or on tables; guests scan to join, collect stamps on a phone-based loyalty card, and unlock milestone rewards. Owners run everything from a web workspace — no separate customer app install.

**Tagline value:** Turn occasional customers into regulars.

## Problem

Paper punch cards get lost, are easy to fraud, and give owners no insight into who comes back. Generic loyalty apps are expensive, slow to set up, and overbuilt for a single-location cafe or bar. Staff need something that works in seconds during rush hour.

## Target Customers

**Primary businesses:** Cafes, coffee shops, bakeries, restaurants, bars.

**Buyer:** Venue owner or manager (often also working the floor).

**Users:**

| Role | Who | Goal |
|------|-----|------|
| Owner | Venue operator | Set up loyalty, grow repeat visits, manage team |
| Staff | Barista, server, host | Scan QRs, award stamps, help guests claim rewards |
| Customer | Guest / regular | Join easily, see progress, claim earned rewards |

## Value Proposition

| For owners | For customers |
|------------|---------------|
| Live in minutes with QR onboarding | No app download — web card on any phone |
| Staff scanner built for speed | Clear progress toward the next reward |
| Milestone rewards that drive return visits | Swipe-to-claim unlocked perks |
| Retention analytics (visits, claims, cycles) | Realtime stamp updates when Reverb is enabled |

## Customer Journey

1. **Discover** — Guest scans venue QR or opens `/v/{slug}` landing page.
2. **Join** — Register or sign in (email or Google); auto-joins the venue.
3. **Collect** — Staff scan the customer QR and award stamps (typically 1 per purchase; venue may award more).
4. **Progress** — Customer sees stamp count and milestone journey on `/card`; pending earned rewards live on `/customer/rewards` (tab badge).
5. **Redeem** — Customer opens the Rewards wallet, slides to use at the counter; success modal, then back to Rewards. Stamps are not deducted on redeem.
6. **Return** — Cycle continues; when the top milestone is reached, the cycle completes and stamps reset for the next round.

## Owner Journey

1. **Sign up** — Homepage → register with `intent=owner` (or Google equivalent).
2. **Onboard** — 5-step wizard: name → category → logo → reward presets → QR preview.
3. **Launch** — Download QR PNG, share invite link, place materials in venue.
4. **Operate** — Dashboard for setup checklist and stats; `/rewards` to manage milestones; `/team` to invite staff.
5. **Measure** — Analytics and dashboard: customers, visits, progression rate, milestone claims.

## Staff Journey

1. **Invite** — Owner sends email invitation from `/team`.
2. **Accept** — Staff opens `/invite/{token}`, creates account or signs in, joins as `staff`.
3. **Scan** — `/scanner` (venue-scoped): scan customer QR or search by name/email fallback.
4. **Award** — Select stamp amount (presets 1–5 or custom 1–100), confirm.
5. **Assist** — Optionally claim a milestone on behalf of a customer via staff API when needed.

## MVP Scope (Current)

What ships today:

- Public venue landing (`/v/:slug`) — primary QR entry
- Email + Google auth with intent-based redirects (owner vs customer)
- Password reset (forgot / reset flows)
- Owner 5-step onboarding wizard
- Multi-venue owner workspace (`/my-venues`) with soft delete
- Venue settings: slug, category, logo, cover, contact fields, QR download
- Milestone rewards CRUD with images (archive / reactivate / purge)
- Team: email invitations, resend, cancel; staff role only
- Staff scanner with QR camera + customer search fallback
- Customer loyalty card per venue (`/card`) with journey, stamp/reward animations, and redeem shortcut
- Customer rewards wallet (`/customer/rewards`) — one row per unclaimed unlock, slide-to-redeem, success modal
- Customer venues list (`/venues`) and settings (`/customer/settings`)
- Staff-side milestone claim API
- Optional realtime stamp updates via Reverb
- Owner dashboard and analytics (visits, customers, milestone conversion)
- Staff-only simplified nav (Scanner, Customers, Account)

**Venue categories in product:** cafe, bar, restaurant, bakery.

## Future Vision (Not MVP)

Layered on the same monolith when demand appears:

- Billing per venue
- Push notifications and email campaigns
- POS / payment integrations
- Customer segmentation and marketing automation
- PWA polish beyond current metadata
- Co-owner or role expansion beyond owner/staff

See [MVP_DECISIONS.md](./MVP_DECISIONS.md) for constraints that remain until explicitly revised.
