import { describe, expect, it } from 'vitest'

import { MOBILE_APP_PATH } from '@/lib/mobileApp'
import type { Venue } from '@/types'

import {
  ADMIN_HOME_PATH,
  BOOK_DEMO_PATH,
  hasOwnerMembership,
  isPlatformAdmin,
  isVenueOwner,
  ownerBootstrapPath,
  ownerVenueSetupLocation,
  resolveAuthenticatedHomePath,
  resolvePostLoginDestination,
} from './venueRoles'

function venue(id: number, archived = false, status: Venue['status'] = 'published'): Venue {
  return {
    id,
    name: `Venue ${id}`,
    slug: `venue-${id}`,
    membership_role: 'owner',
    archived,
    status,
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

  it('checks owner role and platform admin flag', () => {
    expect(isVenueOwner(venue(1))).toBe(true)
    expect(isVenueOwner(null)).toBe(false)
    expect(isVenueOwner({} as Pick<Venue, 'membership_role'>)).toBe(false)
    expect(isPlatformAdmin(true)).toBe(true)
    expect(isPlatformAdmin(false)).toBe(false)
  })

  it('delegates owner bootstrap to authenticated home', () => {
    expect(ownerBootstrapPath(false, [venue(1)], 1)).toBe('/dashboard')
    expect(ownerBootstrapPath(false, [], null)).toBe(MOBILE_APP_PATH)
    expect(ownerBootstrapPath(false, [], null, true)).toBe('/onboarding')
  })
})

describe('resolveAuthenticatedHomePath', () => {
  it('routes platform admins to the admin home', () => {
    expect(resolveAuthenticatedHomePath(true, [], null)).toBe(ADMIN_HOME_PATH)
  })

  it('routes venue owners to the dashboard and everyone else to the mobile app page', () => {
    expect(resolveAuthenticatedHomePath(false, [venue(1)], 1)).toBe('/dashboard')
    expect(resolveAuthenticatedHomePath(false, [], null)).toBe(MOBILE_APP_PATH)
    expect(resolveAuthenticatedHomePath(false, [], null, true)).toBe('/onboarding')
  })
})

describe('ownerVenueSetupLocation', () => {
  it('sends invited owners to the onboarding wizard', () => {
    expect(ownerVenueSetupLocation()).toEqual({
      path: '/onboarding',
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

  it('maps legacy onboarding URLs to book demo unless invited to create a venue', () => {
    expect(resolvePostLoginDestination('/onboarding/create-venue', false, [], null))
      .toBe(BOOK_DEMO_PATH)
    expect(resolvePostLoginDestination('/onboarding', false, [], null))
      .toBe(BOOK_DEMO_PATH)
    expect(resolvePostLoginDestination('/onboarding/create-venue', false, [], null, true))
      .toBe('/onboarding')
  })

  it('keeps draft owners on onboarding even after may_create_venue is false', () => {
    const draftVenue = venue(1, false, 'draft')

    expect(resolvePostLoginDestination('/onboarding', false, [draftVenue], 1, false))
      .toBe('/onboarding')
    expect(resolvePostLoginDestination('/dashboard', false, [draftVenue], 1, false))
      .toBe('/onboarding')
  })

  it('sends owners away from customer-only redirects', () => {
    expect(resolvePostLoginDestination('/app', false, [venue(1)], 1)).toBe('/dashboard')
    expect(resolvePostLoginDestination('/wallet', false, [venue(1)], 1)).toBe('/dashboard')
  })

  it('sends users without owner membership to book demo when targeting owner workspace routes', () => {
    expect(resolvePostLoginDestination('/dashboard', false, [], null)).toBe(BOOK_DEMO_PATH)
    expect(resolvePostLoginDestination('/rewards', false, [], null)).toBe(BOOK_DEMO_PATH)
    expect(resolvePostLoginDestination('/dashboard', false, [], null, true)).toBe('/onboarding')
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
