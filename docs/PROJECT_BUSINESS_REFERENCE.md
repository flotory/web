# Flotory — Project & Business Reference

**Purpose:** One place to understand what Flotory is, how it works, and where to look for **edge cases** and **logical inconsistencies**. Use this for QA, product review, support, and pre-launch audits.

**Canonical rules:** [BUSINESS_RULES.md](./BUSINESS_RULES.md) wins over everything else. Update that file (and this one) when behavior is intentionally changed.

**Last updated:** 2026-07-02

---

## 1. What Flotory is

Flotory is digital loyalty for independent cafes, bars, restaurants, and bakeries.

| Side | Who | Surface | Core job |
|------|-----|---------|----------|
| **Customer** | Guest / regular | **iOS mobile app** (Expo) | Join venues, tap NFC for stamps, slide to redeem rewards |
| **Owner** | Venue operator | **Web dashboard** (Vue) | Venue setup, rewards, campaigns, CRM, analytics |
| **Platform admin** | Flotory team | Web `/admin` | Approve listings, NFC tags, platform config |

**Value:** Replace paper punch cards with NFC stamps, milestone rewards, and owner analytics — without POS integrations or heavy marketing tooling.

**Production:** https://flotory.com · **Repo:** monolith (Laravel API + Vue web + `apps/mobile`)

**2026 pivot (important):** Staff scanner, claim QR, stamp QR, and team invites are **removed**. Stamps are **NFC-only**. Redeem is **customer slide-to-redeem** in the app.

---

## 2. Terminology (do not mix these)

| Term | Audience | Meaning |
|------|----------|---------|
| **Stamp** | Customer UI | Progress unit on a loyalty card |
| **Visit** | Owner analytics | One row in `visits` per stamp award; `venue_id` = tap **location** |
| **Brand** | Internal + APIs | Loyalty program — rewards, campaigns, customer wallet, listing status |
| **Venue / branch** | Owner + discover | Physical location under a brand; branches share one stamp card |
| **Reward / milestone** | Both | Threshold (`required_stamps`) that unlocks a perk |
| **Unlock** | Both | Earned reward row (`reward_unlocks`) — not yet redeemed |
| **Claim / redeem** | Both | Customer slides to redeem; sets `claimed_at` |
| **Cycle** | Internal + card journey | Resets stamps when top active milestone is reached |
| **Campaign** | Owner + customer | Stamp **multiplier** only (not email/SMS marketing) |

Customer copy must **never** say “visits.” Owner analytics may say “visits,” not “stamps” as the primary metric.

---

## 3. Domain model (mental map)

```text
User
 ├── BrandUser (role: owner) ──► Brand
 │                                 ├── Reward (milestones)
 │                                 ├── Campaign (multipliers)
 │                                 └── Customer (one card per user+brand)
 │                                      ├── stamps (current cycle balance)
 │                                      ├── Visit (analytics; venue_id = tap location)
 │                                      ├── CustomerRewardCycle
 │                                      ├── RewardUnlock ──► Reward
 │                                      └── StampEvent (NFC audit / debounce)
 └── (same user may also be Customer at other brands)

Brand ──► Venue (primary + branches)
            └── NfcTag (per location)
```

**Key invariants**

- One loyalty card per `(user_id, brand_id)`.
- API `customers.venue_id` = **primary** location id (compat); `brand_id` = program id.
- Unlock + redeem live on the **same** `reward_unlocks` row.
- Stamps are **not** deducted when redeeming.
- Cycle completes at the **max** `required_stamps` among **active** milestones on the **brand**; stamps reset to 0; **unclaimed unlocks from prior cycles stay redeemable**.
- NFC at a branch credits the brand wallet; `visits` / `stamp_events` use the branch `venue_id`.

---

## 4. Core business flows

### 4.1 Venue goes live

```text
draft → pending_review → published
```

- Customers can only **join** or **discover** brands with status **`published`** (and not soft-deleted).
- Owner completes listing checklist → submits → platform admin approves.

### 4.2 Customer join

