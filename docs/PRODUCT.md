# Product

## What is Flotory?

Flotory is digital loyalty for independent **repeat-visit businesses** — cafes, restaurants, salons, gyms, retail, and more. Guests join via a venue QR bridge, collect **stamps** with **NFC stands** (or in-app NFC on iPhone), and **slide to redeem** unlocked rewards in the mobile app. **Owners** run everything from the **web dashboard**.

Flotory launches in Armenia with **English** as the fallback language and **Armenian** as the first localized language. Venue names, reward titles, and campaign content remain owner-authored content; localization covers the app and dashboard chrome.

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
| Live in minutes with QR onboarding + NFC stands | Wallet with per-brand progress (one card across branches) |
| Stamp campaigns (Bring Back, Happy Hour, VIP, …) | Tap phone on counter stand — no app friction after first join |
| Retention CRM and analytics (per-location visits when branches use separate NFC tags) | Slide to redeem when a reward is ready |
| Listing approval workflow for quality control | Discover shows primary location + branch list |

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
3. **Onboarding wizard** — After register, owners land on `/onboarding`: venue profile (name, category; public join link is generated automatically), Google address, **file uploads** (logo + cover), first reward, then **Submit for review**. Progress is held in an **`owner_onboarding_draft`** until submit — no venue row exists in the database before that. They can also resume from **My Venues → Files** (`/my-venues/{id}/setup-files`) while the brand is `draft` or `rejected`.
4. **Launch** — Complete the listing checklist → **Submit for listing** → platform admin approves → **published**.
5. **Operate** — Dashboard, rewards, campaigns, customers CRM, analytics. **Add branches** from My Venues when you open new locations (shared stamp card and rewards; each new branch awaits Flotory approval before customers can join or tap NFC there).
6. **NFC** — Platform admin provisions NFC stands per **location**; program each tag with its tap URL. Use a **separate token per branch** for accurate location analytics.

**Additional brands:** owners with at least one live brand (`published` or `pending_review`) can create another from **My Venues → Create venue** → **`/my-venues/create/*`** (details → files → reward → review). Like first-time onboarding, the brand is created only on **Submit for review** via the draft API (`purpose: additional_venue`). Abandoned partial drafts are purged when the owner already has a live brand.

**Ops-heavy path:** admin provisions the venue first at **Manage venues → Create venue**; owner resets password or uses Google with the same email.

Public self-serve owner signup (`/register?intent=owner`) is disabled — prospects use **Book a demo** or **Contact us**.

## MVP scope (current)

**Web (owners + platform admin)**

- Dashboard, my-venues (location cards with **Add branch** via ⋯ menu; **Create venue** opens `/my-venues/create/details`), **Files** (`/my-venues/{id}/setup-files`), per-venue **settings** (`/my-venues/{id}/settings`), rewards, campaigns, analytics, customers CRM
- Public venue bridge `/v/:slug`
- Platform admin: listing review, **owner onboarding** (sales invites), manage venues, NFC tags, palette, activity log

**Mobile (customers — iOS focus)**

- Tabs: Home, Wallet, **Stamp** (NFC), Venues, Profile
- Slide-to-redeem rewards
- Google + email auth
- English + Armenian app chrome for discovery, join, NFC, wallet, card, redeem, login, notifications, and profile settings

**API**

- NFC stamp: `POST /api/nfc/t/{token}/stamp`
- Self-redeem: `POST /api/customer/rewards/unlocks/{unlock}/redeem`
- Stamp campaigns (4 templates)
- Venue listing workflow on **brand** (`draft` → `pending_review` → `published`)
- User locale preference (`users.locale`, currently `en` or `hy`) for web/admin and mobile sessions

**Venue categories** (12 + Other — validated in `app/Support/VenueCategories.php`, grouped in the onboarding UI):

| Group | Categories |
|-------|------------|
| Food & drink | `cafe`, `bakery`, `restaurant`, `bar`, `wine_bar`, `quick_service` |
| Services & wellness | `salon`, `spa`, `gym` |
| Retail & other | `retail`, `pet_care`, `other` |

`other` is for any repeat-visit business that does not fit the presets. Default placeholder images (logo/cover) are chosen by category group. Milestone rewards without a custom upload use the bundled default at `/images/defaults/rewards/default-reward.png`. The API rejects unknown category slugs with **422**; the web UI normalizes invalid stored values to `cafe` for display only.

## Multi-location (branches)

Chains and multi-site operators use one **brand** (one loyalty program) with multiple **venue** rows:

| Concept | Meaning |
|---------|---------|
| **Brand** | Shared name, slug, rewards, campaigns, customer wallet, listing status |
| **Primary venue** | Main location created at onboarding; card API uses its id as `venue_id` |
| **Branch** | Additional address under the same brand; own slug, NFC tags, per-location visit analytics. New branches start **`pending_review`** until Flotory approves the location. |
| **Customer** | One stamp card for the whole brand — tap or join at any **published** branch |
| **Owner** | One account; My Venues lists every location; **Add branch** from the ⋯ menu |

Discover in the mobile app shows the primary location with a `branches` list. Joining via any **published** branch slug enrolls on the brand.

---

## Future (not MVP)

Billing, POS integrations, push delivery, Android native NFC parity, co-owner invites — see [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) and [MVP_DECISIONS.md](./MVP_DECISIONS.md).
