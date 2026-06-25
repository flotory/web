import { expect, test } from '@playwright/test'

import { DEMO_CAFE_NFC_TOKEN, DEMO_CAFE_SLUG } from './helpers/demo'

test.describe('Public marketing and bridge pages', () => {
  test('landing page renders the full marketing surface', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByTestId('landing-hero-tagline')).toHaveText('Built for the counter, not the queue')
    await expect(page.getByRole('heading', { name: 'Turn first-time visitors into regulars.' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('No POS. No staff scanner.')).toBeVisible()
    await expect(page.getByTestId('landing-hero-visual')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Start free' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Book a demo' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible()

    await expect(page.getByTestId('landing-trust-strip')).toBeVisible()
    await expect(page.getByText('NFC stamps at the counter')).toBeVisible()
    await expect(page.getByText('Built for independent cafes, wine bars, and bakeries.')).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Guest app, NFC stand, and owner dashboard — in one loop.' })).toBeVisible()
    await expect(page.getByTestId('landing-product-showcase')).toBeVisible()
    await expect(page.getByTestId('landing-product-panel-guest')).toBeVisible()
    await expect(page.getByTestId('landing-product-panel-nfc')).toBeVisible()
    await expect(page.getByTestId('landing-product-panel-owner')).toBeVisible()

    const howItWorks = page.getByTestId('landing-how-it-works')
    await expect(howItWorks).toBeVisible()
    await expect(howItWorks.getByRole('heading', { name: 'From first visit to reward redemption.' })).toBeVisible()
    await expect(page.getByTestId('landing-flow-step-join')).toBeVisible()
    await expect(page.getByTestId('landing-flow-step-stamp')).toBeVisible()
    await expect(page.getByTestId('landing-flow-step-milestone')).toBeVisible()
    await expect(page.getByTestId('landing-flow-step-redeem')).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Ready to launch at your venue?' })).toBeVisible()
  })

  test('legacy customer paths redirect to the mobile app page', async ({ page }) => {
    for (const path of ['/home', '/wallet', '/scanner']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/app$/)
      await expect(page.getByRole('heading', { name: 'Use the Flotory app' })).toBeVisible()
    }
  })

  test('privacy and terms pages render legal content', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: 'Flotory Privacy Policy' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Contact Details' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Privacy' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Terms' })).toBeVisible()

    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: 'Flotory Terms of Service for End Users' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('heading', { name: 'Eligibility' })).toBeVisible()
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
    await expect(page.getByTestId('venue-join-bridge')).toBeVisible()
    await expect(page.getByText('Your digital stamp card')).toBeVisible()
    await expect(page.getByTestId('venue-join-cta')).toBeVisible()
    await expect(page.getByTestId('venue-join-nfc-education')).toBeVisible()
    await expect(page.getByText('Next time, tap the NFC stand')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Get my stamp card' })).toBeVisible()
    await expect(page.getByText('Already a member? Tap the NFC stand at the counter')).toBeVisible()
  })
})
