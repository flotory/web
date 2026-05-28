import type { Venue } from '@/types'

export type VenueMembershipRole = 'owner' | 'staff'

export function isVenueOwner(venue: Pick<Venue, 'membership_role'> | null | undefined): boolean {
  return venue?.membership_role === 'owner'
}

export function isVenueStaff(venue: Pick<Venue, 'membership_role'> | null | undefined): boolean {
  return venue?.membership_role === 'staff'
}

export function isStaffOnlyMember(venues: Venue[]): boolean {
  const active = venues.filter((venue) => !venue.archived)

  return active.length > 0 && active.every((venue) => venue.membership_role === 'staff')
}

export function staffScannerPath(venueId: number | null): string {
  return venueId ? `/scanner?venue_id=${venueId}` : '/scanner'
}
