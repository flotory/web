import { expect, test } from '@playwright/test'

import { DEMO_ADMIN_EMAIL, DEMO_CUSTOMER_EMAIL, DEMO_OWNER_EMAIL } from './helpers/demo'
import { loginAs, logoutFromApp } from './helpers/auth'

test.describe('Auth flows', () => {
  test('redirects unauthenticated owners to login with a return path', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login/)
    expect(page.url()).toContain('redirect=')
    await expect(page.locator('#email')).toBeVisible()
  })

  test('rejects invalid credentials and keeps the user on login', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill('nobody@example.com')
    await page.locator('#password').fill('not-the-password')
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('.text-danger')).toBeVisible()
  })

  test('routes owner login to the dashboard', async ({ page }) => {
    await loginAs(page, DEMO_OWNER_EMAIL)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('routes admin login to venue listings', async ({ page }) => {
    await loginAs(page, DEMO_ADMIN_EMAIL)
    await expect(page).toHaveURL(/\/admin\/venues/)
    await expect(page.getByRole('heading', { name: 'Venue listings', exact: true })).toBeVisible()
  })

  test('rejects customer web login and keeps them on the login page', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill(DEMO_CUSTOMER_EMAIL)
    await page.locator('#password').fill('password')
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('.text-danger')).toContainText('credentials are incorrect')
  })

  test('honors post-login redirect for venue owners', async ({ page }) => {
    await page.goto('/login?redirect=%2Frewards')
    await page.locator('#email').fill(DEMO_OWNER_EMAIL)
    await page.locator('#password').fill('password')
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/rewards/)
    await expect(page.getByRole('heading', { name: 'Rewards', exact: true })).toBeVisible()
  })

  test('loads forgot-password without authentication', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: 'Forgot password?' })).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible()
  })

  test('owner logout revokes session and returns to login', async ({ page }) => {
    await loginAs(page, DEMO_OWNER_EMAIL)
    await expect(page).toHaveURL(/\/dashboard/)

    await logoutFromApp(page)

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin logout revokes session from the workspace shell', async ({ page }) => {
    await loginAs(page, DEMO_ADMIN_EMAIL)
    await expect(page).toHaveURL(/\/admin\/venues/)

    await logoutFromApp(page)

    await page.goto('/admin/venues')
    await expect(page).toHaveURL(/\/login/)
  })

  test('strips oauth_token from the login url after google callback', async ({ page }) => {
    await page.goto('/login?oauth_token=invalid-token&redirect=%2Fdashboard')

    await expect(page).toHaveURL(/\/login/)
    expect(page.url()).not.toContain('oauth_token')
    expect(page.url()).toContain('redirect=')
  })
})
