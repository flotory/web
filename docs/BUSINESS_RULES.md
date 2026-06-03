# Business Rules

**Canonical product contract for Flotory.** These rules describe what the system must guarantee for owners, staff, and customers. Implementation lives in Laravel services and API tests; this document does not prescribe code structure.

| Document | Role |
|----------|------|
| **This file** | **Source of truth** for business invariants, exceptions, and out-of-scope |
| [MVP_DECISIONS.md](./MVP_DECISIONS.md) | Locked engineering choices (must not contradict this file) |
| [CAMPAIGNS.md](./CAMPAIGNS.md) | Campaign UI, API paths, and test references |
| [KNOWN_RISKS.md](./KNOWN_RISKS.md) | Living risk register (status updates; rules are defined here first) |
| [PRODUCT.md](./PRODUCT.md) | Journeys and positioning |

When code, UI, or support docs disagree with this file, **fix the product or update this file explicitly** — do not let drift accumulate silently.

---

## Rule index

| ID | Topic | Section |
|----|--------|---------|
| L1–L9 | Loyalty & cycles | [Loyalty](#loyalty-rules) |
| S1–S8 | Stamps & visits | [Stamps](#stamp-rules) |
| R1–R9 | Rewards & milestones | [Rewards](#reward-rules) |
| X1–X8 | Redemption & claim QR | [Redemption](#redemption-rules) |
| C1–C12 | Stamp campaigns | [Campaigns](#campaign-rules) |
| I1–I9 | Staff invitations | [Invitations](#invitation-rules) |
| U1–U7 | Customers | [Customers](#customer-rules) |
| O1–O8 | Ownership & roles | [Ownership](#ownership-rules) |
| Z1–Z8 | Security & authorization | [Security](#security-rules) |
| Y1–Y10 | UX & language | [UX](#ux-rules) |
| E1–E12 | Accepted / open exceptions | [Exceptions](#documented-exceptions) |
| N1–N8 | Not in MVP (business) | [Out of scope](#explicitly-out-of-scope) |

---

## Loyalty rules

**L1.** Customers earn progress through **stamps** toward milestone **rewards**.

**L2.** A reward **unlocks** when the customer’s stamp balance in the **current cycle** reaches that milestone’s threshold.

**L3.** An unlock is unique per **customer**, **reward**, and **cycle**. The same customer may earn the same reward again in a later cycle.

**L4.** An unlock may be **claimed once**. After claim, it is consumed and must not appear as redeemable in the customer wallet.

**L5.** Customers must **never lose rewards they have already earned**. Unclaimed unlocks remain redeemable until claimed or handled under a documented exception ([E5](#e5-archived-rewards-in-wallet), [E8](#e8-soft-deleted-venue)).

**L6.** Unlock and claim state live on the **same record** (`reward_unlocks`). That row is the single source of truth for earned vs used.

**L7.** **Stamps are not deducted** when a reward is claimed. Claiming only marks the unlock as used.

**L8.** When the customer reaches the **highest active milestone** threshold in the current cycle, the cycle **completes**: stamp balance resets to **0**, a new cycle begins, and new unlocks use the new cycle number. **Unclaimed unlocks from prior cycles remain redeemable.**

**L9.** Cycle completion uses the **maximum** `required_stamps` among **active** milestones at the venue. Archiving the top milestone changes which threshold completes a cycle.

---

## Stamp rules

**S1.** **Stamps** are customer-facing (card, journey, “next reward”). **Visits** are owner-facing analytics (one visit row per staff stamp action).

**S2.** Customer UI must say **stamps**, never **visits**.

**S3.** Owner analytics may say **visits**, **customers**, and **loyalty activity** — not “stamps” as the primary counter metric.

**S4.** Staff may award **1–100 stamps** in a single action (presets or custom). The customer receives `base_stamps × campaign_multiplier` (see [Campaigns](#campaign-rules)).

**S5.** Each staff stamp action creates **exactly one** visit record, regardless of how many stamps were awarded.

**S6.** The same customer must not receive duplicate stamp awards from accidental double-scanning within **5 seconds** (same venue, same customer).

**S7.** Stamp awards must be rejected if the customer’s loyalty card belongs to a **different venue** than the scanner’s active venue.

**S8.** If the customer has **unclaimed unlocks** and staff scan the **stamp card** QR (not the claim QR), the API must return a **pending claim warning** so staff can ask for the claim QR instead.

---

## Reward rules

**R1.** Rewards are **milestones** with a required stamp threshold (`required_stamps`).

**R2.** Each **active** milestone threshold is **unique per venue**. Two active rewards cannot share the same stamp requirement.

**R3.** Owners may **archive** rewards (`active = false`) to stop new unlocks at that threshold. Archiving is reversible.

**R4.** Owners may **permanently delete** only **archived** rewards, and only when **no customer holds an unclaimed unlock** for that reward.

**R5.** Archiving or deleting a reward must **never silently delete** unlock rows customers already earned.

**R6.** Purging an archived reward must **not** cascade-delete customer unlocks ([resolved in product — see KNOWN_RISKS](../KNOWN_RISKS.md)).

**R7.** Customers must be able to distinguish: available to earn, unlocked and redeemable, already claimed, or no longer offered.

**R8.** Thresholds are **stamp milestones**, not visit counts.

**R9.** Creating or reactivating a **lower** milestone does **not** automatically unlock it for customers who already have enough stamps until their **next** stamp event ([E2](#e2-retro-unlock-on-new-milestone)).

---

## Redemption rules

**X1.** Customers redeem **at the venue** only: **Rewards → Claim** → show **claim QR** → staff scan on the **same scanner** used for stamps.

**X2.** The **stamp card QR** (customer `qr_token` UUID) must **only** add stamps. It must **never** redeem a reward.

**X3.** The **claim QR** encodes a **single-use redemption session** (not the stamp card UUID). Format: `flotory:redeem:{token}` or `/r/{token}`.

**X4.** A claim session expires after **10 minutes** if not scanned. The customer may request a new session.

**X5.** Redeeming always consumes the **oldest unclaimed unlock** for that **reward** (FIFO across cycles), even if the customer tapped a different wallet row ([E3](#e3-fifo-vs-wallet-row)).

**X6.** Staff redeem via scanner auto-detection of QR type, or dedicated redeem API with the session token.

**X7.** After a successful redeem, the customer claim screen must show clear **success** before returning to the wallet.

**X8.** Stamps, cycle number, and other unlocks are unchanged by redeem except the consumed unlock row (`claimed_at`, `claimed_by`).

---

## Campaign rules

Stamp **campaigns** are operational **multipliers** on stamp awards only. They are not email/SMS marketing, coupons, or discount engines.

**C1.** A venue may have **multiple** campaigns in `draft`, `active`, `paused`, or `ended` state.

**C2.** Only **active** campaigns participate in stamp math. Paused and ended campaigns do not apply.

**C3.** Campaigns **never stack multipliers**. The customer receives `max(multiplier)` across all campaigns that match the customer and schedule at scan time — never the product of multipliers.

**C4.** Example: VIP 2× and Happy Hour 2× and Bring Back 3× all match → customer gets **3×** stamps for that scan (not 12×).

**C5.** `added_stamps = base_stamps × multiplier` where `base_stamps` is what staff selected (1–100) and `multiplier` is from [C3].

**C6.** Matching rules by template:
- **Bring Back:** customer inactive for at least `inactive_days` since last visit (or since join if no visits).
- **Quiet Day:** current weekday (ISO 1–7) in `days_of_week`, and campaign within `starts_at` / `ends_at` when set.
- **Happy Hour:** weekday in `days_of_week`, local time within `start_time`–`end_time`, and within campaign dates when set.
- **VIP:** visit count ≥ `min_visits` **or** claimed reward count ≥ `min_rewards_claimed`.

**C7.** Bring Back and Quiet Day campaigns, when activated, get a bounded run (`duration_days` → `starts_at` / `ends_at`). Happy Hour and VIP may run without an end date until the owner ends them.

**C8.** Campaigns are **not deleted**; owners **end** them for history.

**C9.** `push_enabled` on a campaign does **not** guarantee a push notification in MVP — see [N4](#n4-campaign-push-delivery).

**C10.** Owners configure campaigns via template wizard: **Configure → Review → Activate**.

**C11.** Scanner and customer card surfaces may show the **winning** campaign (highest multiplier) when multiplier > 1.

**C12.** Template catalog is fixed: Bring Back, Quiet Day, Happy Hour, VIP (legacy IDs migrated — see [CAMPAIGNS.md](./CAMPAIGNS.md)).

---

## Invitation rules

**I1.** Staff join via **email invitation links**, not shared passwords or owner-created credentials.

**I2.** Each invitation is scoped to one **venue** and one **email**.

**I3.** Invitations **expire** after **7 days**. Expired invites may be resent (new token).

**I4.** **Accepted** invitations cannot be reused.

**I5.** **Cancelled** invitations cannot be accepted; send a new invitation instead.

**I6.** Only the invited email may accept (signed-in user email must match).

**I7.** **Deleted or soft-deleted venues** cannot accept new invitations.

**I8.** Owners cannot be invited as staff to a venue they already own.

**I9.** Active staff cannot receive a duplicate pending invitation for the same venue.

---

## Customer rules

**U1.** Customers enroll by scanning venue QR or joining via `/v/{slug}` landing.

**U2.** **One loyalty card per (user, venue)**. Re-join returns the existing card.

**U3.** Customers may hold cards at **many venues**.

**U4.** Customers may only view and redeem **their own** cards and unlocks.

**U5.** Customers interact only with venues where they are enrolled.

**U6.** Primary surfaces: **Wallet** (stamp QR, progress), **Rewards** (claim QR only), **Venues** (discover/join), **Settings**.

**U7.** Unclaimed rewards stay visible in **Rewards** until staff scans the claim QR.

---

## Ownership rules

**O1.** Venue roles live in **venue membership** (`venue_users`), not on `users`.

**O2.** `users` has no global owner/staff/customer role column — only `is_admin` for platform operators.

**O3.** One user may be owner at venue A, staff at B, customer at many.

**O4.** Each venue has one or more **owners** via membership.

**O5.** **Staff** may scan and view customer lists; not owner configuration (rewards, team, settings, campaigns).

**O6.** An owner **cannot remove themselves** or demote themselves to staff.

**O7.** **Platform admin** (`is_admin`) bypasses venue membership for support — minimize admin accounts ([E11](#e11-platform-admin-bypass)).

**O8.** Owner-only routes (dashboard config, campaigns, analytics config, team) must be denied to staff at the API layer.

---

## Security rules

**Z1.** **Backend authorization is the source of truth.** Frontend guards are UX only.

**Z2.** Every venue-scoped action verifies membership and role for that venue (`VenueAccess`).

**Z3.** **Cross-venue access is denied** unless the user legitimately belongs to both contexts.

**Z4.** Customers cannot access scanner, reward management, team, or venue settings APIs.

**Z5.** Staff cannot perform owner-only actions via direct API calls.

**Z6.** Owners cannot access venues they do not belong to.

**Z7.** QR tokens and API IDs must not allow cross-user data access.

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

**Y8.** After redeem, customer sees **success** on the claim screen.

**Y9.** When staff scan a stamp card but claim QR was needed, show **pending claim warning** ([S8](#s8-stamp-scan-warning-when-unclaimed-rewards)).

**Y10.** Owner dashboard focuses on **operations** (KPIs, insights, scanner, QR) — not a post-launch setup tutorial.

---

## Documented exceptions

These are **known behaviors**, not bugs, until a rule change is approved and shipped.

| ID | Rule area | Status | Behavior | Target fix |
|----|-----------|--------|----------|------------|
| **E1** | L8 / S4 | Accepted | Stamp overflow lost on cycle reset if scan pushes balance past max milestone in one action | Carry overflow, cap UI, or staff warning |
| **E2** | R9 | Accepted | New lower milestone does not retro-unlock for existing stamp totals | Backfill on create or owner communication |
| **E3** | X5 | Accepted | Wallet row tapped may not be the unlock consumed (FIFO) | UI explain FIFO, collapse rows, or bind redeem to `unlock_id` in UI |
| **E4** | U7 / journey | Accepted | Card journey shows current cycle; older-cycle unlocks mainly in Rewards | Cross-cycle indicators on card |
| **E5** | R3 / U7 | **Open** | Archived reward may still show in wallet; redeem may fail | Allow redeem of earned unlocks or clear “retired” state |
| **E6** | L8 | Accepted | All milestones archived → stamps accumulate, no cycle completion | Owner warning; optional freeze |
| **E7** | R2 | Accepted | Archived threshold still blocks reusing same stamp count until purge | Uniqueness on active only or clearer purge UX |
| **E8** | U1 | Accepted | Soft-deleted venue: no new stamps; redeem may still work | Read-only card, messaging on landing |
| **E9** | O5 | Accepted | Removed staff keep session until logout; API returns 403 | Revoke token on removal |
| **E10** | Analytics | Accepted | Multi-venue owner may see empty customers without venue filter | Default workspace venue |
| **E11** | O7 | Accepted | `is_admin` broad access by design | Audit, few accounts |
| **E12** | U6 | Accepted | Background card refresh may fail silently | Reconnect / retry indicator |

Detail and history: [KNOWN_RISKS.md](./KNOWN_RISKS.md). Resolving an exception requires updating **this table** and the risk doc together.

---

## Explicitly out of scope

Business capabilities **not** offered in MVP unless this section is updated:

| ID | Capability |
|----|------------|
| **N1** | Subscriptions / billing |
| **N2** | Visit-based or spend-based milestones (stamps only) |
| **N3** | POS / payment integrations |
| **N4** | Campaign **push** delivery (toggle may exist; delivery is not guaranteed) |
| **N5** | Email/SMS **marketing** campaigns (stamp multipliers only) |
| **N6** | Coupons, discount engines, A/B tests |
| **N7** | Co-owner invitations (staff only) |
| **N8** | Global `owner` / `staff` role on user accounts |

Engineering-only exclusions: [MVP_DECISIONS.md](./MVP_DECISIONS.md).

---

## Verification

Rules are enforced by:

| Layer | Responsibility |
|-------|----------------|
| `LoyaltyStampService` | L1–L9, S4–S8, R1–R2 unlocks, X5–X8 redeem path |
| `CampaignEngine` / `CampaignService` | C1–C7, C11 |
| `VenueStaffInvitationService` | I1–I9 |
| `VenueAccess` + policies | O1–O8, Z1–Z6 |
| Feature tests | `tests/Feature/*`, `tests/Unit/CampaignServiceTest.php` |

When adding a feature, add or update a rule here **before** merge, then add a test that proves the invariant.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-03 | Full rewrite: campaigns, redemption, exceptions table, rule IDs, canonical status |
