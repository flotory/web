# Pilot Café Playbook

How to get the **first real café** using Flotory in production. This is a business checklist, not a technical setup guide (see [README.md](../README.md) for dev/deploy).

---

## Who to target first

Ideal pilot venue:

- Independent café or bakery (1–2 locations)
- Owner present daily and willing to try new tools
- Already uses Instagram or a simple loyalty habit (paper cards welcome)
- 20–100 transactions per day (enough signal, not enterprise complexity)

Avoid for first pilot: chains with IT procurement, venues without smartphone-friendly staff, or businesses needing POS integration on day one.

---

## Pre-outreach checklist

Before inviting a café, confirm on [flotory.com](https://flotory.com):

- [ ] Owner can sign up, complete onboarding, and create at least one milestone reward
- [ ] QR download / print asset works for counter display
- [ ] Staff invitation email delivers (check spam; verify SMTP in production)
- [ ] Scanner flow: scan customer QR → stamp → customer sees update on card
- [ ] Redeem flow: customer swipes in wallet → staff sees success
- [ ] You can demo end-to-end in under 5 minutes

---

## 30-day pilot offer (template)

**Subject:** Free digital stamp card for [Café Name] — 30-day pilot

**Body:**

> Hi [Name],
>
> I built **Flotory** — a simple digital stamp card for independent cafés. Customers scan a QR at your counter, collect stamps on their phone, and redeem rewards when they hit a milestone (e.g. 5 stamps = free coffee).
>
> I’m looking for **one local café** to run a free 30-day pilot. I’ll help you set up rewards, print the QR, and train your team (about 15 minutes).
>
> **What you get:** digital loyalty card, staff scanner, basic visit analytics — no hardware, no POS integration needed.
>
> **What I need:** honest feedback after 2 weeks and permission to use anonymized visit counts as a case study (optional).
>
> Interested in a 15-minute demo this week?
>
> [Your name]

---

## Onboarding day (60 minutes)

### With the owner (30 min)

1. Owner creates account → onboarding (venue name, logo, one reward milestone)
2. Set realistic first milestone (e.g. **5 stamps = free drink**) — not too high
3. Download / print QR → place at register and on a table tent
4. Owner invites 1–2 staff via email from Team page
5. Walk through dashboard: visits today, customers joined

### With staff (15 min)

1. Staff accepts invite → opens Scanner on phone
2. Practice scan: owner’s personal phone as “customer” (join via QR, then scan)
3. Show +1 vs +2 stamps; explain 5-second double-scan protection
4. Practice redeem: customer swipes in Rewards tab

### With customers (ongoing)

1. Script at counter: *“Want a free coffee after 5 visits? Scan this — takes 10 seconds.”*
2. First 10 customers: owner/staff watches join flow and fixes friction immediately

---

## Success metrics (30 days)

Track weekly:

| Metric | Target signal |
|--------|----------------|
| Customers joined | ≥ 30 unique cards |
| Repeat scans | ≥ 40% of joined customers scanned twice+ |
| Rewards unlocked | ≥ 5 total |
| Rewards redeemed | ≥ 3 total (proves full loop) |
| Staff scans without owner help | ≥ 80% of scans by staff |

If joins are low → QR placement or counter script problem.  
If scans but no repeats → milestone too high or reward not compelling.  
If unlocks but no redeems → redeem UX or staff training gap.

---

## Common blockers and fixes

| Blocker | Fix |
|---------|-----|
| Staff didn’t get invite email | Resend from Team; copy invite link if available |
| Customer confused after join | Show Card tab; point to stamp count |
| Owner wants POS integration | Defer — MVP is QR at counter only |
| Owner wants multiple reward tiers day one | Start with one milestone; add second after first week |
| Wi‑Fi dead zone at counter | Staff use mobile data; QR works offline for customer join if page cached |

---

## After pilot

1. **15-minute retrospective** with owner: what worked, what confused staff/customers
2. Update [KNOWN_RISKS.md](./KNOWN_RISKS.md) with any new real-world findings
3. Decide: paid plan, referral to another venue, or product changes before next pilot
4. Optional: short testimonial + photo of QR at counter for landing page

---

## Local outreach ideas

- Visit 3 cafés you already frequent; ask for the owner during quiet hours (2–4 pm)
- Post in local small-business Facebook groups (offer pilot, not sales pitch)
- Partner with a roaster or bakery supplier who knows independent café owners
- Offer to set up free for the café where you already buy coffee daily

**Goal:** one venue live within 2 weeks of starting outreach, not perfection.
