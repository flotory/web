# Quality roadmap (progress)

| Step | Status | Notes |
|------|--------|-------|
| 1.1 Demo campaigns seed | Done | `DemoCampaignsSeeder`, Docker `ensure-local-demo` |
| 1.2 ARCHITECTURE.md | Done | Services list + campaigns link |
| 1.3 MOBILE.md | Done | Screens ↔ API |
| 2.1 CampaignServiceTest | Done | 8 unit cases |
| 2.2 DemoCampaignsSeederTest | Done | Idempotent seed regression |
| 3.1 useCampaignsPage | Done | `resources/js/composables/useCampaignsPage.ts` |
| 3.2 Vitest + CI | Done | `npm run test:unit` in GitHub Actions |
| 4.x Split CampaignService | Done | `CampaignEngine` + `CampaignOwnerPresenter` |
| 5.1 Playwright setup | Done | `npm run test:e2e` |
| 5.2 Web E2E flows | Done | Owner campaigns, staff stamp, customer claim + staff redeem |
| 5.3 E2E in CI | Pending | Needs compose + seed in GitHub Actions |
