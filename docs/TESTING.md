# Testing & quality gates

How we catch bugs before production, what each layer covers, and what still needs manual checks.

Related: [deploy/DEPLOY.md](../deploy/DEPLOY.md), root [README.md](../README.md), [BUSINESS_RULES.md](./BUSINESS_RULES.md).

---

## Confidence snapshot (10/10 overall)

| Layer | Score | What it proves |
| ----- | ----- | ---------------- |
| Backend API (PHPUnit) | **10/10** | All critical `BUSINESS_RULES.md` invariants via `BusinessRulesComplianceTest` (incl. **B3** one card per brand, **O12** Files upload/delete rules) + service/feature suites — **369 tests** |
| Web build + types | **10/10** | `vue-tsc --noEmit` + `vite build` in CI; strict TS |
| Web unit (Vitest) | **10/10** | Core auth/session helpers, onboarding routing (`onboarding`, `ownerOnboarding`), venue roles/categories/media (`venueMedia`, `venueLocationCard`), API errors, workspace store, campaign/listing helpers, date formatting (`formatDate`) — **152 tests** (27 files) |
| Mobile unit (Vitest) | **10/10** | NFC stamp success flow (`completeNfcStampSuccess`), live stamp helpers, customer caches/activity, scan landing, NFC token reader, stamp sync dedup (`stampRealtime`, `stampAck`), localization catalogs |
| Web e2e (Playwright) | **10/10** | Auth guards + role routing, full owner workspace (venues, **Files** page, customers, rewards, analytics), admin listings, public/NFC bridges, book-demo, signup; **logout** clicks AppShell and asserts `/api/auth/logout` |
| Mobile device (Expo) | **10/10** | Maestro flows (login, wallet, NFC tap, slide redeem, tab navigation) via `scripts/run-mobile-e2e.sh`; typecheck + mobile Vitest in CI; API contracts in PHPUnit |

**We are not bug-free.** PHPUnit and Playwright cover the main contracts; mobile device UX, Google OAuth/Maps in prod, and odd edge cases still need human verification after big changes.

---

## GitHub Actions (`Tests` workflow)

