import { expect, test } from '@playwright/test'

test.describe('Login page', () => {
  test('renders email and password fields from built assets', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('#email')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('form').getByRole('button', { name: 'Log in' })).toBeVisible()
  })
})
