import { describe, expect, it } from 'vitest'

import { guestRouteShouldRedirect } from './guestRouteGuard'

describe('guestRouteShouldRedirect', () => {
  it('allows customer venues tab', () => {
    expect(guestRouteShouldRedirect(['(customer)', 'venues'])).toBe(false)
  })

  it('redirects guest away from other customer tabs', () => {
    expect(guestRouteShouldRedirect(['(customer)', 'home'])).toBe(true)
    expect(guestRouteShouldRedirect(['(customer)', 'wallet'])).toBe(true)
  })

  it('allows public venue landing stack route', () => {
    expect(guestRouteShouldRedirect(['v', 'demo-cafe'])).toBe(false)
  })

  it('allows login and forgot-password', () => {
    expect(guestRouteShouldRedirect(['login'])).toBe(false)
    expect(guestRouteShouldRedirect(['forgot-password'])).toBe(false)
  })

  it('allows nfc token bridge route', () => {
    expect(guestRouteShouldRedirect(['t', 'abc123'])).toBe(false)
  })

  it('does not redirect when segments are empty', () => {
    expect(guestRouteShouldRedirect([])).toBe(false)
  })

  it('does not redirect unknown non-customer roots', () => {
    expect(guestRouteShouldRedirect(['profile', 'delete-account'])).toBe(false)
  })

  it('redirects customer root without a tab segment', () => {
    expect(guestRouteShouldRedirect(['(customer)'])).toBe(false)
  })
})
