# Business Rules

**Canonical product contract for Flotory.** These rules describe what the system must guarantee for owners and customers. Implementation lives in Laravel services and API tests; this document does not prescribe code structure.

**2026 pivot:** Staff scanner, claim QR, team invites, and staff role are **removed**. Stamps are **NFC-only**; rewards redeem via **slide-to-redeem** in the customer app.


| Document                               | Role                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------- |
| **This file**                          | **Source of truth** for business invariants, exceptions, and out-of-scope |
| [MVP_DECISIONS.md](./MVP_DECISIONS.md) | Locked engineering choices (must not contradict this file)                |
| [CAMPAIGNS.md](./CAMPAIGNS.md)         | Campaign UI, API paths, and test references                               |
| [PRODUCT.md](./PRODUCT.md)             | Journeys and positioning                                                  |
| [PROJECT_BUSINESS_REFERENCE.md](./PROJECT_BUSINESS_REFERENCE.md) | One-page overview, flows, edge-case audit checklist |


When code, UI, or support docs disagree with this file, **fix the product or update this file explicitly** — do not let drift accumulate silently.

---

## Rule index


| ID     | Topic                      | Section                                  |
| ------ | -------------------------- | ---------------------------------------- |
| L1–L9  | Loyalty & cycles           | [Loyalty](#loyalty-rules)                |
| S1–S8  | Stamps & visits            | [Stamps](#stamp-rules)                   |
| R1–R9  | Rewards & milestones       | [Rewards](#reward-rules)                 |
| X1–X6  | Redemption (self-serve)    | [Redemption](#redemption-rules)          |
| C1–C12 | Stamp campaigns            | [Campaigns](#campaign-rules)             |
| U1–U7  | Customers                  | [Customers](#customer-rules)             |
| O1–O8  | Ownership & roles          | [Ownership](#ownership-rules)            |
| Z1–Z8  | Security & authorization   | [Security](#security-rules)              |
| Y1–Y10 | UX & language              | [UX](#ux-rules)                          |
| E1–E12 | Accepted / open exceptions | [Exceptions](#documented-exceptions)     |
| N1–N8  | Not in MVP (business)      | [Out of scope](#explicitly-out-of-scope) |


---

## Loyalty rules

**L1.** Customers earn progress through **stamps** toward milestone **rewards**.

**L2.** A reward **unlocks** when the customer’s stamp balance in the **current cycle** reaches that milestone’s threshold.

**L3.** An unlock is unique per **customer**, **reward**, and **cycle**. The same customer may earn the same reward again in a later cycle.

**L4.** An unlock may be **claimed once**. After claim, it is consumed and must not appear as redeemable in the customer wallet.

**L5.** Customers must **never lose rewards they have already earned**. Unclaimed unlocks remain redeemable until claimed or handled under a documented exception ([E5](#e5-archived-rewards-in-wallet), [E8](#e8-soft-deleted-venue)).

**L6.** Unlock and claim state live on the **same record** (`reward_unlocks`). That row is the single source of truth for earned vs used.

**L7.** **Stamps are not deducted** when a reward is claimed. Claiming only marks the unlock as used.

**L8.** When the customer reaches the **highest active milestone** threshold in the current cycle, the cycle **completes**: stamp balance resets to **0**, or **carries overflow** into the next cycle when a single award exceeded the milestone (e.g. 9 + 3 at max 10 → cycle completes, next cycle starts at **2**). Multiple completions in one award are allowed when the award spans more than one full cycle. **Unclaimed unlocks from prior cycles remain redeemable.**

**L9.** Cycle completion uses the **maximum** `required_stamps` among **active** milestones at the venue. Archiving the top milestone changes which threshold completes a cycle.

---

## Stamp rules

**S1.** **Stamps** are customer-facing (card, journey, “next reward”). **Visits** are owner-facing analytics (one visit row per stamp award).

**S2.** Customer UI must say **stamps**, never **visits**.

**S3.** Owner analytics may say **visits**, **customers**, and **loyalty activity** — not “stamps” as the primary counter metric.

**S4.** Stamps are awarded **only via NFC** (`POST /api/nfc/t/{token}/stamp` or in-app NFC read on the Stamp tab). Each successful tap awards **1 stamp** (campaign multipliers may apply — see [Campaigns](#campaign-rules)).

**S5.** Each stamp award creates **exactly one** visit record.

**S6.** The same customer must not receive duplicate stamp awards from accidental double-tap within **3 seconds** (same venue, same customer). NFC stands also enforce a **3-second** per-tag debounce.

**S7.** NFC stamp stands are venue-scoped; a tap must only award at the stand’s venue.

---

## Reward rules

**R1.** Rewards are **milestones** with a required stamp threshold (`required_stamps`).

**R2.** Each **active** milestone threshold is **unique per venue**. Two active rewards cannot share the same stamp requirement.

**R3.** Owners may **archive** rewards (`active = false`) to stop new unlocks at that threshold. Archiving is reversible.

**R4.** Owners may **permanently delete** only **archived** rewards, and only when **no customer holds an unclaimed unlock** for that reward.

**R5.** Archiving or deleting a reward must **never silently delete** unlock rows customers already earned.

**R6.** Purging an archived reward must **not** cascade-delete customer unlocks (enforced in API; purge blocked while unclaimed unlocks exist).

**R7.** Customers must be able to distinguish: available to earn, unlocked and redeemable, already claimed, or no longer offered.

**R8.** Thresholds are **stamp milestones**, not visit counts.

**R9.** Creating or reactivating a **lower** milestone does **not** automatically unlock it for customers who already have enough stamps until their **next** stamp event ([E2](#e2-retro-unlock-on-new-milestone)).

---

## Redemption rules

**X1.** Customers redeem **in the app** by sliding **Slide to redeem** on a ready reward (`POST /api/customer/rewards/unlocks/{unlock}/redeem`). No staff scan or claim QR.

**X2.** Redeeming consumes the **specific unlock** the customer slid on (not FIFO across wallet rows).

**X3.** After a successful redeem, the UI must show clear **success** and refresh wallet/card state.

**X4.** Stamps, cycle number, and other unlocks are unchanged by redeem except the consumed unlock row (`claimed_at`, `claimed_by`).

**X5.** Claim QR, redemption sessions, staff scanner, and universal stamp QR flows are **removed**.

---

## Campaign rules

Stamp **campaigns** are operational **multipliers** on stamp awards only. They are not email/SMS marketing, coupons, or discount engines.

**C1.** A venue may have **multiple** campaigns in `draft`, `active`, `paused`, or `ended` state.

**C2.** Only **active** campaigns participate in stamp math. Paused and ended campaigns do not apply.

**C3.** Campaigns **never stack multipliers**. The customer receives `max(multiplier)` across all campaigns that match the customer and schedule at scan time — never the product of multipliers.

**C4.** Example: VIP 2× and Happy Hour 2× and Bring Back 3× all match → customer gets **3×** stamps for that scan (not 12×).

**C5.** `added_stamps = base_stamps × multiplier` where `base_stamps` is **1** per NFC tap and `multiplier` is from [C3].

**C6.** Matching rules by template:

- **Bring Back:** customer inactive for at least `inactive_days` since last visit (or since join if no visits).
- **Quiet Day:** current weekday (ISO 1–7) in `days_of_week`, and campaign within `starts_at` / `ends_at` when set.
- **Happy Hour:** weekday in `days_of_week`, local time within `start_time`–`end_time`, and within campaign dates when set.
- **VIP:** lifetime stamps earned at the venue ≥ `min_lifetime_stamps` **or** claimed reward count ≥ `min_rewards_claimed`. The current tap counts toward lifetime stamps when eligibility is evaluated.

**C7.** Bring Back and Quiet Day campaigns, when activated, get a bounded run (`duration_days` → `starts_at` / `ends_at`). Happy Hour and VIP may run without an end date until the owner ends them.

**C8.** Campaigns are **not deleted**; owners **end** them for history.

**C9.** `push_enabled` on a campaign does **not** guarantee a push notification in MVP — see [N4](#n4-campaign-push-delivery).

**C10.** Owners configure campaigns via template wizard: **Configure → Review → Activate**.

**C11.** Customer card surfaces may show the **winning** campaign (highest multiplier) when multiplier > 1.

**C12.** Template catalog is fixed: Bring Back, Quiet Day, Happy Hour, VIP (legacy IDs migrated — see [CAMPAIGNS.md](./CAMPAIGNS.md)).

---

## Customer rules

**U1.** Customers enroll by joining via `/v/{slug}` landing or their first NFC stamp at a venue. **Public join requires the venue to be `published`.**

**U2.** **One loyalty card per (user, venue)**. Re-join returns the existing card.

**U3.** Customers may hold cards at **many venues**.

**U4.** Customers may only view and redeem **their own** cards and unlocks.

**U5.** Customers interact only with venues where they are enrolled.

**U6.** Primary surfaces (**mobile app**): **Stamp** tab (NFC), **Wallet** (progress + slide redeem), **Home**, **Venues** (find/join published venues), **Profile/Settings**. Web `/wallet`, `/my-qr`, etc. redirect to `/app`.

**U7.** Unclaimed rewards stay visible in **Wallet** and on cafe cards until the customer slides to redeem.

---

## Ownership rules

**O1.** Venue roles live in **venue membership** (`venue_users`), not on `users`.

**O2.** `users` has no global owner/staff/customer role column — only `is_admin` for platform operators.

**O3.** One user may be **owner** at venue A and **customer** at many venues.

**O4.** Each venue has one or more **owners** via membership.

**O5.** **Staff role, team invites, and staff scanner are removed** (2026 pivot). Only `owner` is a supported venue team role.

**O6.** An owner **cannot remove themselves** as the sole owner without transferring ownership (future) or deleting the venue.

**O7.** **Platform admin** (`is_admin`) bypasses venue membership for admin routes — minimize admin accounts ([E11](#e11-platform-admin-bypass)).

**O8.** Owner-only routes (dashboard, campaigns, analytics, rewards CRUD, settings) must return **403** for users without `owner` membership at that venue.

**O9.** Public self-serve owner registration (`/register?intent=owner`, `POST /api/venues` without invitation) is **blocked**. Prospects use **Book a demo** or **Contact us**.

**O10.** Sales-led onboarding: platform admin sends an **owner invitation** (email only). Owner accepts via `/register?invite=…`, then may create **one** venue while `may_create_venue` is true (accepted invitation, no owner membership yet).

**O11.** Users with an **accepted** invitation but no venue yet may log in on the **web** (email or Google with owner intent) and are routed to venue setup — not the mobile app page.

---

## Security rules

**Z1.** **Backend authorization is the source of truth.** Frontend guards are UX only.

**Z2.** Every venue-scoped action verifies membership and role for that venue (`VenueAccess`).

**Z3.** **Cross-venue access is denied** unless the user legitimately belongs to both contexts.

**Z4.** Customers cannot access reward management or venue settings APIs.

**Z6.** Owners cannot access venues they do not belong to.

**Z7.** API IDs and NFC tag tokens must not allow cross-user data access.

**Z8.** Dangerous operations (delete venue, purge reward, remove member) require explicit UI confirmation.

---

## UX rules

**Y1.** Form saves: **Save → Saving… → Saved ✓**.

**Y2.** Cross-page feedback: **toasts**; field errors: **inline validation**.

**Y3.** Dangerous actions require **confirmation** before proceeding.

**Y4.** Empty states explain what happened and the **next step**.

**Y5.** Owner **Rewards** uses the same **5-column stamp grid** as guests; select a card, then **Edit** / **Archive** in the toolbar below.

**Y6.** Error states offer **retry** or recovery where possible.

**Y7.** Customer copy: **stamps**, **rewards**, **progress**. Owner analytics: **visits**, **customers**, **loyalty activity**.

**Y8.** After redeem, customer sees **success** inline on the reward card.

**Y9.** Owner dashboard focuses on **operations** (KPIs, insights, NFC stand setup, mobile-app CTA) — not a post-launch setup tutorial.

---

## Documented exceptions

These are **known behaviors**, not bugs, until a rule change is approved and shipped.


| ID      | Rule area    | Status   | Behavior                                                                                   | Target fix                                                          |
| ------- | ------------ | -------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| **E1**  | L8 / S4      | Resolved | Overflow stamps carry into the next cycle (and multiple cycles complete in one award when needed) | —                                                                   |
| **E2**  | R9           | Resolved | New milestone unlocks on the customer’s **next stamp event** only — not on card/wallet/home API load | —                                                                   |
| **E3**  | X2           | Resolved | Redeem binds to specific `unlock_id` via slide-to-redeem                                   | —                                                                   |
| **E4**  | U7 / journey | Accepted | Card journey shows current cycle; older-cycle unlocks mainly in Rewards                    | Cross-cycle indicators on card                                      |
| **E5**  | R3 / U7      | Resolved | Earned unlocks remain redeemable after owner archives the milestone                        | Wallet may show “retired” copy; slide redeem still works            |
| **E6**  | L8           | Accepted | All milestones archived → stamps accumulate, no cycle completion                           | Owner warning; optional freeze                                      |
| **E7**  | R2           | Accepted | Archived threshold still blocks reusing same stamp count until purge                       | Uniqueness on active only or clearer purge UX                       |
| **E8**  | U1           | Accepted | Soft-deleted venue: no new stamps; redeem may still work                                   | Read-only card, messaging on landing                                |
| **E9**  | O5           | N/A      | Staff role removed from product                                                            | —                                                                   |
| **E10** | Analytics    | Accepted | Multi-venue owner may see empty customers without venue filter                             | Default workspace venue                                             |
| **E11** | O7           | Accepted | `is_admin` broad access by design                                                          | Audit, few accounts                                                 |
| **E12** | U6           | Accepted | Background card refresh may fail silently                                                  | Reconnect / retry indicator                                         |


Resolving an exception requires updating **this table** and shipping the fix or an explicit owner/customer UX change.

---

## Explicitly out of scope

Business capabilities **not** offered in MVP unless this section is updated:


| ID     | Capability                                                                |
| ------ | ------------------------------------------------------------------------- |
| **N1** | Subscriptions / billing                                                   |
| **N2** | Visit-based or spend-based milestones (stamps only)                       |
| **N3** | POS / payment integrations                                                |
| **N4** | Campaign **push** delivery (toggle may exist; delivery is not guaranteed) |
| **N5** | Email/SMS **marketing** campaigns (stamp multipliers only)                |
| **N6** | Coupons, discount engines, A/B tests                                      |
| **N7** | Co-owner invitations                                                      |
| **N8** | Global `owner` / `staff` role on user accounts                            |
| **N9** | Staff scanner, claim QR, team invites, stamp QR                             |


Engineering-only exclusions: [MVP_DECISIONS.md](./MVP_DECISIONS.md).

---

## Verification

Rules are enforced by:


| Layer                                | Responsibility                                          |
| ------------------------------------ | ------------------------------------------------------- |
| `LoyaltyStampService`                | L1–L9, S4–S7, R unlocks, X1–X4 redeem path              |
| `NfcStampService`                    | S4, S6–S7, NFC rate limits                              |
| `CampaignEngine` / `CampaignService` | C1–C7, C11                                              |
| `VenueAccess` + policies             | O1–O8, Z1–Z6                                            |
| Feature tests                        | `tests/Feature/`*, `tests/Unit/CampaignServiceTest.php` — see [TESTING.md](./TESTING.md) |


When adding a feature, add or update a rule here **before** merge, then add a test that proves the invariant.

---

## Changelog


| Date       | Change                                                                            |
| ---------- | --------------------------------------------------------------------------------- |
| 2026-06-03 | Full rewrite: campaigns, redemption, exceptions table, rule IDs, canonical status |
| 2026-06-08 | Pivot: NFC-only stamps, slide-to-redeem, staff/scanner/claim QR removed; consolidated schema |
| 2026-06-08 | L8 overflow carry; E1/E2 resolved; unlocks on stamp only (no API read sync) |


