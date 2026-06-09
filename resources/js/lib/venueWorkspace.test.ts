import { describe, expect, it } from 'vitest'

import type { Venue } from '@/types'

import { isOwnerVenueInWorkspace } from './venueWorkspace'

function venue(id: number, role: 'owner' | 'staff', archived = false): Venue {
  return {
    id,
    name: `Venue ${id}`,
    slug: `venue-${id}`,
    membership_role: role,
    archived,
  }
}

describe('isOwnerVenueInWorkspace', () => {
  it('returns true when the user owns the active venue', () => {
    expect(isOwnerVenueInWorkspace(12, [venue(12, 'owner')])).toBe(true)
  })

  it('returns false for staff membership or archived owner venues', () => {
    expect(isOwnerVenueInWorkspace(12, [venue(12, 'staff')])).toBe(false)
    expect(isOwnerVenueInWorkspace(12, [venue(12, 'owner', true)])).toBe(false)
  })

  it('returns false for invalid ids or venues outside the workspace', () => {
    expect(isOwnerVenueInWorkspace(0, [venue(12, 'owner')])).toBe(false)
    expect(isOwnerVenueInWorkspace(99, [venue(12, 'owner')])).toBe(false)
    expect(isOwnerVenueInWorkspace(Number.NaN, [venue(12, 'owner')])).toBe(false)
  })
})
