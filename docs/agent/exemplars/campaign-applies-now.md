# Exemplar: Campaign applies_now fix

**Type:** Vertical slice (backend + mobile + tests)  
**Commit:** `b2e40d8`  
**ADR:** `docs/decisions/001-campaign-applies-now-ui.md`

## Problem

2× campaign UI appeared outside Happy Hour schedule.

## Pattern to copy

### 1. Domain first

- Cite C6, C11 before coding.
- Check demo seeders don't create false-active campaigns.

### 2. Backend

Files:

- `database/seeders/DemoCampaignsSeeder.php` — Quiet Day days `[7]` only
- `database/seeders/DatabaseSeeder.php` — `timezone: Europe/Warsaw`
- `tests/Unit/CampaignServiceTest.php` — regression at Fri 20:51 Warsaw

Verify:

```bash
docker compose run --rm app php artisan test --filter=test_demo_happy_hour_is_inactive
```

### 3. Mobile

Files:

- `apps/mobile/src/components/customer/HomeCampaignCard.tsx`
  - `isActiveNow = campaign.applies_now` (not `featured`)
  - Scheduled badge for inactive

Verify:

```bash
cd apps/mobile && npm run typecheck
```

### 4. Reviewer checklist

- [ ] No `featured`-as-active regression
- [ ] Tokens from `theme.ts` only
- [ ] PHPUnit regression present

### 5. Retro

- ADR 001 created
- Golden tasks GT-01, GT-02 updated

## Anti-patterns seen

- ❌ `featured || applies_now` for dark campaign card
- ❌ Quiet Day 2× on all 7 days overlapping Happy Hour demo
- ❌ Assuming phone local time — use venue timezone in engine
