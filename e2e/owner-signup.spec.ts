import { expect, test } from '@playwright/test'

import { loginAs } from './helpers/auth'

test.describe('Owner signup and venue access', () => {
  test('owner registration redirects to book demo', async ({ page }) => {
    await page.goto('/register?intent=owner')

    await expect(page).toHaveURL(/\/book-demo$/)
    await expect(page.getByRole('heading', { name: 'Book a 30-minute walkthrough' })).toBeVisible({ timeout: 15_000 })
  })

  test('unknown venue settings URL returns to My Venues', async ({ page }) => {
    await loginAs(page, 'owner@example.com')

    await page.goto('/my-venues/999/settings')

    await expect(page).toHaveURL(/\/my-venues\/?$/)
    await expect(page.getByRole('heading', { name: 'My Venues', exact: true })).toBeVisible()
    await expect(page.getByText('This venue is not in your workspace.')).toHaveCount(0)
  })

  test('invalid venue id in settings URL shows 404 page', async ({ page }) => {
    await loginAs(page, 'owner@example.com')

    await page.goto('/my-venues/abc/settings')

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  })
})
