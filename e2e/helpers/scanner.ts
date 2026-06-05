import { expect, type Page } from '@playwright/test'

import { demoCafeVenueId, loginAs } from './auth'

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

export async function addDemoCafeStampsForCustomer(page: Page, email: string, stamps: number | null): Promise<void> {
  const venueId = await demoCafeVenueId(page)

  const payload = await page.evaluate(
    async ({ venueId: id, customerEmail, stampCount }) => {
      const token = localStorage.getItem('auth_token')
      const customersResponse = await fetch(`/api/venues/${id}/customers`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const customersPayload = (await customersResponse.json()) as {
        customers?: Array<{ id: number; stamps?: number; user?: { email?: string } }>
      }
      const customer = customersPayload.customers?.find((item) => item.user?.email === customerEmail)

      if (!customer) {
        return { ok: false, status: customersResponse.status, body: { message: 'Customer not found' } }
      }

      const activeStamps = Number(customer.stamps ?? 0)
      const calculatedStamps =
        stampCount ??
        (activeStamps < 10
          ? 10 - activeStamps
          : activeStamps < 15
            ? 15 - activeStamps
            : 1)

      const stampResponse = await fetch(`/api/venues/${id}/scanner/stamps`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ customer_id: customer.id, stamps: calculatedStamps }),
      })

      const body = await stampResponse.json().catch(() => ({}))

      return { ok: stampResponse.ok, status: stampResponse.status, body }
    },
    { venueId, customerEmail: email, stampCount: stamps },
  )

  expect(payload.ok, JSON.stringify(payload.body)).toBeTruthy()
}

export async function ensureDemoCafeReadyReward(page: Page, email = 'customer@example.com'): Promise<void> {
  await loginAs(page, 'staff@example.com')
  await addDemoCafeStampsForCustomer(page, email, null)
}