| Path | Trigger | Rule |
|------|---------|------|
| **QR bridge** | Scan QR → `/v/{slug}` web landing → open app | `POST /api/venues/{slug}/join` — brand must be **published** (any location slug) |
| **Discover** | Venues tab in app | Lists **published** primary locations with `branches` |
| **NFC auto-join** | First tap at counter stand | `NfcStampService` calls `findOrJoin` — still requires **published** brand |

Re-joining returns the **existing** card (U2).

### 4.3 Stamp (NFC only)

1. Customer taps NFC stand (`https://flotory.com/t/{token}`) or uses **Stamp** tab (in-app NFC on iOS).
2. `POST /api/nfc/t/{token}/stamp`
3. Base award: **1 stamp** × **max matching campaign multiplier** (campaigns never stack — take the highest).
4. One `visits` row created per award.
5. Eligible milestones unlock for the **current cycle**.
6. If balance ≥ max active milestone → **cycle completes**, stamps → 0.

### 4.4 Unlock & redeem

| Stage | State | Customer sees |
|-------|-------|---------------|
| Not yet earned | No unlock row | Progress toward next milestone |
| Earned, not redeemed | `unlocked_at` set, `claimed_at` null | “Ready” — slide to redeem |
| Redeemed | `claimed_at` set | Gone from wallet / claimed history |

- Redeem targets a **specific** `unlock_id` (not FIFO by reward type).
- Archiving a milestone stops **new** unlocks at that threshold; existing unclaimed unlocks remain redeemable (E5).

### 4.5 Campaigns (stamp multipliers)

| Template | Matches when |
|----------|----------------|
| **Bring Back** | Customer inactive ≥ `inactive_days` since last visit (or since join) |
| **Quiet Day** | Today’s weekday in `days_of_week`, within campaign dates |
| **Happy Hour** | Weekday + local time window + campaign dates |
| **VIP** | Visit count ≥ `min_visits` **OR** claimed rewards ≥ `min_rewards_claimed` |

- Multiple active campaigns allowed; customer gets **`max(multiplier)`**, never the product.
- Example: 2× + 2× + 3× eligible → **3×** stamps for that tap (not 12×).
- Campaigns are **ended**, not deleted.

---

## 5. Customer mobile surfaces

| Tab | Shows |
|-----|--------|
| **Home** | Summary, ready rewards, **campaign carousel** (`home_campaigns`), quick actions |
| **Wallet** | All cards, progress, slide redeem |
| **Stamp** | NFC scan hero |
| **Venues** | Discover / search published venues |
| **Profile** | Account settings |

**Card detail** (`/card/{cardId}`): venue hero, progress, rewards carousel, promotion sticker when multiplier > 1.

**Web customers:** `/wallet`, `/my-qr`, etc. redirect to `/app` (mobile download). Web login is **owners + admins only**.

---

## 6. API cheat sheet

| Action | Endpoint |
|--------|----------|
| List cards + home campaigns | `GET /api/customer/cards` (each card includes `brand_id` + primary `venue_id`) |
| Single card + promotion | `GET /api/customer/cards?venue_id={id}` — `{id}` may be **branch** or primary; resolves to brand card |
| Join venue | `POST /api/venues/{slug}/join` |
| Owner branches | `GET/POST/PATCH/DELETE /api/venues/{venue}/branches` |
| NFC stamp | `POST /api/nfc/t/{token}/stamp` |
| Wallet unlocks | `GET /api/customer/rewards/wallet` |
| Slide redeem | `POST /api/customer/rewards/unlocks/{unlock}/redeem` |
| Public landing | `GET /api/public/venues/{slug}/landing` |
| Discover venues | `GET /api/venues/discover` |

**Implementation:** `LoyaltyStampService` (stamps, cycles, unlocks, redeem), `NfcStampService` (NFC + rate limits), `CampaignService` / `CampaignEngine` (multipliers).

---

## 7. Documented exceptions (known behaviors)

These are **accepted** until explicitly changed in [BUSINESS_RULES.md](./BUSINESS_RULES.md).

