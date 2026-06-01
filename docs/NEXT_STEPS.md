# What to Do Next

This doc turns [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) into actionable work for the current stage. Phase 1 loyalty is built; the milestone is **real usage**, not more features.

---

## North star (next 4–8 weeks)

```
First pilot venue → 30+ customers joined → 3+ redemptions → owner keeps using it weekly
```

If that loop works, you have product–market signal. If not, fix UX/ops before Phase 1.5 CRM.

---

## Priority 1 — Run the pilot (business)

**How:** Follow [PILOT_CAFE.md](./PILOT_CAFE.md).

| Step | Action | Time |
|------|--------|------|
| 1 | Pre-flight checklist on production (`flotory.com`) | 30 min |
| 2 | Outreach to 3 local cafés; book one demo | 1 week |
| 3 | Onboarding day: owner + staff training | 60 min |
| 4 | Weekly metrics: joins, repeat scans, unlocks, redeems | 15 min/week |

**What it brings:**

- Proof staff and customers complete the full loop in the wild
- Real friction list (QR placement, redeem confusion, email delivery)
- Optional case study and first paying customer conversation

**Do not block on:** demo-scale seed data, new dashboard widgets, or duplicate-milestone UX.

---

## Priority 2 — Ship only pilot-blocking fixes (engineering)

Fix issues that stop the pilot checklist. Examples from [KNOWN_RISKS.md](./KNOWN_RISKS.md):

| If pilot hits… | Likely fix |
|----------------|------------|
| Staff double-stamps under load | Serialize stamp award on customer row |
| Owner archives reward; customer can’t redeem | Allow redeem for earned unlocks on archived milestones |
| Invite email never arrives | SMTP/DNS on production; resend + copy link on Team page |
| Owner confused after archiving | Toast + toolbar copy (shipped); clarify “paused milestones” chips |

**How:** Reproduce with owner@example.com on staging/prod → test → `php artisan test` → `./deploy/push-prod.sh`.

**What it brings:** Fewer support fires during the 30-day pilot.

---

## Priority 3 — Phase 1.5 retention foundation (product, after pilot starts)

**Status in roadmap:** Planned — not started.

**What to build (smallest slice):**

- On **Customers** list: `last_visit_at`, `visit_count`, `joined_at`, `rewards_claimed_count`
- Sort/filter: “active last 14 days” vs “inactive 30+ days”

**How:**

1. Add columns or computed fields from `visits` + `reward_unlocks` (no new tables required for v1).
2. Expose in `GET /api/venues/{id}/customers` (or extend existing CRM endpoint).
3. Owner table UI on `/customers`.

**What it brings:**

- Owners answer: *“Who should I try to bring back?”*
- Bridge between “loyalty toy” and “retention tool”
- Sets up Phase 4 campaigns (win-back) with a real audience list

**Defer until:** At least one venue has 2+ weeks of real visits.

---

## What not to build yet

| Tempting idea | Why wait |
|---------------|----------|
| Campaigns / double-stamp days | No owner asking for it without basic customer list |
| Push / SMS | Email + counter QR enough for pilot |
| POS integration | Explicitly out of pilot scope |
| AI recommendations | Needs months of data |
| Multi-location rollup dashboard | Second venue problem |

---

## Engineering hygiene (each release)

```bash
# Local (Docker)
docker compose exec app php artisan test
npm run build

# Production
git commit -m "…"
./deploy/push-prod.sh
```

- **Tests:** Feature tests for rewards, scans, redemptions, migrations (`tests/Feature/`).
- **Docs:** Update [MVP_DECISIONS.md](./MVP_DECISIONS.md) when UX rules change; [KNOWN_RISKS.md](./KNOWN_RISKS.md) when pilot finds new edge cases.
- **Deploy:** Never `migrate:fresh` on production except intentional resets; normal path is `migrate --force` in `deploy/deploy.sh`.

---

## Decision lens

Before any task, ask:

1. Does this help **first venue → first redemption** this month?
2. Can the owner/staff **understand it without training**?
3. Can we **ship in days**, not weeks?

If all three are no, park it in the roadmap and return to the pilot.
