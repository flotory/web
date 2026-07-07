# Campaigns — loyalty stamp bonuses

**Business invariants (C1–C12):** [BUSINESS_RULES.md § Campaign rules](./BUSINESS_RULES.md#campaign-rules). This file covers UI, API, and engineering detail.

Flotory campaigns are **operational stamp multipliers** for cafes, restaurants, bakeries and bars. They only affect loyalty stamps — not email, SMS, coupons, discounts, or segmentation builders.

---

## Templates (4)


| Template ID            | Owner-facing name        | Rule                                                            |
| ---------------------- | ------------------------ | --------------------------------------------------------------- |
| `bring_back_customers` | **Bring Back Customers** | Inactive guests earn bonus stamps for a configurable run period |
| `quiet_day_promotion`  | **Quiet Day Promotion**  | Bonus stamps on owner-selected days (choose days to boost)      |
| `happy_hour`           | **Happy Hour**           | Bonus stamps on selected weekdays + time window                 |
| `vip_rewards`          | **VIP Rewards**          | Bonus stamps when `visits ≥ X` **or** `rewards claimed ≥ Y`     |


**Legacy IDs** (migrated automatically): `monday_promotion` → `quiet_day_promotion`, `reward_regulars` → `vip_rewards`.

**Not in scope:** email/SMS marketing, coupons, discount engines, AI copy, A/B tests, birthday campaigns (future).

---

## Engine rules

- **Multiple active campaigns** per brand (API routes use workspace `venue_id`, which resolves to the brand).
- Campaigns **never stack** — `multiplier = max(all_matching_campaigns)` (never multiply together).
- Example: VIP 2× + Happy Hour 2× + Win Back 3× eligible → customer gets **3×**.
- Lifecycle: **draft → active → paused → ended** (no delete; history kept).
- Stamp math: `**CampaignService`** → `**LoyaltyStampService::addStamp`**.
- Push: `**CampaignNotificationJob`** logs on activate; Expo delivery = future work.

---

## Template configuration


| Template        | Config fields                                                                        |
| --------------- | ------------------------------------------------------------------------------------ |
| **Bring Back**  | `inactive_days`, `duration_days`, `stamp_multiplier` (2 or 3), `push_enabled`        |
| **Quiet Day**   | `days_of_week` (1–7 ISO), `duration_days`, `stamp_multiplier`, `push_enabled`        |
| **Happy Hour**  | `days_of_week`, `start_time`, `end_time` (`H:i`), `stamp_multiplier`, `push_enabled` |
| **VIP Rewards** | `min_lifetime_stamps`, `min_rewards_claimed`, `stamp_multiplier`, `push_enabled`    |


Defaults (examples): Bring Back — 30 days inactive, 14-day run, 2×; Quiet Day — Mon–Wed, 30-day run, 2×; Happy Hour — Mon–Fri 15:00–18:00, 2× (overnight windows such as 22:00–02:00 supported); VIP — 5+ lifetime stamps or 1+ reward claimed, 2×. Schedule templates use the **venue timezone** (from Google address coordinates when available).

### Venue timezone (Google Time Zone API)

Happy Hour and Quiet Day windows are evaluated in `venues.timezone`. Laravel resolves it from lat/long when an owner or admin saves a venue address (`VenueTimezoneService`).

| Env var | Purpose |
| ------- | ------- |
| `VITE_GOOGLE_MAPS_API_KEY` | Browser — Places autocomplete in Vue |
| `GOOGLE_MAPS_SERVER_API_KEY` | Server — Time Zone API from Laravel |

Enable **Time Zone API** in Google Cloud. Use a **server** API key (IP-restricted on production). A browser-referrer key will not work from Laravel.

Backfill existing venues after deploy:

```bash
php artisan venues:sync-timezones
php artisan venues:sync-timezones --force   # re-fetch all
php artisan venues:sync-timezones --dry-run # preview only
```

If lookup fails, campaigns fall back to `UTC` (`config/app.php`).

---

## Owner UI (`/campaigns`)

1. **Active campaigns** — 2-column cards: multiplier, schedule chips, audience, Pause / Edit / End.
2. **Create campaign** — four template tiles → wizard: **Configure → Review → Activate** (< 60 seconds).
3. **Campaign history** — tabs (All / Active / Paused / Ended), sort, list rows with timeline and quick actions.

Copy: *“Run multiple campaigns. Customers receive the highest eligible multiplier.”*

**Dashboard** — recommendation cards (inactive guests, VIP count); no “quietest day” analytics.

**NFC stamp response** — `stamp_multiplier` and `active_campaign` when multiplier > 1.

---

## API


| Method | Path                                   | Notes                                                              |
| ------ | -------------------------------------- | ------------------------------------------------------------------ |
| GET    | `/campaigns/templates?venue_id=`       | Catalog + recommendations + `active_campaigns`                     |
| GET    | `/venues/{venue}/campaigns`            | Enriched `campaigns[]` + `active_campaigns[]` + templates          |
| POST   | `/venues/{venue}/campaigns/preview`    | `{ template_id, name?, config? }` → audience, schedule, multiplier |
| POST   | `/venues/{venue}/campaigns`            | Create; optional `activate: true`                                  |
| PATCH  | `/venues/{venue}/campaigns/{campaign}` | `status`, `name`, `config`, `push_enabled`                         |
| DELETE | `/venues/{venue}/campaigns/{campaign}` | Rejected (end instead)                                             |


**Enriched campaign fields** (owner list/cards): `multiplier`, `schedule_chips`, `schedule_summary`, `status_label`, `summary`.

**Dashboard:** `campaign_recommendations`, `active_campaigns` (array).

**NFC / stamp response:** `stamp_multiplier`, `active_campaign` (winning campaign context when multiplier > 1).

---

## Tests

Feature coverage: `tests/Feature/VenueCampaignControllerTest.php` — create/activate, multiple actives, max multiplier, preview, dashboard recommendations, enriched index.

E2E coverage: `e2e/owner-campaigns.spec.ts` and `e2e/web-routes.spec.ts` verify that `/campaigns` is reachable from the owner workspace.

---

## Future

- Expo push delivery
- Campaign ROI analytics (reached, returned, extra visits)
- Birthday template (birthday field + GDPR)

See [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md).