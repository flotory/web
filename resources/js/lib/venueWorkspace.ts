import type { Venue } from '@/types'

export const VENUE_ACCESS_DENIED_MESSAGE = 'This venue is not in your workspace.'

export function isOwnerVenueInWorkspace(venueId: number, venues: Venue[]): boolean {
  if (!Number.isFinite(venueId) || venueId <= 0) {
    return false
  }

  return venues.some(
    (venue) => venue.id === venueId && venue.membership_role === 'owner' && !venue.archived,
  )
}
