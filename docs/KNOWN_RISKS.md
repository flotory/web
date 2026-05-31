# Known Risks

Living register of accepted risks, open edge cases, and planned improvements. Updated as the product evolves.

Purpose: prevent rediscovering the same issues and document intentional trade-offs.

Related: [BUSINESS_RULES.md](./BUSINESS_RULES.md), [MVP_DECISIONS.md](./MVP_DECISIONS.md).

---

## Critical Risks

### Concurrent scan race (duplicate stamps)

| | |
|---|---|
| **Status** | Resolved |
| **Impact** | Two simultaneous scans could award double stamps before duplicate protection saw the first visit. |
| **Planned fix** | Serialize stamp awards on the customer record so duplicate protection runs while the customer row is locked. |
| **Resolution** | Duplicate scan guard now runs inside the stamp transaction after acquiring a row lock. Regression tests added. |

---

## Business Logic Risks

### Stamp overflow on cycle completion

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | If a scan pushes stamp balance past the highest milestone (e.g. 4 + 3 when max is 5), excess stamps are lost when the cycle resets to zero. |
| **Planned fix** | Carry overflow into the next cycle, cap scan amounts in UI, or warn staff when awarding large stamp bundles. |

### Retro-unlock when owner adds milestones

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | Customers who already have enough stamps do not automatically unlock a newly created lower-threshold reward until their next scan. |
| **Planned fix** | Backfill unlocks when milestones are created or reactivated, or document as owner communication requirement. |

### FIFO redemption vs wallet display

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | Wallet may show multiple rows for the same reward (different cycles). Redeeming always consumes the oldest unlock, which may not match the row the customer tapped. |
| **Planned fix** | Explain FIFO in wallet UI, collapse duplicate reward rows with count badge, or accept unlock ID on redeem. |

### Archived rewards still visible in customer wallet

| | |
|---|---|
| **Status** | Open |
| **Impact** | Owner archives a milestone; customers with pending unlocks see the reward but redemption may be blocked. |
| **Planned fix** | Allow redeem of earned unlocks even when archived, or show clear “retired — redeem by [date]” state and filter inactive rewards from wallet. |

### No cycle reset when all milestones archived

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | If every reward is archived, stamps accumulate forever with no cycle completion or new unlocks. |
| **Planned fix** | Owner warning when last active milestone is archived; optional stamp freeze or manual cycle reset. |

### Milestone threshold reuse requires purge

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | Archived milestones still block the same stamp threshold. Owner must purge before creating a new reward at that threshold. |
| **Planned fix** | Align uniqueness to active milestones only, or surface purge requirement clearly in owner UI. |

### Soft-deleted venue with active customers

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | Owner deletes venue; customer records and pending unlocks remain. Customers cannot earn new stamps but may still redeem depending on configuration. |
| **Planned fix** | Read-only card mode, customer notification, auto-expire pending invites, clear messaging on venue landing. |

---

## UX Risks

### Multi-cycle journey vs wallet mismatch

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | Loyalty card journey shows current cycle only. Pending unlocks from prior cycles appear in wallet but may show as “locked” on the card journey. |
| **Planned fix** | Cross-cycle pending indicator on card, or journey badges that reflect earned-but-unclaimed state. |

### Card shows only first pending reward type

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | When multiple reward types are unlocked, card shortcut opens only the first. Customer must use Rewards tab for others. |
| **Planned fix** | Link to full wallet from card, or list all pending types. |

### Ex-staff session after removal

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | Removed staff retain a valid login session. API returns forbidden on scanner; UI may redirect confusingly instead of “access revoked.” |
| **Planned fix** | Token revocation on removal, or dedicated revoked-access screen. |

### Multi-venue owner customer list

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | Owners with multiple venues may see empty customer list if no venue filter is selected. |
| **Planned fix** | Require venue selection or default to active workspace venue. |

### Silent card refresh failures

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | Background poll on loyalty card may fail without user-visible error; stamp count could appear stale. |
| **Planned fix** | Subtle reconnect indicator or retry on tab focus. |

---

## Technical Risks

### Brief deploy downtime

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | Production deploy recreates the app container; users may see ~10–30 seconds of 502 errors. |
| **Planned fix** | Blue-green deploy, health-checked rolling restart, or maintenance page during deploy. |

### Email delivery for staff invitations

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | Invitation flow depends on outbound email (SMTP). Failures delay staff onboarding. |
| **Planned fix** | Resend UX, copy invite link from team page, monitor bounce rates, consider transactional email provider. |

### Local file uploads for images

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | Logos, covers, and reward images stored on server disk. Scaling to multiple app servers requires shared storage or CDN migration. |
| **Planned fix** | Object storage when multi-node or backup requirements grow. |

### SQLite vs MySQL locking semantics in tests

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | Concurrent behavior is tested via serialized lock tests in CI (SQLite). Production uses MySQL row locking. |
| **Planned fix** | Optional MySQL integration job for concurrency-sensitive tests if discrepancies appear. |

### Platform admin bypass

| | |
|---|---|
| **Status** | Accepted |
| **Impact** | `is_admin` users bypass venue membership checks by design. Compromised admin account has broad access. |
| **Planned fix** | Minimize admin accounts; audit admin actions in production. |

---

## Resolved Risks

### Card redeem modal showed “locked” after cycle completion

| | |
|---|---|
| **Status** | Resolved |
| **Impact** | Customer earned reward, stamps reset to zero, card redeem UI incorrectly required current stamp count. |
| **Resolution** | Card page treats wallet entries as unlocked for redeem UI. |

### Staff could accept invites to deleted venues

| | |
|---|---|
| **Status** | Resolved |
| **Impact** | Soft-deleted venue still accepted staff invitations, creating broken memberships. |
| **Resolution** | Invitation accept and preview reject closed venues. |

### Purging archived reward deleted customer unlocks

| | |
|---|---|
| **Status** | Resolved |
| **Impact** | Permanent delete cascaded to reward unlocks; customers lost earned rewards silently. |
| **Resolution** | Purge blocked while unclaimed customer unlocks exist. |

---
