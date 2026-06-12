import { expect, type Page } from '@playwright/test'

import { DEMO_PASSWORD } from './demo'

/** Clear auth token on the app origin (must run after navigation, not on about:blank). */
async function clearAuthToken(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('auth_token')
  })
}

export async function logoutFromApp(page: Page): Promise<void> {
  await page.goto('/login')
  await clearAuthToken(page)
  await page.goto('/login')
  await expect(page.locator('#email')).toBeVisible({ timeout: 15_000 })
}

export async function loginAs(page: Page, email: string, password = DEMO_PASSWORD): Promise<void> {
  await page.goto('/login')

  if (!page.url().includes('/login')) {
    await clearAuthToken(page)
    await page.goto('/login')
  }

  await expect(page.locator('#email')).toBeVisible({ timeout: 30_000 })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15_000 })
}

export async function registerOwnerAs(
  page: Page,
  options: { name: string; email: string; password?: string },
): Promise<void> {
  const password = options.password ?? DEMO_PASSWORD

  await page.goto('/register?intent=owner')
  await expect(page.getByRole('heading', { name: 'Launch loyalty in minutes' })).toBeVisible({ timeout: 30_000 })
  await page.locator('#name').fill(options.name)
  await page.locator('#email').fill(options.email)
  await page.locator('#password').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => url.pathname === '/my-venues', { timeout: 15_000 })
}

export async function selectVenueIfPresent(page: Page, venueName: string): Promise<void> {
  const select = page.locator('aside select').first()
  const count = await select.count()

  if (count === 0) {
    return
  }

  await expect(select).toBeVisible({ timeout: 10_000 })

  const selectedValue = await select.inputValue()
  const selectedLabel = await select.locator(`option[value="${selectedValue}"]`).textContent()
  if (selectedLabel?.trim() === venueName) {
    return
  }

  await select.selectOption({ label: venueName })
  await page.waitForResponse(
    (response) => response.url().includes('/api/venues') && response.request().method() === 'GET',
    { timeout: 15_000 },
  ).catch(() => null)
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
