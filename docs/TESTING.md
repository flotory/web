# Testing & quality gates

How we catch bugs before production, what each layer covers, and what still needs manual checks.

Related: [deploy/DEPLOY.md](../deploy/DEPLOY.md), root [README.md](../README.md), [BUSINESS_RULES.md](./BUSINESS_RULES.md).

---

## Confidence snapshot (~7/10 overall)

| Layer | Score | What it proves |
| ----- | ----- | ---------------- |
| Backend API (PHPUnit) | **7.5/10** | Loyalty rules, permissions, publication, campaigns, claims |
| Web build + types | **7/10** | Vue/TS compiles; production bundle builds |
| Web unit (Vitest) | **4.5/10** | Pure helpers (QR, campaigns, listing labels, mobile libs) |
| Web e2e (Playwright) | **6.5/10** | Critical browser flows on seeded demo data |
| Mobile (Expo) | **4/10** | Typecheck + shared unit tests; Maestro smokes are manual |
| Realtime (Reverb) | **2/10** | Server events tested; live UI animations not automated |

**We are not bug-free.** PHPUnit and Playwright cover the main contracts; mobile device UX, Google OAuth/Maps in prod, and odd edge cases still need human verification after big changes.

---

## GitHub Actions (`Tests` workflow)

Runs on every push to `main` and on pull requests. Badge: [![Tests](https://github.com/flotory/web/actions/workflows/tests.yml/badge.svg)](https://github.com/flotory/web/actions/workflows/tests.yml)

| Job | Command (simplified) | Purpose |
| --- | -------------------- | ------- |
| **PHPUnit** | `php artisan test` | ~254 feature + unit tests (MySQL not required; in-memory/SQLite per test) |
| **Frontend build** | `npm ci` → `npm run build` → `npm run test:unit` | Typecheck, Vite production build, Vitest |
| **Playwright smoke** | Build assets → `scripts/e2e-prepare.sh` → `npm run test:e2e` | Browser smokes on SQLite + demo seed |
| **Mobile typecheck** | `npm ci` (apps/mobile) → typecheck + mobile Vitest via root |

Deploy from Mac (`./deploy/push-prod.sh`) waits for this workflow to pass on the pushed commit (unless `SKIP_CI_GATE=1`).

---

## Local commands

### Full pre-deploy gate (mirrors CI)

```bash
./scripts/ci-local.sh
```

Runs: PHPUnit (Docker if PHP not installed locally) → frontend install/build → Vitest → mobile typecheck → mobile unit tests → **Playwright** when PHP is available locally.

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
# or, if app already running on :8000 with demo seed:
npm run test:e2e
```

E2e uses a **dedicated** `.env` via `scripts/e2e-prepare.sh` (`APP_ENV=production`, SQLite, fresh seed). Do not rely on your Docker MySQL volume for CI-style e2e.

### Mobile

```bash
npm ci --prefix apps/mobile
npm run typecheck --prefix apps/mobile
```

Maestro smokes (simulator, manual): see [apps/mobile/README.md](../apps/mobile/README.md).

---

## What Playwright covers

| Spec | Flow |
| ---- | ---- |
| `e2e/login.spec.ts` | Login form renders from built assets |
| `e2e/web-routes.spec.ts` | Customer wallet / My QR / rewards; staff scanner; owner dashboard / rewards / campaigns |
| `e2e/owner-campaigns.spec.ts` | Seeded demo campaigns visible |
| `e2e/staff-stamp.spec.ts` | Staff fallback stamp for demo customer |
| `e2e/customer-claim.spec.ts` | Claim QR → staff redeem → customer sees redemption |

Demo data comes from `DatabaseSeeder` + `DemoCampaignsSeeder` (guarded by `DatabaseSeederDemoCampaignsTest`).

---

## What to test manually after changes

| Area | Why manual |
| ---- | ---------- |
| Mobile app on device/simulator | No automated device e2e in CI |
| Google sign-in / Maps | OAuth callback and API keys differ per environment |
| Reverb live updates | Stamp/redeem celebrations over WebSocket |
| Admin listing review UI | Partial API coverage; visual checklist flow |
| Pilot venue onboarding | Real address, photos, admin approval |

Post-deploy checklist: [deploy/DEPLOY.md § Post-deploy checks](../deploy/DEPLOY.md#post-deploy-checks).

---

## Adding tests (conventions)

1. **Business rule** → update [BUSINESS_RULES.md](./BUSINESS_RULES.md), then add a PHPUnit test in `tests/Feature/` or `tests/Unit/`.
2. **Pure JS/TS helper** → Vitest next to the module (`*.test.ts`).
3. **Critical user journey (web)** → Playwright in `e2e/`; use `exact: true` for headings when a loading state can substring-match (e.g. Wallet vs “Loading your wallet…”).
4. **Mobile screen** → prefer hook/unit tests in `apps/mobile/src/lib/`; Maestro for full tap flows when stable.

---

## Emergency deploy

```bash
SKIP_CI_GATE=1 ./deploy/push-prod.sh
```

Skips **both** local CI and the GitHub wait. Use only when production is down and you have already verified the commit elsewhere. Normal releases should pass Actions first.
