import { expect, test } from '@playwright/test'

import { DEMO_ADMIN_EMAIL } from './helpers/demo'
import { loginAs } from './helpers/auth'

test.describe('Admin routes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEMO_ADMIN_EMAIL)
  })

  test('platform admin lands on venue listings', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/venues/)
    await expect(page.getByRole('heading', { name: 'Venue listings', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pending' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Published' })).toBeVisible()
  })

  test('published filter shows seeded demo venues', async ({ page }) => {
    await page.getByRole('button', { name: 'Published' }).click()
    await expect(page.getByText('Demo Cafe')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Harbor Coffee')).toBeVisible()
  })

  test('admin cannot open owner dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/admin\/venues/)
    await expect(page.getByRole('heading', { name: 'Venue listings', exact: true })).toBeVisible()
  })

  test('manage venues and activity log screens load', async ({ page }) => {
    await page.goto('/admin/manage-venues')
    await expect(page.getByRole('heading', { name: 'Manage venues', exact: true })).toBeVisible({
      timeout: 15_000,
    })

    await page.goto('/admin/activity')
    await expect(page.getByRole('heading', { name: 'Activity log', exact: true })).toBeVisible({
      timeout: 15_000,
    })
  })
})
