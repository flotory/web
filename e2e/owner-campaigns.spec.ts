import { expect, test } from '@playwright/test'

import { loginAs, selectVenueIfPresent } from './helpers/auth'

const QUIET_DAY = 'Demo · Quiet Day Promotion'

test.describe('Owner campaigns', () => {
  test('owner can log in and see seeded demo campaigns', async ({ page }) => {
    await loginAs(page, 'owner@example.com')
    await page.goto('/dashboard')
    await selectVenueIfPresent(page, 'Demo Cafe')

    await page.goto('/campaigns')
    await expect(page.getByRole('heading', { name: 'Campaigns', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Active campaigns' })).toBeVisible()

    const activeSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Active campaigns' }) })
    await expect(activeSection.getByText('Demo · Quiet Day Promotion')).toBeVisible({ timeout: 15_000 })
    await expect(activeSection.getByText('Demo · Happy Hour')).toBeVisible()
  })

  test('owner can pause and resume a campaign', async ({ page }) => {
    await loginAs(page, 'owner@example.com')
    await selectVenueIfPresent(page, 'Demo Cafe')
    await page.goto('/campaigns')

    const activeSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Active campaigns' }) })
    const campaignCard = activeSection.locator('article').filter({ hasText: QUIET_DAY })
    await expect(campaignCard).toBeVisible({ timeout: 15_000 })

    const pauseResponse = page.waitForResponse(
      (response) => response.url().includes('/campaigns/') && response.request().method() === 'PATCH',
      { timeout: 15_000 },
    )
    await campaignCard.getByRole('button', { name: 'Pause' }).click()
    await pauseResponse

    await expect(activeSection.getByText(QUIET_DAY)).not.toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Paused' }).click()
    const pausedRow = page.locator('li').filter({ hasText: QUIET_DAY })
    await expect(pausedRow).toBeVisible({ timeout: 15_000 })
    await expect(pausedRow.getByText('Paused', { exact: true })).toBeVisible()

    const resumeResponse = page.waitForResponse(
      (response) => response.url().includes('/campaigns/') && response.request().method() === 'PATCH',
      { timeout: 15_000 },
    )
    await pausedRow.getByRole('button', { name: 'Resume campaign' }).click()
    await resumeResponse

    await expect(activeSection.getByText(QUIET_DAY)).toBeVisible({ timeout: 15_000 })
  })
})
