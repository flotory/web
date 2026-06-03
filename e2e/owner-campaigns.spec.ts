import { expect, test } from '@playwright/test'

test.describe('Owner campaigns', () => {
  test('owner can log in and see seeded demo campaigns', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill('owner@example.com')
    await page.locator('#password').fill('password')
    await page.locator('button[type="submit"]').click()

    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15_000 })

    await page.goto('/campaigns')
    await expect(page.getByRole('heading', { name: 'Campaigns', exact: true })).toBeVisible()

    const venueSelect = page.locator('select').first()
    await venueSelect.selectOption({ label: 'Demo Cafe' })

    await expect(page.getByRole('heading', { name: 'Campaigns', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Active campaigns' })).toBeVisible()
    const activeSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Active campaigns' }) })
    await expect(activeSection.getByRole('heading', { name: 'Demo · Quiet Day Promotion' })).toBeVisible()
    await expect(activeSection.getByRole('heading', { name: 'Demo · Happy Hour' })).toBeVisible()
  })
})
