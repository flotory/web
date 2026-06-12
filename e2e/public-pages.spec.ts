import { expect, test } from '@playwright/test'

import { DEMO_CAFE_NFC_TOKEN, DEMO_CAFE_SLUG } from './helpers/demo'

test.describe('Public marketing and bridge pages', () => {
  test('landing page renders the marketing hero', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Turn first-time visitors into regulars.' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('link', { name: 'Start free' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible()
  })

  test('legacy customer paths redirect to the mobile app page', async ({ page }) => {
    for (const path of ['/home', '/wallet', '/scanner']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/app$/)
      await expect(page.getByRole('heading', { name: 'Use the Flotory app' })).toBeVisible()
    }
  })

  test('demo alias redirects to book-demo', async ({ page }) => {
    await page.goto('/demo')
    await expect(page).toHaveURL(/\/book-demo$/)
    await expect(page.getByRole('heading', { name: 'Book a 30-minute walkthrough' })).toBeVisible()
  })

  test('nfc tap bridge loads the seeded Demo Cafe stand', async ({ page }) => {
    await page.goto(`/t/${DEMO_CAFE_NFC_TOKEN}`)
    await expect(page.getByText('NFC stamp stand')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Demo Cafe' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open in Flotory app' })).toBeVisible()
  })

  test('unknown nfc token shows an unavailable stand message', async ({ page }) => {
    await page.goto('/t/not-a-real-nfc-token')
    await expect(page.getByRole('heading', { name: 'Stand unavailable' })).toBeVisible({ timeout: 15_000 })
  })

  test('venue slug bridge matches the seeded public page', async ({ page }) => {
    await page.goto(`/v/${DEMO_CAFE_SLUG}`)
    await expect(page.getByRole('heading', { name: 'Demo Cafe' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Join and collect rewards in the Flotory app.')).toBeVisible()
  })
})
