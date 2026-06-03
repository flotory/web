import { expect, type Page } from '@playwright/test'

import { demoCafeVenueId } from './auth'

export async function staffScanValue(page: Page, scanValue: string, stamps = 1): Promise<void> {
  const venueId = await demoCafeVenueId(page)

  const payload = await page.evaluate(
    async ({ venueId: id, scan, stampCount }) => {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/venues/${id}/scanner/scan`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scan, stamps: stampCount }),
      })

      const body = await response.json().catch(() => ({}))

      return { ok: response.ok, status: response.status, body }
    },
    { venueId, scan: scanValue, stampCount: stamps },
  )

  expect(payload.ok, JSON.stringify(payload.body)).toBeTruthy()
}