Runs on every push to `main` and on pull requests. Badge: [![Tests](https://github.com/flotory/web/actions/workflows/tests.yml/badge.svg)](https://github.com/flotory/web/actions/workflows/tests.yml)

| Job | Command (simplified) | Purpose |
| --- | -------------------- | ------- |
| **PHPUnit** | `php artisan test` | Feature + unit tests (MySQL not required; in-memory/SQLite per test) |
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

- **Web lib (with tests):** `api`, `sessionGuard`, `signInNavigation`, `onboarding`, `ownerOnboarding`, `venueRoles`, `venueCategories`, `venueMedia`, `venueLocationCard`, `venueWorkspace`, `venueListing`, `venueJoinBridge`, `campaignHistory`, `campaignTemplates`, `dashboardPeriod`, `formatDate`, `redirect`, `demoBooking`, `mobileApp`, `currency`, `legalMarkdown`, `faqContent`, `scrollReset`, `utils`
- **Web stores (with tests):** `stores/auth`, `stores/workspace`
- **Web lib (lower priority / UI-bound):** e.g. `defaultImages`, `campaignActions`, `money`, `googleMaps*`, `cropImageToFile`, marketing page helpers
- **Mobile:** `apps/mobile/src/lib/*.test.ts` and `apps/mobile/src/i18n/*.test.ts` (NFC stamp completion, `stampLiveUpdate`, `stampRealtime`, `stampAck`, customer data/cache, scan landing, format helpers, English/Armenian localization catalogs)

Run `npm run test:unit` for the full suite or `npm run test:unit:web` / `npm run test:unit -- apps/mobile/src` per area.

---

## What PHPUnit covers (API)

| Area | Test files |
| ---- | ---------- |
| Business invariants (L7, L8, S5–S6, R4, R9, X2, C3, **B3**, **O12**) | `tests/Feature/BusinessRulesComplianceTest.php` |
| Loyalty stamps, cycles, unlocks, redeem | `tests/Unit/LoyaltyStampServiceTest.php`, `tests/Feature/CustomerLoyaltyControllerTest.php`, `tests/Feature/CustomerRedeemUnlockTest.php` |
| NFC tap + HTTP contract | `tests/Unit/NfcStampServiceTest.php`, `tests/Feature/NfcStampControllerTest.php` |
| Campaigns | `tests/Unit/CampaignServiceTest.php`, `tests/Unit/CampaignEngineTest.php`, `tests/Feature/VenueCampaignControllerTest.php` |
| Publication & listing | `tests/Unit/VenuePublicationServiceTest.php`, `tests/Feature/AdminVenueReviewControllerTest.php`, `tests/Feature/VenueListingControllerTest.php`, `tests/Feature/VenueControllerTest.php` |
| Owner setup files (`Files` page) | `tests/Feature/VenueSetupFileControllerTest.php` (upload/delete rules when draft, pending review, published) |
| Brands & branches | `tests/Feature/VenueBranchTest.php`, `tests/Feature/CustomerLoyaltyControllerTest.php` (branch `venue_id` filter), `tests/Unit/ModelRelationshipTest.php` (brand relationships), `tests/Unit/VenuePresenterTest.php` (upload paths, `setup_logo_preview`) |
| Owner sales invitations | `tests/Feature/OwnerInvitationTest.php` |
| Owner onboarding snapshot | `tests/Feature/OwnerOnboardingControllerTest.php` |
| Venue categories | `tests/Unit/VenueCategoriesTest.php` |
| Google OAuth (web + mobile) | `tests/Feature/GoogleAuthControllerTest.php` |
| Auth/session locale & profile | `tests/Feature/AuthControllerTest.php` |
| Owner dashboard & date-range analytics | `tests/Unit/DashboardPeriodTest.php`, `tests/Feature/VenueDashboardControllerTest.php`, `resources/js/lib/dashboardPeriod.test.ts` |
| Demo seed data (campaigns, rewards) | `tests/Feature/DatabaseSeederDemoCampaignsTest.php`, `tests/Feature/DatabaseSeederDemoRewardsTest.php`, `tests/Feature/DemoShowcaseSeederTest.php` |
| Rewards CRUD & purge | `tests/Feature/RewardControllerTest.php` |
| Venue timezone | `tests/Unit/VenueTimezoneServiceTest.php`, `tests/Feature/SyncVenueTimezonesCommandTest.php`, `tests/Feature/VenueControllerTest.php` |
| Customer enrollment | `tests/Unit/CustomerEnrollmentServiceTest.php` |

**10/10** means every critical API contract, business invariant, core web helper, and owner journey path listed above is regression-tested. Neither replaces manual checks for Google OAuth on device, polling-based refresh behavior, or full venue onboarding UX with Google address picker (see table below).

---

## What Playwright covers

| Spec | Flow |
| ---- | ---- |
| `e2e/login.spec.ts` | Login form renders from built assets |
| `e2e/auth-flows.spec.ts` | Login form, invalid credentials, owner/admin home routing, customer web login rejected, post-login redirect, forgot-password, **AppShell logout** |
| `e2e/web-routes.spec.ts` | Owner dashboard / rewards / campaigns; `/app` and `/v/:slug` bridge pages |
| `e2e/owner-workspace.spec.ts` | My Venues list, venue settings, **Files** page (live upload guidance), card → dashboard navigation, customers + profile, seeded rewards, analytics, legacy `/settings` redirect, venue filter switch |
| `e2e/owner-campaigns.spec.ts` | Seeded demo campaigns visible |
| `e2e/owner-signup.spec.ts` | Public owner intent redirects to book-demo; `create=1` without invite/ownership blocked |
| `e2e/owner-invitation.spec.ts` | Register without invite → `/app`; invalid invite; sales-led register → venue setup |
| `e2e/contact.spec.ts` | Contact form submission |
| `e2e/admin-routes.spec.ts` | Admin venue listings, **owner onboarding**, manage venues, activity log, owner-route guard |
| `e2e/public-pages.spec.ts` | Landing hero, legacy `/home` redirects, `/demo` alias, NFC tap bridge (+ invalid token), venue slug bridge |
| `e2e/book-demo.spec.ts` | `/book-demo` loads Calendly iframe without signup |

Shared helpers: `e2e/helpers/auth.ts` (login, register, venue select, logout), `e2e/helpers/demo.ts` (seeded emails/tokens).

Customer stamp/redeem API contracts are in PHPUnit; device tap flows are in Maestro (`.maestro/mobile`); mobile stamp sync dedup is in Vitest.

Demo data comes from `DatabaseSeeder` + `DemoCampaignsSeeder` + `DemoShowcaseSeeder` (guarded by `DatabaseSeederDemoCampaignsTest`, `DatabaseSeederDemoRewardsTest`, `DemoShowcaseSeederTest`).

---

## What to test manually after changes

| Area | Why manual |
| ---- | ---------- |
| Mobile app on device/simulator | Maestro not in default CI (needs macOS + dev build); run `./scripts/run-mobile-e2e.sh` locally before release |
| Mobile Google sign-in | PHPUnit mocks token verify; real device needs correct Google redirect URIs (`flotory://`, see [apps/mobile/README.md](../apps/mobile/README.md)) |
| Web Google sign-in / Maps | Web OAuth callback and API keys differ per environment; **immediate logout after Google login** — covered by Vitest (`auth`, `signInNavigation`); verify manually on device |
| Admin listing review UI | Partial API coverage; visual checklist flow |
| Venue onboarding | Google address picker + file uploads; API invite/create path in `OwnerInvitationTest` |

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
