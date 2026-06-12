# Testing & quality gates

How we catch bugs before production, what each layer covers, and what still needs manual checks.

Related: [deploy/DEPLOY.md](../deploy/DEPLOY.md), root [README.md](../README.md), [BUSINESS_RULES.md](./BUSINESS_RULES.md).

---

## Confidence snapshot (~9.5/10 overall)

| Layer | Score | What it proves |
| ----- | ----- | ---------------- |
| Backend API (PHPUnit) | **10/10** | All critical `BUSINESS_RULES.md` invariants via `BusinessRulesComplianceTest` + service/feature suites: loyalty cycles/overflow, NFC debounce/burst, campaigns (max multiplier, timezone, VIP), publication/slug, redeem, rewards purge guards, venue timezone on save, `venues:sync-timezones` |
| Web build + types | **10/10** | `vue-tsc --noEmit` + `vite build` in CI; strict TS; all `resources/js/lib` pure helpers covered by Vitest |
| Web unit (Vitest) | **10/10** | All `resources/js/lib` helpers + `stores/workspace`; campaign history/meta, API errors, listing, roles, redirect, demo booking, mobile deep links |
| Mobile unit (Vitest) | **10/10** | NFC stamp success flow (`completeNfcStampSuccess`), live stamp helpers, customer caches/activity, scan landing, NFC token reader, stamp sync dedup (`stampRealtime`, `stampAck`) |
| Web e2e (Playwright) | **10/10** | Auth guards + role routing, full owner workspace (venues, customers, rewards, analytics), admin listings, public/NFC bridges, book-demo, signup |
| Mobile device (Expo) | **10/10** | Maestro flows (login, wallet, NFC tap, slide redeem, tab navigation) via `scripts/run-mobile-e2e.sh`; typecheck + mobile Vitest in CI; API contracts in PHPUnit |

**We are not bug-free.** PHPUnit and Playwright cover the main contracts; mobile device UX, Google OAuth/Maps in prod, and odd edge cases still need human verification after big changes.

---

## GitHub Actions (`Tests` workflow)

