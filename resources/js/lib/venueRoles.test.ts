import { describe, expect, it } from 'vitest'

import { MOBILE_APP_PATH } from '@/lib/mobileApp'
import type { Venue } from '@/types'

import {
  ADMIN_HOME_PATH,
  hasOwnerMembership,
  ownerVenueSetupLocation,
  resolveAuthenticatedHomePath,
  resolvePostLoginDestination,
} from './venueRoles'

function venue(id: number, archived = false): Venue {
  return {
    id,
    name: `Venue ${id}`,
    slug: `venue-${id}`,
    membership_role: 'owner',
    archived,
  }
}

describe('membership helpers', () => {
  it('detects owner workspaces', () => {
    const ownerVenues = [venue(1)]

    expect(hasOwnerMembership(ownerVenues)).toBe(true)
  })

  it('ignores archived venues', () => {
    expect(hasOwnerMembership([venue(1, true)])).toBe(false)
  })
})

describe('resolveAuthenticatedHomePath', () => {
  it('routes platform admins to the admin home', () => {
    expect(resolveAuthenticatedHomePath(true, [], null)).toBe(ADMIN_HOME_PATH)
  })

  it('routes venue owners to the dashboard and everyone else to the mobile app page', () => {
    expect(resolveAuthenticatedHomePath(false, [venue(1)], 1)).toBe('/dashboard')
    expect(resolveAuthenticatedHomePath(false, [], null)).toBe(MOBILE_APP_PATH)
  })
})

describe('ownerVenueSetupLocation', () => {
  it('opens the My Venues create form', () => {
    expect(ownerVenueSetupLocation()).toEqual({
      path: '/my-venues',
      query: { create: '1' },
    })
  })
})

describe('resolvePostLoginDestination', () => {
  it('uses home when there is no redirect and the user already has a team', () => {
    expect(resolvePostLoginDestination(null, false, [venue(1)], 1)).toBe('/dashboard')
  })

  it('falls back to the mobile app page for users without a team', () => {
    expect(resolvePostLoginDestination(null, false, [], null)).toBe(MOBILE_APP_PATH)
  })

  it('maps legacy onboarding URLs to My Venues setup', () => {
    expect(resolvePostLoginDestination('/onboarding/create-venue', false, [], null))
      .toBe('/my-venues?create=1')
    expect(resolvePostLoginDestination('/onboarding', false, [], null))
      .toBe('/my-venues?create=1')
  })

  it('sends owners away from customer-only redirects', () => {
    expect(resolvePostLoginDestination('/app', false, [venue(1)], 1)).toBe('/dashboard')
    expect(resolvePostLoginDestination('/wallet', false, [venue(1)], 1)).toBe('/dashboard')
  })

  it('sends new owners to My Venues when targeting owner workspace routes', () => {
    expect(resolvePostLoginDestination('/dashboard', false, [], null)).toBe('/my-venues?create=1')
    expect(resolvePostLoginDestination('/rewards', false, [], null)).toBe('/my-venues?create=1')
  })

  it('keeps explicit admin routes and falls back from owner workspace paths', () => {
    expect(resolvePostLoginDestination('/admin/activity', true, [], null)).toBe('/admin/activity')
    expect(resolvePostLoginDestination('/dashboard', true, [], null)).toBe(ADMIN_HOME_PATH)
  })

  it('rejects unsafe external redirects', () => {
    expect(resolvePostLoginDestination('https://evil.test', false, [venue(1)], 1))
      .toBe('/dashboard')
  })
})
