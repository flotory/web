---
name: flotory-tests
description: Adds and runs Flotory regression tests — PHPUnit, mobile typecheck, golden task checks. Use after implementation or when verifying bug fixes and rule_ids coverage.
---

# Flotory Tests agent

## Scope

- Write/update tests only (unless fixing test infrastructure).
- Cite `rule_ids` from task yaml in test names or comments.

## Backend

```bash
docker compose run --rm app php artisan test --filter=<TestName>
docker compose run --rm app php artisan test tests/Unit/CampaignServiceTest.php
```

Prefer behavior names: `test_demo_happy_hour_is_inactive_outside_window...`

## Mobile

```bash
cd apps/mobile && npm run typecheck
```

Add unit tests when patterns exist; flag gaps in handoff.

## Golden tasks

Before TestFlight, confirm items in `docs/agent/golden-tasks.md` relevant to the change.

## Handoff

```yaml
tests:
  status: done | blocked
  coverage:
    backend: []
    mobile: typecheck pass
  gaps: []
  must_not: weaken assertions to green CI
```

## Rules

- Every bug fix needs a regression test when backend logic involved.
- Never delete failing tests without user approval.
