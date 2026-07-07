import { categoryLabel, normalizeVenueCategory, type VenueCategory } from '@/lib/venueCategories'
import type { Venue } from '@/types'

export function venueTypeLabel(venue: Venue): string {
  return categoryLabel(normalizeVenueCategory(venue.category))
}

export function venueSubtitle(venue: Venue): string {
  if (venue.address?.trim()) {
    return venue.address.trim()
  }

  return venueTypeLabel(venue)
}

export function venueStatsLine(venue: Venue): string {
  const guests = venue.customers_count ?? 0
  const visits = venue.visits_count ?? 0
  const rewards = venue.rewards_count ?? 0

  return `${guests} guest${guests === 1 ? '' : 's'} · ${visits} visit${visits === 1 ? '' : 's'} · ${rewards} reward${rewards === 1 ? '' : 's'}`
}

export function branchAnchorFor(venues: Venue[], venue: Venue): Venue {
  if (venue.is_primary) {
    return venue
  }

  const primary = venues.find(
    (item) => item.brand_id === venue.brand_id && item.is_primary,
  )

  return primary ?? venue
}
