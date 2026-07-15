# ADR 001: Campaign active UI uses `applies_now`

Date: 2026-07-15  
Status: accepted

## Context

Happy Hour showed **2× STAMPS ACTIVE** at 20:51 although schedule was Mon–Fri 15:00–18:00. Two causes:

1. **Mobile:** First carousel card used `featured` styling, showing dark theme + 2× badge even when `applies_now` was false.
2. **Backend/demo:** Demo Quiet Day ran 2× all week, so venue-wide `promotion` could be active outside Happy Hour window.

## Decision

1. **Home campaign cards:** Dark theme and 2× badge **only** when `campaign.applies_now === true`. Inactive campaigns use light **Scheduled** state.
2. **Card detail sticker:** Show only when API returns `promotion` with multiplier > 1 (venue-wide winning campaign at request time).
3. **Demo data:** Quiet Day limited to Sundays; Demo Cafe timezone `Europe/Warsaw`.
4. **Design reference:** `design/campaign-states.md`.

## Consequences

- Tapping a scheduled Happy Hour card opens the card without pulsing sticker outside the window.
- Card sticker may reflect a *different* active campaign (venue-wide) — document in UX copy if needed later.
- Tests: `CampaignServiceTest::test_demo_happy_hour_is_inactive_outside_window_even_with_quiet_day_campaign`.

## Rule IDs

- **C6** — Happy Hour time window + venue timezone
- **C11** — Winning campaign when multiplier > 1
- **Y*** — UI must not imply active promos outside schedule

## Exemplar

- `docs/agent/exemplars/campaign-applies-now.md`
- Commit: `b2e40d8`
