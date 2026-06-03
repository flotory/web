import { expect, test } from '@playwright/test'

import { loginAs, selectVenueIfPresent } from './helpers/auth'

test.describe('Staff stamp scan', () => {
  test('staff adds a stamp via customer fallback at Demo Cafe', async ({ page }) => {
    await loginAs(page, 'staff@example.com')
    await page.goto('/scanner')
    await selectVenueIfPresent(page, 'Demo Cafe')

    await expect(page.getByRole('heading', { name: 'Scan loyalty QR' })).toBeVisible()

    await page.getByPlaceholder('Search by name or email').fill('customer@example.com')
    const customerRow = page.getByRole('button', { name: /Demo Customer/i })
    await expect(customerRow).toBeVisible()
    await customerRow.click()

    await expect(page.getByText('Demo Customer').first()).toBeVisible()

    const stampButton = page.getByRole('button', { name: /^Add 1 stamp$/ })
    await expect(stampButton).toBeEnabled()
    await stampButton.click()

    await expect(page.getByText('Stamp added')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/added for Demo Customer/i)).toBeVisible()
  })
})
