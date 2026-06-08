import { expect, test } from '@playwright/test'

import { loginAs, selectVenueIfPresent } from './helpers/auth'

test.describe('Web route smoke', () => {
  test('customer routes load', async ({ page }) => {
    await loginAs(page, 'customer@example.com')

    await page.goto('/wallet')
    await expect(page.getByRole('heading', { name: 'Wallet', exact: true })).toBeVisible({ timeout: 15_000 })

    await page.goto('/my-qr')
    await expect(page.getByRole('heading', { name: 'My QR' })).toBeVisible()
    await expect(page.getByText('One QR for all your venues').first()).toBeVisible()

    await page.goto('/customer/rewards')
    await expect(page.getByRole('heading', { name: 'Your rewards' })).toBeVisible()
  })

  test('staff routes load', async ({ page }) => {
    await loginAs(page, 'staff@example.com')
    await page.goto('/scanner')
    await selectVenueIfPresent(page, 'Demo Cafe')

    await expect(page.getByRole('heading', { name: 'Scanner' })).toBeVisible()
  })

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
})
