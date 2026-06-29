import { expect, test } from '@playwright/test'

test.describe('Contact page', () => {
  test('renders form and submits successfully', async ({ page }) => {
    await page.goto('/contact')

    await expect(page.getByRole('heading', { name: 'Get in touch' })).toBeVisible({ timeout: 15_000 })
    await page.locator('#contact-name').fill('E2E Contact')
    await page.locator('#contact-email').fill(`contact-e2e-${Date.now()}@example.com`)
    await page.locator('#contact-message').fill('Interested in Flotory for our cafe.')
    await page.locator('button[type="submit"]').click()

    await expect(page.getByTestId('contact-success')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Message sent')).toBeVisible()
  })
})
