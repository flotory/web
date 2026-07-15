import { expect, test } from '@playwright/test'

import { DEMO_OWNER_EMAIL, DEMO_PASSWORD } from './helpers/demo'
import { createPasswordResetToken, setUserPassword } from './helpers/laravel'

test.describe('Password recovery', () => {
  test('forgot password shows success message for a registered email', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: 'Forgot password?' })).toBeVisible()

    await page.locator('#email').fill(DEMO_OWNER_EMAIL)
    await page.getByRole('button', { name: 'Send reset link' }).click()

    await expect(page.getByText('If that email is registered, we sent a password reset link.')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('reset page shows invalid state without token', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByText('invalid or expired', { exact: false })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible()
  })
})

test.describe('Password reset with token', () => {
  test.beforeEach(() => {
    setUserPassword(DEMO_OWNER_EMAIL, DEMO_PASSWORD)
  })

  test.afterEach(() => {
    setUserPassword(DEMO_OWNER_EMAIL, DEMO_PASSWORD)
  })

  test('owner resets password via token and signs in with the new password', async ({ page }) => {
    const newPassword = 'new-password-123'
    const token = createPasswordResetToken(DEMO_OWNER_EMAIL)

    await page.goto(
      `/reset-password?email=${encodeURIComponent(DEMO_OWNER_EMAIL)}&token=${encodeURIComponent(token)}`,
    )
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()

    await page.locator('#password').fill(newPassword)
    await page.locator('#password-confirm').fill(newPassword)
    await page.getByRole('button', { name: 'Update password' }).click()

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    await expect(page.locator('#email')).toHaveValue(DEMO_OWNER_EMAIL)

    await page.locator('#password').fill(newPassword)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })
})
