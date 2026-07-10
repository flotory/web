import { expect, test } from '@playwright/test'

import { DEMO_OWNER_EMAIL } from './helpers/demo'
import { demoCafeVenueId, loginAs, selectVenueIfPresent } from './helpers/auth'

test.describe('Owner workspace', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_OWNER_EMAIL)
    await selectVenueIfPresent(page, 'Demo Cafe')
  })

  test('lists the demo venue and opens venue settings', async ({ page }) => {
    await page.goto('/my-venues')
    await expect(page.getByRole('heading', { name: 'My Venues', exact: true })).toBeVisible()
    await expect(page.locator('main').getByRole('heading', { name: 'Demo Cafe' })).toBeVisible()

    const venueId = await demoCafeVenueId(page)
    const settingsReady = page.waitForResponse(
      (response) => response.url().includes(`/api/venues/${venueId}`) && response.request().method() === 'GET',
      { timeout: 15_000 },
    )
    await page.goto(`/my-venues/${venueId}/settings`)
    await settingsReady
    await expect(page.locator('#edit-venue-name')).toHaveValue('Demo Cafe', { timeout: 15_000 })
  })

  test('shows seeded customers and opens a profile', async ({ page }) => {
    await page.goto('/customers')
    await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible()
    await expect(page.getByText('Demo Customer')).toBeVisible({ timeout: 15_000 })

    await page.getByText('Demo Customer').click()
    await expect(page).toHaveURL(/\/customers\/\d+/)
    await expect(page.getByRole('heading', { name: 'Demo Customer' })).toBeVisible()
    await expect(page.getByText('customer@example.com')).toBeVisible()
  })

  test('shows seeded milestone rewards for Demo Cafe', async ({ page }) => {
    const venueId = await demoCafeVenueId(page)
    const rewardsReady = page.waitForResponse(
      (response) => response.url().includes(`/api/venues/${venueId}/rewards`) && response.request().method() === 'GET',
      { timeout: 15_000 },
    )

    await page.goto('/rewards')
    await expect(page.getByRole('heading', { name: 'Rewards', exact: true })).toBeVisible()
    await rewardsReady

    await expect(page.getByAltText('50% off ice cream')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Free coffee', { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Manage 50% off ice cream' }).click()
    await page.locator('[data-reward-menu] button').filter({ hasText: 'Edit' }).click()
    await expect(page.locator('#reward-title')).toHaveValue('50% off ice cream')
  })

  test('loads analytics and redirects legacy workspace settings to my venues', async ({ page }) => {
    const analyticsReady = page.waitForResponse(
      (response) => response.url().includes('/api/dashboard') && response.request().method() === 'GET',
      { timeout: 15_000 },
    )

    await page.goto('/analytics')
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()
    await analyticsReady
    await expect(page.getByText('Active customers')).toBeVisible({ timeout: 15_000 })

    await page.goto('/settings')
    await expect(page).toHaveURL(/\/my-venues$/)
    await expect(page.getByRole('heading', { name: 'My Venues', exact: true })).toBeVisible()
    await expect(page.locator('main').getByRole('heading', { name: 'Demo Cafe' })).toBeVisible()
  })

  test('keeps Demo Cafe as the active workspace venue', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Demo Cafe' })).toBeVisible({ timeout: 15_000 })
  })

  test('opens Files page for a live venue with upload guidance', async ({ page }) => {
    const venueId = await demoCafeVenueId(page)
    const filesReady = page.waitForResponse(
      (response) => response.url().includes(`/api/venues/${venueId}/setup-files`) && response.request().method() === 'GET',
      { timeout: 15_000 },
    )

    await page.goto(`/my-venues/${venueId}/setup-files`)
    await filesReady

    await expect(page.getByRole('heading', { name: 'Files', exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Your venue is live. You can add new photos')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Upload images' })).toBeVisible()
  })

  test('navigates from My Venues card to dashboard', async ({ page }) => {
    await page.goto('/my-venues')
    await expect(page.getByRole('heading', { name: 'My Venues', exact: true })).toBeVisible()

    await page.locator('main').getByRole('heading', { name: 'Demo Cafe' }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Demo Cafe' })).toBeVisible({ timeout: 15_000 })
  })
})
