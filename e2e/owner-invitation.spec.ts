import { expect, test } from '@playwright/test'

import { DEMO_ADMIN_EMAIL } from './helpers/demo'
import { createOwnerInvitation, loginAs, logoutFromApp } from './helpers/auth'

test.describe('Owner invitation register', () => {
  test('plain register redirects to mobile app page', async ({ page }) => {
    await page.goto('/register')

    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('heading', { name: 'Use the Flotory app' })).toBeVisible({ timeout: 15_000 })
  })

  test('invalid invite shows error state', async ({ page }) => {
    await page.goto('/register?invite=not-a-real-token')

    await expect(page.getByText('invalid', { exact: false })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: 'Book A Demo' })).toBeVisible()
  })

  test('sales-led invite registers and opens venue setup', async ({ page }) => {
    const inviteEmail = `e2e-invite-${Date.now()}@example.com`

    await loginAs(page, DEMO_ADMIN_EMAIL)
    const { registerUrl } = await createOwnerInvitation(page, inviteEmail, 'E2E Harbor')

    await logoutFromApp(page)

    await page.goto(registerUrl)

    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('E2E Harbor')).toBeVisible()

    await page.locator('#name').fill('E2E Owner')
    await page.locator('#password').fill('password123')
    await page.locator('#password-confirm').fill('password123')
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 20_000 })
    await page.goto('/onboarding/profile')
    await expect(page.getByRole('heading', { name: 'Your venue profile' })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('#onboarding-name')).toHaveValue('E2E Harbor')
  })
})
