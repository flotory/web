# Backend (Laravel) — layer rules

Owns `app/`, `database/`, `routes/`, and PHPUnit in `tests/`. Role detail:
[.claude/skills/flotory-backend/SKILL.md](../.claude/skills/flotory-backend/SKILL.md).

## Campaign logic

- Matching lives in `app/Services/CampaignEngine.php`.
- Presentation / API in `app/Services/CampaignService.php`.
- Do not duplicate multiplier rules in controllers or the mobile app.

## Seeders

- Idempotent: `updateOrCreate` / `firstOrCreate`.
- Demo: `database/seeders/DemoCampaignsSeeder.php`, timezone set on Demo Cafe.

## Verify

```bash
docker compose exec -T app php artisan test --filter=<TestName>
```

## Must not

- Bump mobile `app.json` / iOS plist — that is the Release role.
- Change `docs/BUSINESS_RULES.md` without the Domain gate + user approval.