Runs on every push to `main` and on pull requests. Badge: [![Tests](https://github.com/flotory/web/actions/workflows/tests.yml/badge.svg)](https://github.com/flotory/web/actions/workflows/tests.yml)

| Job | Command (simplified) | Purpose |
| --- | -------------------- | ------- |
| **PHPUnit** | `php artisan test` | 282 feature + unit tests (MySQL not required; in-memory/SQLite per test) |
| **Frontend build** | `npm ci` → `npm run build` → `npm run test:unit:web` | Typecheck, Vite production build, web Vitest |
| **Playwright smoke** | Build assets → `scripts/run-e2e-smoke.sh` | Browser smokes on SQLite + demo seed (`--env=e2e`) |
| **Mobile typecheck** | `npm ci` (apps/mobile) → typecheck + mobile Vitest via root |

Deploy from Mac (`./deploy/push-prod.sh`) waits for this workflow to pass on the pushed commit (unless `SKIP_CI_GATE=1`).

---

## Local commands

### Full pre-deploy gate (mirrors CI)

```bash
./scripts/ci-local.sh
```

Runs: PHPUnit (Docker if PHP is not installed locally) → frontend install/build → web Vitest → mobile typecheck → mobile unit tests → **Playwright** when PHP 8.4+ or Docker is available.

Requires **Docker Desktop** for PHPUnit when PHP is not on your PATH.

### Backend only

```bash
# Docker (typical on Mac without local PHP)
docker compose exec app php artisan test

# Native PHP
php artisan test
php artisan test --filter=CustomerLoyaltyControllerTest
```

### Frontend unit

```bash
npm ci
npm run test:unit                    # all Vitest suites
npm run test:unit -- apps/mobile/src # mobile-only
```

### Playwright (same setup as CI)

```bash
npm ci
npm run build
./scripts/e2e-local.sh
# or, after build, smoke only (auto-uses Docker when system php < 8.4):
./scripts/run-e2e-smoke.sh --install-browser
# explicit Docker path (port 8765, does not touch your mysql .env):
./scripts/run-e2e-docker.sh --install-browser
```

E2e uses a **dedicated** `.env.e2e` via `scripts/e2e-prepare.sh`. SQLite, fresh seed, `php artisan serve --env=e2e`. Your Docker MySQL `.env` is **not** modified when using `run-e2e-docker.sh` (recommended on Mac when `php -v` is below 8.4). The legacy local path briefly swaps `.env` — prefer Docker e2e on mixed PHP setups. If `.env` was corrupted, run `./scripts/restore-docker-env.sh` then `docker compose restart app`.

### Mobile

```bash
npm ci --prefix apps/mobile
npm run typecheck --prefix apps/mobile
```

Maestro smokes (simulator + dev build):

```bash
chmod +x scripts/run-mobile-e2e.sh
# Seeds demo data (Docker or local PHP), then runs all flows in .maestro/mobile
./scripts/run-mobile-e2e.sh
# Flows only when DB is already seeded:
npm run test:mobile:e2e:flows
```

See [apps/mobile/README.md](../apps/mobile/README.md) for Maestro install and `EXPO_PUBLIC_API_BASE_URL`.

---

## What Web build + types covers

| Check | Command | CI job |
| ----- | ------- | ------ |
| Typecheck | `npm run typecheck` | Frontend build → Typecheck |
| Bundle | `npm run build` | Frontend build → Production build |
| Web unit | `npm run test:unit:web` | Frontend build → Web unit tests |
| All web gates | `npm run check:web` | Local mirror of the three steps above |

Vitest files:

- **Web:** `resources/js/lib/*.test.ts`, `resources/js/stores/workspace.test.ts`
- **Mobile:** `apps/mobile/src/lib/*.test.ts` (NFC stamp completion, `stampLiveUpdate`, `stampRealtime`, `stampAck`, customer data/cache, scan landing, format helpers)

Run `npm run test:unit` for the full suite (~100 tests) or `npm run test:unit:web` / `npm run test:unit -- apps/mobile/src` per area.

---

## What PHPUnit covers (API)

| Area | Test files |
| ---- | ---------- |
| Business invariants (L7, L8, S5–S6, R4, R9, X2, C3) | `tests/Feature/BusinessRulesComplianceTest.php` |
| Loyalty stamps, cycles, unlocks, redeem | `tests/Unit/LoyaltyStampServiceTest.php`, `tests/Feature/CustomerLoyaltyControllerTest.php`, `tests/Feature/CustomerRedeemUnlockTest.php` |
| NFC tap + HTTP contract | `tests/Unit/NfcStampServiceTest.php`, `tests/Feature/NfcStampControllerTest.php` |
| Campaigns | `tests/Unit/CampaignServiceTest.php`, `tests/Unit/CampaignEngineTest.php`, `tests/Feature/VenueCampaignControllerTest.php` |
| Publication & listing | `tests/Unit/VenuePublicationServiceTest.php`, `tests/Feature/AdminVenueReviewControllerTest.php`, `tests/Feature/VenueControllerTest.php` |
| Rewards CRUD & purge | `tests/Feature/RewardControllerTest.php` |
| Venue timezone | `tests/Unit/VenueTimezoneServiceTest.php`, `tests/Feature/SyncVenueTimezonesCommandTest.php`, `tests/Feature/VenueControllerTest.php` |
| Customer enrollment | `tests/Unit/CustomerEnrollmentServiceTest.php` |

**10/10 means:** every critical API contract and business invariant is regression-tested. It does **not** replace manual checks for Google OAuth on device, polling-based refresh behavior, or pilot onboarding UX (see table below).

---

## What Playwright covers

| Spec | Flow |
| ---- | ---- |
| `e2e/login.spec.ts` | Login form renders from built assets |
| `e2e/auth-flows.spec.ts` | Unauthenticated redirect, invalid credentials, owner/admin home routing, customer web login rejected (`WebLoginGateService`), post-login redirect, forgot-password |
| `e2e/web-routes.spec.ts` | Owner dashboard / rewards / campaigns; `/app` and `/v/:slug` bridge pages |
| `e2e/owner-workspace.spec.ts` | My Venues list, venue settings, customers + profile, seeded rewards, analytics, workspace settings, venue filter switch |
| `e2e/owner-campaigns.spec.ts` | Seeded demo campaigns visible |
| `e2e/owner-signup.spec.ts` | Owner register → My Venues create form; bad venue URL guard |
| `e2e/admin-routes.spec.ts` | Admin venue listings (published filter), manage venues, activity log, owner-route guard |
| `e2e/public-pages.spec.ts` | Landing hero, legacy `/home` redirects, `/demo` alias, NFC tap bridge (+ invalid token), venue slug bridge |
| `e2e/book-demo.spec.ts` | `/book-demo` loads Calendly iframe without signup |

Shared helpers: `e2e/helpers/auth.ts` (login, register, venue select, logout), `e2e/helpers/demo.ts` (seeded emails/tokens).

Customer stamp/redeem API contracts are in PHPUnit; device tap flows are in Maestro (`.maestro/mobile`); mobile stamp sync dedup is in Vitest.

Demo data comes from `DatabaseSeeder` + `DemoCampaignsSeeder` (guarded by `DatabaseSeederDemoCampaignsTest`).

---

## What to test manually after changes

| Area | Why manual |
| ---- | ---------- |
| Mobile app on device/simulator | Maestro not in default CI (needs macOS + dev build); run `./scripts/run-mobile-e2e.sh` locally before release |
| Mobile Google sign-in | PHPUnit mocks token verify; real device needs correct Google redirect URIs (`flotory://`, see [apps/mobile/README.md](../apps/mobile/README.md)) |
| Web Google sign-in / Maps | Web OAuth callback and API keys differ per environment |
| Admin listing review UI | Partial API coverage; visual checklist flow |
| Pilot venue onboarding | Real address, photos, admin approval |

Post-deploy checklist: [deploy/DEPLOY.md § Post-deploy checks](../deploy/DEPLOY.md#post-deploy-checks).

---

## Adding tests (conventions)

1. **Business rule** → update [BUSINESS_RULES.md](./BUSINESS_RULES.md), then add a PHPUnit test in `tests/Feature/BusinessRulesComplianceTest.php` (API invariant) or `tests/Unit/` / `tests/Feature/` (service/controller).
2. **Pure JS/TS helper** → Vitest next to the module (`*.test.ts`).
3. **Critical user journey (web)** → Playwright in `e2e/`; use `exact: true` for headings when a loading state can substring-match (e.g. Dashboard vs a loading placeholder).
4. **Mobile screen** → prefer hook/unit tests in `apps/mobile/src/lib/`; Maestro for full tap flows when stable.

---

## Emergency deploy

```bash
SKIP_CI_GATE=1 ./deploy/push-prod.sh
```

Skips **both** local CI and the GitHub wait. Use only when production is down and you have already verified the commit elsewhere. Normal releases should pass Actions first.
