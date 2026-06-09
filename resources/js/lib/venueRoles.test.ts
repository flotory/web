import { describe, expect, it } from 'vitest'

import { MOBILE_APP_PATH } from '@/lib/mobileApp'
import type { Venue } from '@/types'

import {
  ADMIN_HOME_PATH,
  hasOwnerMembership,
  hasTeamMembership,
  isStaffOnlyMember,
  ownerVenueSetupLocation,
  resolveAuthenticatedHomePath,
  resolvePostLoginDestination,
} from './venueRoles'

function venue(id: number, role: 'owner' | 'staff', archived = false): Venue {
  return {
    id,
    name: `Venue ${id}`,
    slug: `venue-${id}`,
    membership_role: role,
    archived,
  }
}

describe('membership helpers', () => {
  it('detects owner, staff, and staff-only workspaces', () => {
    const ownerVenues = [venue(1, 'owner')]
    const staffVenues = [venue(1, 'staff')]
    const mixedVenues = [venue(1, 'owner'), venue(2, 'staff')]

    expect(hasOwnerMembership(ownerVenues)).toBe(true)
    expect(hasTeamMembership(ownerVenues)).toBe(true)
    expect(isStaffOnlyMember(staffVenues)).toBe(true)
    expect(isStaffOnlyMember(mixedVenues)).toBe(false)
  })

  it('ignores archived venues', () => {
    expect(hasOwnerMembership([venue(1, 'owner', true)])).toBe(false)
    expect(hasTeamMembership([venue(1, 'staff', true)])).toBe(false)
  })
})

describe('resolveAuthenticatedHomePath', () => {
  it('routes platform admins to the admin home', () => {
    expect(resolveAuthenticatedHomePath(true, [], null)).toBe(ADMIN_HOME_PATH)
  })

  it('routes venue owners to the dashboard and everyone else to the mobile app page', () => {
    expect(resolveAuthenticatedHomePath(false, [venue(1, 'owner')], 1)).toBe('/dashboard')
    expect(resolveAuthenticatedHomePath(false, [venue(1, 'staff')], 1)).toBe(MOBILE_APP_PATH)
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
    expect(resolvePostLoginDestination(null, false, [venue(1, 'owner')], 1)).toBe('/dashboard')
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
    expect(resolvePostLoginDestination('/app', false, [venue(1, 'owner')], 1)).toBe('/dashboard')
    expect(resolvePostLoginDestination('/wallet', false, [venue(1, 'owner')], 1)).toBe('/dashboard')
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
    expect(resolvePostLoginDestination('https://evil.test', false, [venue(1, 'owner')], 1))
      .toBe('/dashboard')
  })
})
