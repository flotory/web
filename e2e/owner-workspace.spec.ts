import { expect, test } from '@playwright/test'

import { DEMO_OWNER_EMAIL } from './helpers/demo'
import { demoCafeVenueId, loginAs, selectVenueIfPresent } from './helpers/auth'

test.describe('Owner workspace', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_OWNER_EMAIL)
    await selectVenueIfPresent(page, 'Demo Cafe')
  })

  test('lists seeded venues and opens venue settings', async ({ page }) => {
    await page.goto('/my-venues')
    await expect(page.getByRole('heading', { name: 'My Venues', exact: true })).toBeVisible()
    await expect(page.locator('main').getByRole('heading', { name: 'Demo Cafe' })).toBeVisible()
    await expect(page.locator('main').getByRole('heading', { name: 'Harbor Coffee' })).toBeVisible()

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

    await expect(page.getByAltText('50% off one coffee')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Free coffee', { exact: true }).first()).toBeVisible()
  })

  test('loads analytics and workspace overview', async ({ page }) => {
    const venueId = await demoCafeVenueId(page)
    const analyticsReady = page.waitForResponse(
      (response) => response.url().includes('/api/dashboard') && response.request().method() === 'GET',
      { timeout: 15_000 },
    )

    await page.goto('/analytics')
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()
    await analyticsReady
    await expect(page.getByText('Active customers')).toBeVisible({ timeout: 15_000 })

    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Workspace', exact: true })).toBeVisible()
    await expect(page.locator('main').getByRole('heading', { name: 'Demo Cafe' })).toBeVisible()
  })

  test('switches venue context from the workspace filter', async ({ page }) => {
    const select = page.locator('select').first()
    await expect(select).toBeVisible({ timeout: 10_000 })

    await select.selectOption({ label: 'Harbor Coffee' })
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Harbor Coffee' })).toBeVisible({ timeout: 15_000 })
  })
})
