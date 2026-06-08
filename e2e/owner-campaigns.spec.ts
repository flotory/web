import { expect, test } from '@playwright/test'

import { loginAs, selectVenueIfPresent } from './helpers/auth'

test.describe('Owner campaigns', () => {
  test('owner can log in and see seeded demo campaigns', async ({ page }) => {
    await loginAs(page, 'owner@example.com')
    await page.goto('/campaigns')
    await expect(page.getByRole('heading', { name: 'Campaigns', exact: true })).toBeVisible()

    await selectVenueIfPresent(page, 'Demo Cafe')

    await expect(page.getByRole('heading', { name: 'Campaigns', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Active campaigns' })).toBeVisible()
    const activeSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Active campaigns' }) })
    await expect(activeSection.getByText('Demo · Quiet Day Promotion')).toBeVisible({ timeout: 15_000 })
    await expect(activeSection.getByText('Demo · Happy Hour')).toBeVisible()
  })
})
