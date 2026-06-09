import { expect, test } from '@playwright/test'

import { loginAs, selectVenueIfPresent } from './helpers/auth'

test.describe('Web route smoke', () => {
  test('owner routes load', async ({ page }) => {
    await loginAs(page, 'owner@example.com')
    await selectVenueIfPresent(page, 'Demo Cafe')

    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /Demo Cafe|Your venue/ })).toBeVisible()

    await page.goto('/rewards')
    await expect(page.getByRole('heading', { name: 'Rewards', exact: true })).toBeVisible()

    await page.goto('/campaigns')
    await expect(page.getByRole('heading', { name: 'Campaigns', exact: true })).toBeVisible()
  })

  test('mobile app page loads', async ({ page }) => {
    await page.goto('/app')
    await expect(page.getByRole('heading', { name: 'Use the Flotory app' })).toBeVisible()
  })

  test('venue bridge page loads', async ({ page }) => {
    await page.goto('/v/demo-cafe')
    await expect(page.getByRole('heading', { name: 'Demo Cafe' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Join and collect rewards in the Flotory app.')).toBeVisible()
  })
})
