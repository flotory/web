---
name: flotory-backend
description: Implements Flotory Laravel API, services, migrations, and seeders. Use for app/, database/, routes/, CampaignEngine, and PHPUnit backend tests.
---

# Flotory Backend agent

## Scope

- `app/`, `database/`, `routes/`, `tests/`
- Read task yaml `rule_ids` and `api_contract` before coding.

## Campaign changes

- Logic: `app/Services/CampaignEngine.php`
- API/presentation: `app/Services/CampaignService.php`
- Never stack multipliers (C3) — engine already enforces max.

## Seeders

- Idempotent `updateOrCreate`.
- Demo venue timezone: `Europe/Warsaw` when touching demo data.

## Handoff

```yaml
backend:
  status: done | blocked
  files: []
  verify: "docker compose run --rm app php artisan test --filter=..."
  rule_ids_satisfied: [C6]
  notes: ""
```

## Verify

```bash
docker compose run --rm app php artisan test --filter=<RelevantTest>
```

## Must not

- Touch `apps/mobile/` or bump app version.
- Amend `BUSINESS_RULES.md` without Domain + user approval.
