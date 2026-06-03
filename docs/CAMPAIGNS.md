# Campaigns — product plan (draft)

Planning only. No campaign API or owner page is shipped yet. Customer communication is **push via the mobile app**, not email or SMS.

---

## Problem

Owners can see inactive customers on `/customers`, but they cannot **act** on that list yet. Campaigns turn retention insight into a simple promotion with optional push when the app supports it.

---

## Five templates (proposed defaults)


| #   | Template           | Who it targets                               | Stamp rule (MVP)                     | Push message idea                            |
| --- | ------------------ | -------------------------------------------- | ------------------------------------ | -------------------------------------------- |
| 1   | **Happy hour**     | Everyone visiting in a time window           | 2× stamps, e.g. Mon–Fri 3–6pm        | “Double stamps now until 6pm”                |
| 2   | **Birthday week**  | Customer with birthday on profile            | 2× stamps for 7 days around birthday | “It’s your birthday week at {venue}”         |
| 3   | **VIP regulars**   | Guests with ≥5 visits or ≥1 redemption       | 2× stamps while active               | “Thanks for being a regular — double stamps” |
| 4   | **Slow day boost** | Everyone on a quiet weekday                  | 2× stamps every Monday               | “Double stamps every Monday”                 |
| 5   | **Win-back**       | Inactive 30+ days (same as Customers filter) | 2× stamps for 14 days after launch   | “We miss you — double stamps for two weeks”  |


**Open product questions** (decide before build):

- Can VIP and win-back overlap for one guest (take highest multiplier vs stack)?
- Birthday week without birthday on file — skip guest or prompt in app?
- Happy hour: venue timezone = venue address or owner device?

---

## MVP rules (recommended)


| Rule                                               | Why                                    |
| -------------------------------------------------- | -------------------------------------- |
| **One active** stamp-multiplier campaign per venue | Avoid conflicting rules at scanner     |
| Draft → Activate → Pause / End                     | Owner control without deleting history |
| Stamp rules in **backend** (`LoyaltyStampService`) | Never trust Vue for multipliers        |
| Push is **opt-in** in customer app settings        | Compliance + fewer uninstalls          |
| No email / SMS in v1                               | Mobile app is the customer surface     |


---

## Build order (do not skip)

### 1. Plan & docs ✓ (this file)

Align templates, push copy, and MVP rules. Update roadmap.

### 2. Owner web — Campaigns page (no stamp math yet)

- Route `/campaigns` in owner nav
- Grid of 5 templates → creates **draft** campaign
- List: activate / pause / end
- Banner: “Push sends when mobile notifications ship”

### 3. Stamp engine

- `CampaignService::multiplierFor(Customer, Venue, at: now)`
- Hook in `addStamp`; staff scanner shows active promo name
- Feature tests per template

### 4. Mobile push

- Store Expo push token on user
- On activate: segment + send (template-specific)
- Deep link to card / rewards
- Customer settings: notifications on/off

### 5. Measurement

- Visits during campaign vs prior period on dashboard
- Later: Phase 6 analytics

---

## Owner UX sketch

```text
Campaigns
├── [Live] Happy hour double stamps        [End]
├── Start from template (5 cards)
└── Your campaigns
    ├── Win-back (draft)     [Activate]
    └── VIP regulars (ended)
```

Insights on dashboard: “12 inactive — consider Win-back template” → link to Campaigns.

---

## Data model (when we build)

```text
campaigns
  venue_id, template_id, name, status
  starts_at, ends_at, config (json), push_enabled
  activated_at, created_by
```

`config` examples:

- `happy_hour`: `{ stamp_multiplier: 2, days_of_week: [1-5], start_time, end_time }`
- `loyal_vip`: `{ stamp_multiplier: 2, min_visits: 5, min_rewards_claimed: 1 }`
- `win_back`: `{ stamp_multiplier: 2, inactive_days: 30, duration_days: 14 }`

---

## What we are not building in v1

- Email campaigns or CSV export for Mailchimp
- SMS / WhatsApp
- A/B tests, coupon codes, or % off bills (stamps only)
- Multiple simultaneous active campaigns
- AI-generated copy

---

## Success criteria

1. Owner creates and activates a template in under 2 minutes
2. Eligible customers earn 2× stamps when rules say so (verified in tests)
3. After push ships: measurable visit bump during win-back / happy hour windows

---

## Related docs

- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) — Phases 4–5
- [MVP_DECISIONS.md](./MVP_DECISIONS.md) — campaigns still require explicit approval before code
- [ARCHITECTURE.md](./ARCHITECTURE.md) — stamp/claim flows

