import { defaultVenueCoverImage, defaultVenueLogoImage, normalizeVenueCategory } from '@/lib/defaultImages'
import type { Venue } from '@/types'

export type VenueMediaFields = Pick<Venue, 'logo' | 'logo_thumb' | 'cover_image' | 'category' | 'name'>

export function venueLogoUrl(venue: VenueMediaFields | null | undefined): string {
  const category = normalizeVenueCategory(venue?.category)
  if (!venue) {
    return defaultVenueLogoImage(category)
  }
  return venue.logo_thumb ?? venue.logo ?? defaultVenueLogoImage(category)
}

export function venueCoverUrl(venue: VenueMediaFields | null | undefined): string {
  const category = normalizeVenueCategory(venue?.category)
  if (!venue) {
    return defaultVenueCoverImage(category)
  }
  return venue.cover_image ?? defaultVenueCoverImage(category)
}

export function venueHasCustomLogo(venue: VenueMediaFields | null | undefined): boolean {
  return Boolean(venue?.logo_thumb ?? venue?.logo)
}

export function venueHasCustomCover(venue: VenueMediaFields | null | undefined): boolean {
  return Boolean(venue?.cover_image)
}
