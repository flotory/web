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
    await expect(page.getByText('Your digital stamp card')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Get my stamp card' })).toBeVisible()
  })

  test('unknown route shows 404 page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible()
  })

  test('unknown venue slug shows 404 page', async ({ page }) => {
    await page.goto('/v/not-a-real-venue-slug')
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible({ timeout: 15_000 })
  })
})