| ID | Area | Behavior | Risk |
|----|------|----------|------|
| **E1** | Cycle reset | ~~Overflow lost~~ **Resolved:** overflow **carries** into next cycle | — |
| **E2** | New milestone | Unlock on **next stamp only** (not on app open) | Customer waits for next tap |
| **E4** | Card journey | Card shows **current cycle**; older-cycle unlocks mainly in Wallet | Split mental model |
| **E5** | Archived reward | Unclaimed unlocks **still redeemable** after archive | Wallet may show retired reward |
| **E6** | No active milestones | Stamps accumulate, **no cycle completion** | Endless stamp pile |
| **E7** | Archived threshold | Archived `required_stamps` still blocks reusing that count for **new** active milestone | Owner must purge or pick new threshold |
| **E8** | Soft-deleted venue | No new stamps; redeem **may** still work | Confusing card state |
| **E10** | Multi-venue owner | Empty customers list without venue filter | Owner UX gap |
| **E11** | Platform admin | `is_admin` broad bypass by design | Security / audit |
| **E12** | Mobile refresh | After NFC stamp, home/wallet/card prefetch before navigate; mounted tabs listen for refresh | Polling-only updates may still lag |

**Resolved:** E1 (overflow carry), E2 (stamp-only unlock), E3 (specific unlock redeem), E5 partial (archived still redeemable by design), E9 (staff removed).

---

## 8. Edge cases & logical inconsistencies

Use this section when auditing product logic, writing tests, or answering “what happens if…?”

### 8.1 Doc vs code mismatches (fix or document)

| Issue | Status |
|-------|--------|
| **Duplicate-tap guard** | **Resolved (2026-06-08):** **3 seconds** for visit cooldown and NFC debounce — see `config/loyalty.php`, [BUSINESS_RULES S6](./BUSINESS_RULES.md). |
| **Campaign failure on stamp** | **Resolved (2026-06-08):** Base stamp always awarded; `campaign_warning` in API + mobile alert; bonus reconciliation is manual/future. |

---

### 8.2 Two independent rate limits on NFC

NFC taps hit **both**:

1. **`NfcStampService`** — debounce on `stamp_events` (user + tag), plus max stamps per venue window.
2. **`LoyaltyStampService`** — cooldown on recent **`visits`** (any stamp path).

| Scenario | What happens |
|----------|----------------|
| Double-tap same tag < debounce | 422 on `token` — “wait before tapping again” |
| Tap passes NFC debounce but within visit cooldown | 422 on `stamp` — “stamped just now” |
| Different NFC tags, same venue, fast | NFC debounce is per-tag; visit cooldown is per-customer |

**Edge case:** Rapid taps on **different** stands at the same venue may still be blocked by visit cooldown.

---

### 8.3 Campaign presentation: Home vs Card (asymmetric by design — but confusing)

| Surface | Data source | What customer sees |
|---------|-------------|-------------------|
| **Home carousel** | `home_campaigns` from `GET /customer/cards` | **All** visible active campaigns per joined venue; each has `applies_now: true/false` |
| **Card detail** | `promotion` from `promotionForCustomer()` | **Only winning multiplier** when > 1; always presented as active (`appliesNow: true`) |
| **Card sticker** | `promotion.multiplier > 1` | “N× STAMPS ACTIVE” pulse badge |

| Scenario | Home | Card sticker |
|----------|------|--------------|
| Happy Hour 2× scheduled tomorrow | Light card, `applies_now: false` | **No sticker** |
| Happy Hour 2× active now | Dark card, `applies_now: true` | **Sticker shows** |
| VIP 2× + Happy Hour 2× both match now | Two cards; higher multiplier sorted first | **Only winner** (e.g. 2×) — no mention of the other |
| Campaign paused | Hidden from customer surfaces | No sticker |

**Audit questions:** Should home “upcoming” campaigns use different copy than “active”? Should card show schedule when `applies_now` is false on home for the same venue?

---

