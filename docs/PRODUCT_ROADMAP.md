# Flotory Product Roadmap

> **v2 (shipped):** Universal My QR — see [V2.md](./V2.md). Migration phases 1–3 complete (API, customer UI, legacy card QR off by default).

## Vision

Flotory helps local hospitality businesses increase customer retention and build stronger customer relationships through loyalty, rewards, communication, and customer insights.

The long-term goal is to evolve from a loyalty platform into a customer growth platform for restaurants, cafés, bakeries, and bars.

---

## Phase 1 — Digital Loyalty Foundation

**Status:** 90–95% Complete

**Goal:** Create daily usage for both customers and venues.

**Features:**

- QR-based customer joining
- Digital loyalty cards
- Stamp collection
- Reward milestones
- Reward redemption
- Staff scanner
- Staff invitation system
- Multi-venue support
- Real-time updates
- Venue branding
- Customer wallet
- Owner operational dashboard
- Venue address on public landing + Open in Maps (no Maps API)

**Success Metric:** A venue successfully runs its loyalty program and customers regularly collect stamps.

**Current Focus:**

- **First pilot venue** — see [PILOT_CAFE.md](./PILOT_CAFE.md)
- End-to-end proof: join → stamp → unlock → claim QR → redeem
- Owner `/rewards` polish (5-column grid, click-to-edit toolbar, toasts) — shipped
- Pilot-blocking fixes only (email, redeem edge cases, scanner reliability)
- Defer Phase 1.5 until one venue has 2+ weeks of live data

---

## Phase 1.5 — Retention Foundation

**Status:** Shipped (MVP)

**Goal:** Help owners bring customers back.

**Features:**

- Customer last visit date
- Total visits
- Total rewards claimed
- Joined date
- Simple customer activity overview

**Success Metric:** Owners can identify active and inactive customers.

**Why:** Before advanced CRM features, owners need basic customer visibility.

---

## Phase 2 — Customer Profiles

**Status:** Shipped (MVP — profile page, visit/reward history, notes, birthday)

**Goal:** Create lightweight customer CRM capabilities.

**Features:**

- Customer profile page
- Visit history
- Reward history
- Loyalty activity timeline
- Customer notes
- Birthday tracking

**Success Metric:** Owners can understand customer behavior beyond stamps.

---

## Phase 3 — Customer Timeline

**Status:** Shipped (MVP — unified activity timeline on customer profile)

**Goal:** Provide a complete customer relationship history.

**Features:**

- Timeline of visits
- Timeline of rewards
- Timeline of redemptions
- Staff interactions
- Loyalty milestones

**Example:**

Customer:

- Joined 6 months ago
- Visited 18 times
- Redeemed 3 rewards
- Last visit 4 days ago

**Success Metric:** Owners can understand customer journeys.

---

## Phase 4 — Campaigns & Promotions

**Status:** MVP shipped (stamp rules + owner UI; push analytics next) — see [CAMPAIGNS.md](./CAMPAIGNS.md)

**Goal:** Actively increase customer retention with simple stamp promotions.

**MVP templates (owner web):**

1. Happy hour (time window, 2× stamps)
2. Birthday week (2× during birthday week)
3. VIP regulars (2× for loyal guests)
4. Slow day boost (e.g. Monday 2×)
5. Win-back (2× for inactive 30d+ guests)

**Rules (MVP):** Multiple active stamp campaigns per venue; `multiplier = max(matching)` — see [CAMPAIGNS.md](./CAMPAIGNS.md). Push delivery remains a separate slice.

**Success Metric:** Measurable increase in repeat visits during promo windows.

---

## Phase 5 — Customer Communication

**Status:** Planned (mobile-first)

**Goal:** Notify customers about loyalty progress and campaigns.

**Primary channel:** Push notifications in the **mobile app** (not email or phone in MVP).

**Deferred:** Email blasts, SMS, WhatsApp.

**Examples:**

- Happy hour started at your café
- Birthday week — extra stamps
- We miss you (win-back)
- Reward ready to claim

**Success Metric:** Customers return after a push, measured by visits (not open rates alone).

---

## Phase 6 — Smart Analytics

**Status:** Future

**Goal:** Show business impact.

**Metrics:**

- Repeat customer rate
- Customer retention
- Most redeemed rewards
- Active customers
- Inactive customers
- Visit frequency
- Campaign performance

**Success Metric:** Owners make business decisions using Flotory.

---

## Phase 7 — Multi-Location Management

**Status:** Future

**Goal:** Support chains and franchises.

**Features:**

- Multi-location dashboard
- Shared rewards
- Branch analytics
- Branch comparison
- Centralized customer management

**Success Metric:** Multi-location businesses can operate entirely through Flotory.

---

## Phase 8 — Staff Management

**Status:** Future

**Goal:** Improve operational visibility.

**Features:**

- Staff permissions
- Staff activity logs
- Redemption tracking
- Scanner analytics
- Staff performance reports

**Success Metric:** Owners can audit loyalty operations.

---

## Phase 9 — Ordering & POS Integrations

**Status:** Long-Term

**Goal:** Connect loyalty with transactions.

**Features:**

- POS integrations
- Automatic stamp assignment
- Online ordering integrations
- Pickup orders
- Delivery rewards

**Success Metric:** Rewards become fully automated.

---

## Phase 10 — Customer Growth Platform

**Status:** Long-Term

**Goal:** Become the customer growth system for hospitality businesses.

**Features:**

- Advanced segmentation
- Marketing automation
- Customer lifecycle management
- Retention workflows
- Customer recovery campaigns

**Success Metric:** Owners depend on Flotory to grow revenue.

---

## Phase 11 — AI Assistant

**Status:** Long-Term

**Goal:** Provide actionable recommendations.

**Examples:**

- Tuesday traffic is weak. Run double stamps.
- 43 customers have not visited in 30 days.
- Birthday campaign could bring back 12 customers.

**Success Metric:** Owners use AI recommendations to improve retention.

---

## Phase 12 — Hospitality Operating Platform

**Status:** Vision

**Goal:** Become the operating system for independent hospitality businesses.

**Possible Areas:**

- Loyalty
- CRM
- Customer communication
- Analytics
- Staff operations
- Ordering integrations
- Retention automation

**Success Metric:** Flotory becomes core business infrastructure.

---

## Strategic Principles

Always build in this order:

1. Daily usage
2. Retention
3. Communication
4. Analytics
5. Operations

Never build large feature sets before proving customer demand.

Customer data is the long-term asset.

The most important milestone today is not a new feature.

It is:

**First Venue → First Customer → First Reward Redemption → First Paying Customer**

This roadmap reflects how successful SaaS products evolve — proving daily usage and retention before CRM, AI, or operations at scale.
