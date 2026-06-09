# Product

## What Is Flotory?

Flotory is a digital loyalty platform for independent hospitality businesses. Venues place a QR code at the counter or on tables; guests scan to join in the **Flotory mobile app**, collect stamps on a phone-based loyalty card, and unlock milestone rewards. **Owners** run everything from the **web dashboard**. **Customers and staff** use the **Expo mobile app**.

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
| Live in minutes with QR onboarding | Mobile app wallet and My QR |
| Staff scanner in the mobile app | Clear progress toward the next reward |
| Milestone rewards that drive return visits | Claim QR scanned by staff at the counter |
| Retention analytics (visits, claims, cycles) | Realtime stamp updates when Reverb is enabled |

## Customer Journey (mobile app)

1. **Discover** — Guest scans venue QR → web bridge at `/v/{slug}` → opens Flotory app.
2. **Join** — Register or sign in (email or Google); auto-joins the venue.
3. **Collect** — Staff scan the customer's **My QR** (one universal stamp code) and award stamps (typically 1 per purchase; campaigns may multiply).
4. **Progress** — Customer sees venue cards on **Wallet**; tap a card for QR and milestone journey; pending earned rewards live on **Rewards**.
5. **Redeem** — Customer taps **Claim**, shows the claim QR to staff; staff scan redeems it. Customer screen updates when claimed. Stamps are not deducted on redeem.
6. **Return** — Cycle continues; when the top milestone is reached, the cycle completes and stamps reset for the next round.

## Owner Journey (web)

1. **Sign up** — Homepage → register with `intent=owner` (or Google equivalent).
2. **Onboard** — 4-step wizard: name + slug → category → reward presets → QR download.
3. **Launch** — Complete listing checklist (address, branding, rewards), submit for admin review, then place QR when **published**. Download QR PNG anytime; staff scanner works before public approval.
4. **Operate** — Operational dashboard (KPIs, insights); `/rewards` for milestones; `/team` for staff.
5. **Measure** — `/analytics` for trends and deeper KPIs; dashboard surfaces current-month KPIs and API insights.

## Staff Journey (mobile app + web invite)

1. **Invite** — Owner sends email invitation from `/team` (web).
2. **Accept** — Staff opens `/invite/{token}` on the web, creates account or signs in, joins as `staff`.
3. **Scan** — Mobile app scanner (venue-scoped): auto-detect stamp card vs claim QR; search-by-name fallback for stamps only.
4. **Award** — Select stamp amount (presets 1–5 or custom 1–100), confirm.
5. **Assist** — Optionally claim a milestone on behalf of a customer via staff API when needed.

## MVP Scope (Current)

What ships today:

**Web (owners + platform admin)**

- Owner dashboard, onboarding, my-venues, rewards, campaigns, analytics, team, customers CRM
- Public venue bridge (`/v/:slug`) — QR entry points guests to the mobile app
- Staff invitation accept flow (`/invite/{token}`)
- Platform admin: venue listing review, design palette, activity log (`/admin/*`) — see [ADMIN_ACCESS.md](./ADMIN_ACCESS.md)

**Mobile app (customers + staff)**

- Customer: Home, Wallet, My QR, Venues, Rewards claim, Profile/Settings
- Staff scanner with QR camera + customer search fallback
- Scanner auto-detect: stamp card vs claim QR; pending-reward warning after stamp scans
- Optional realtime stamp updates via Reverb

**Shared API**

- Email + Google auth; password reset
- Venue listing workflow (`draft` → `pending_review` → `published`) with admin approval
- Stamp campaigns (Bring Back, Quiet Day, Happy Hour, VIP)
- Milestone rewards CRUD with images (archive / reactivate / purge)
- Team: email invitations, resend, cancel; staff role only
- Staff-side milestone claim API

**Venue categories in product:** cafe, bar, restaurant, bakery.

## Future Vision (Not MVP)

The phased product roadmap lives in [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) — from loyalty foundation through retention, CRM, campaigns, and long-term platform vision.

See [MVP_DECISIONS.md](./MVP_DECISIONS.md) for constraints that remain until explicitly revised.