### 8.4 Stamp math edge cases

| Scenario | Expected behavior | Watch for |
|----------|-------------------|-----------|
| 3× campaign, 1 tap | +3 stamps, 1 visit | UI shows +3 vs “1 tap” wording |
| Tap unlocks milestone **and** completes cycle in one action | Cycle resets; overflow **carries** to next cycle | e.g. 9/10 +3 → new cycle at **2** |
| Customer at 9/10, gets +3 | Completes cycle; balance **2** in next cycle | E1 resolved |
| Owner archives top milestone mid-cycle | New max threshold may be lower → cycle completes earlier on next tap | Stamp count vs new max |
| All milestones archived | Stamps keep growing, no cycle (E6) | Card progress bar meaning unclear |
| Owner adds milestone at 5 stamps when customer has 8 | **No unlock until next stamp** (E2) | “Why didn’t I get it?” support ticket |
| Owner reactivates archived milestone at same threshold | Uniqueness among **active** milestones (R2) | API rejection if conflict |

---

### 8.5 Redemption edge cases

| Scenario | Expected | Watch for |
|----------|----------|-----------|
| Two unlocks for same reward (different cycles) | Customer picks **which** to slide | Wallet ordering clear? |
| Redeem then pull-to-refresh | Unlock gone, stamps unchanged | E12 stale UI |
| Redeem archived reward | Allowed (E5) | Copy says “retired” or not? |
| Slide redeem twice quickly | Second should fail — already claimed | Idempotency / error message |
| Owner purges archived reward with unclaimed unlocks | **Blocked** (R4, R6) | Owner confusion |
| Customer redeems at venue A while viewing venue B card | Unlock is venue-scoped — must be own unlock | Cross-venue ID tampering → 403 |

---

### 8.6 Join & venue status edge cases

| Scenario | Expected |
|----------|----------|
| Join `draft` / `pending_review` brand via API | **Rejected** — not public |
| NFC tap at unpublished brand | **Rejected** at `assertPublic` |
| Landing page `/v/{slug}` for draft brand | **404** / not public |
| Join via **branch** slug | Enrolls on **brand** — same card as primary |
| First NFC tap at published brand (any branch) | Auto-creates card (`nfc_auto_join`), first stamp in same request |
| User joins via QR at branch A, taps NFC at branch B | Same brand card — stamps accumulate |
| Soft-deleted brand | No new stamps (E8); card may still show in wallet |
| Owner adds branch after publish | Branch starts **pending review** — not public until admin approves; shares rewards and wallet once live (B6) |
| Owner sets venue slug | **Auto-generated** on create — not editable in owner UI |
| Owner changes slug after publish | **Blocked** — brand slug locked when `published` |

**Inconsistency to watch:** Marketing says “scan QR to join” but stamps require **NFC** — QR is onboarding only, not stamping.

---

### 8.7 Cycle & wallet mental model

| Scenario | Card screen | Wallet |
|----------|-------------|--------|
| Unclaimed reward from **previous** cycle | Journey shows **current** cycle progress (E4) | Shows ready reward |
| Cycle just completed | Stamps = 0, new cycle number | Prior unlock still redeemable |
| Customer never redeems | Unlocks accumulate across cycles | List grows — ordering? |

**Rewards carousel order (mobile):** Ready/gained rewards first, then next milestone — verify after API changes.

---

### 8.8 Campaign template edge cases

| Template | Edge case |
|----------|-----------|
| **Bring Back** | Brand-new customer with 0 visits — “inactive since join” eligibility |
| **Bring Back** | Customer returns one day before threshold — no bonus |
| **Happy Hour** | Timezone = venue local time? DST boundary |
| **Happy Hour** | `end_time` before `start_time` (overnight window) — verify engine |
| **Quiet Day** | ISO weekday 1=Mon … 7=Sun — owner picks vs customer locale |
| **VIP** | Uses **visit count** and **claimed reward count** — not stamp balance |
| **VIP** | `min_visits: 5` — does NFC auto-join first stamp count? |
| **Multiple campaigns** | Only max multiplier — customer may not know a lower campaign also “applied” |

