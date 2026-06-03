import { expect, type Page } from '@playwright/test'

export async function loginAs(page: Page, email: string, password = 'password'): Promise<void> {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15_000 })
}

export async function selectVenueIfPresent(page: Page, venueName: string): Promise<void> {
  const select = page.locator('select').first()
  const count = await select.count()

  if (count === 0) {
    return
  }

  await select.selectOption({ label: venueName })
}

export async function demoCafeVenueId(page: Page): Promise<number> {
  const venueId = await page.evaluate(async () => {
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/venues', {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`venues request failed: ${response.status}`)
    }

    const payload = (await response.json()) as { venues: Array<{ id: number; slug: string }> }
    const cafe = payload.venues.find((venue) => venue.slug === 'demo-cafe')

    if (!cafe) {
      throw new Error('demo-cafe venue not found')
    }

    return cafe.id
  })

  expect(venueId).toBeGreaterThan(0)

  return venueId
}
