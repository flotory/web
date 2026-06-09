import { expect, test } from '@playwright/test'

import { loginAs, registerOwnerAs } from './helpers/auth'

test.describe('Owner signup and venue access', () => {
  test('owner registration opens My Venues create form', async ({ page }) => {
    const email = `owner-e2e-${Date.now()}@example.com`

    await registerOwnerAs(page, {
      name: 'E2E Owner',
      email,
    })

    await expect(page).toHaveURL(/\/my-venues\?create=1$/)
    await expect(page.getByRole('heading', { name: 'My Venues', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Create venue', exact: true })).toBeVisible()
    await expect(page.locator('#venue-name')).toBeVisible()
  })

  test('unknown venue settings URL returns to My Venues', async ({ page }) => {
    await loginAs(page, 'owner@example.com')

    await page.goto('/my-venues/999/settings')

    await expect(page).toHaveURL(/\/my-venues\/?$/)
    await expect(page.getByRole('heading', { name: 'My Venues', exact: true })).toBeVisible()
    await expect(page.getByText('This venue is not in your workspace.')).toHaveCount(0)
  })
})