---

### 8.9 Auth & roles

| Scenario | Expected |
|----------|----------|
| Owner account opens mobile app | Can use as customer at any venue |
| Customer tries owner dashboard | Redirect / 403 |
| `is_admin` | Platform routes only — not owner workspace |
| Legacy `staff` rows in old DB | Product removed staff (O5, E9) — may still exist in data |

---

### 8.10 Out of scope but often assumed

| Assumption | Reality |
|------------|---------|
| Push notifications for campaigns | Toggle exists; delivery **not guaranteed** (N4) |
| Staff confirms redemption | **Removed** — self-serve slide only |
| Stamp via QR scan | **Removed** — NFC only |
| Coupons / % discounts | Not in product |
| Co-owner invites | Not in MVP (N7) |
| Android NFC parity | iOS focus; verify before promising |

---

## 9. Edge-case review checklist

Copy this into QA tickets or pre-release review.

### Stamps & NFC
- [ ] Double-tap same stand within cooldown — second rejected with clear message
- [ ] Double-tap **different** stands quickly — visit cooldown behavior
- [ ] 2× / 3× campaign — correct `added_stamps` and visit count (+1 visit, +N stamps)
- [ ] First-ever tap auto-joins and stamps in one flow
- [ ] Tap at unpublished / draft venue — fails cleanly

### Cycles & milestones
- [ ] Reach max milestone — stamps reset, unlock created
- [ ] Overflow in one tap (E1) — document actual behavior for support
- [ ] Add lower milestone while customer above threshold (E2) — no retro unlock
- [ ] Archive top milestone — cycle threshold changes
- [ ] Archive all milestones (E6) — stamps accumulate without cycle

### Redemption
- [ ] Slide redeem — only that unlock consumed; stamps unchanged
- [ ] Redeem archived reward (E5)
- [ ] Two ready unlocks — redeem one, other remains
- [ ] Repeat redeem same unlock — error

### Campaigns UI
- [ ] Home shows upcoming campaign (`applies_now: false`) with light styling
- [ ] Card shows sticker **only** when multiplier active **now**
- [ ] Multiple matching campaigns — home lists all; card shows winner only

### Venue lifecycle
- [ ] draft → cannot join
- [ ] published → join + NFC work
- [ ] Soft-deleted venue (E8) — stamp blocked, redeem behavior

### Mobile / sync
- [ ] Background refresh failure (E12) — stale ready reward state
- [ ] Polling refresh updates home/wallet/card after stamp and redeem

---

## 10. Where to go deeper

| Topic | Document |
|-------|----------|
| Full rule IDs (L1–Y10, C1–C12) | [BUSINESS_RULES.md](./BUSINESS_RULES.md) |
| Locked engineering decisions | [MVP_DECISIONS.md](./MVP_DECISIONS.md) |
| Campaign UI & API | [CAMPAIGNS.md](./CAMPAIGNS.md) |
| Journeys & positioning | [PRODUCT.md](./PRODUCT.md) |
| Services, schema, routes | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Tests & CI | [TESTING.md](./TESTING.md) |
| Deploy | [deploy/DEPLOY.md](../deploy/DEPLOY.md) |
| Mobile setup | [apps/mobile/README.md](../apps/mobile/README.md) |

---

## 11. Demo & environments

| Item | Value |
|------|-------|
| Local app | http://localhost:8000 |
| Production API | https://flotory.com/api |
| Demo login | `customer@example.com` / `password` (after `app:ensure-local-demo`) |
| Mobile bundle ID | `com.flotory.mobile` |
| NFC tap URL pattern | `https://flotory.com/t/{token}` |

---

## 12. Changelog

| Date | Change |
|------|--------|
| 2026-07-02 | Brand + venue model: branches, shared wallet, per-location NFC analytics, API `brand_id` |
| 2026-06-08 | Initial consolidated reference — business summary, flows, edge-case audit, doc/code mismatch flags |
