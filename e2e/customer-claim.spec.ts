import { expect, test } from '@playwright/test'

import { loginAs, selectVenueIfPresent } from './helpers/auth'
import { ensureDemoCafeReadyReward, staffScanValue } from './helpers/scanner'

test.describe('Customer reward claim', () => {
  test('customer claims reward and staff redeem scan completes the flow', async ({ browser }) => {
    const customerContext = await browser.newContext()
    const staffContext = await browser.newContext()
    const setupContext = await browser.newContext()

    const customerPage = await customerContext.newPage()
    const staffPage = await staffContext.newPage()
    const setupPage = await setupContext.newPage()

    await ensureDemoCafeReadyReward(setupPage)
    await setupContext.close()

    await loginAs(customerPage, 'customer@example.com')
    await customerPage.goto('/customer/rewards')

    await expect(customerPage.getByRole('heading', { name: 'Your rewards' })).toBeVisible()

    const rewardRow = customerPage.locator('li').filter({ hasText: 'Demo Cafe' }).first()
    await expect(rewardRow).toBeVisible({ timeout: 10_000 })

    const claimButton = rewardRow.getByRole('button', { name: 'Claim' })
    await expect(claimButton).toBeVisible({ timeout: 10_000 })

    const claimSessionResponse = customerPage.waitForResponse(
      (response) =>
        response.url().includes('/claim-session') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
    )

    await claimButton.click()

    const sessionPayload = (await (await claimSessionResponse).json()) as {
      qr_value: string
      status: string
    }

    expect(sessionPayload.status).toBe('pending')
    expect(sessionPayload.qr_value).toBeTruthy()

    await expect(customerPage.getByText('Show this to staff')).toBeVisible()

    await loginAs(staffPage, 'staff@example.com')
    await staffPage.goto('/scanner')
    await selectVenueIfPresent(staffPage, 'Demo Cafe')
    await staffScanValue(staffPage, sessionPayload.qr_value)

    await expect(customerPage.getByText('Reward redeemed')).toBeVisible({ timeout: 15_000 })

    await customerContext.close()
    await staffContext.close()
  })
})
