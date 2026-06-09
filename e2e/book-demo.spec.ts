import { expect, test } from '@playwright/test'

test.describe('Book demo page', () => {
  test('loads without signup', async ({ page }) => {
    await page.goto('/book-demo')
    await expect(page.getByRole('heading', { name: 'Book a 30-minute walkthrough' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Save details' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Start free' }).first()).toBeVisible()
  })
})
