import {
  defaultVenueCoverImage,
  defaultVenueLogoImage,
  normalizeVenueCategory,
  type VenueCategory,
} from '@/lib/defaultImages'
import type { Venue } from '@/types'

export type VenueMediaFields = Pick<Venue, 'logo' | 'logo_thumb' | 'cover_image' | 'category' | 'name'>

function pickMediaPath(...paths: Array<string | null | undefined>): string | null {
  for (const path of paths) {
    if (typeof path === 'string' && path.trim() !== '') {
      return path
    }
  }

  return null
}

export function resolveVenueCategory(
  venue: VenueMediaFields | null | undefined,
  categoryOverride?: VenueCategory | null,
): VenueCategory {
  return normalizeVenueCategory(categoryOverride ?? venue?.category)
}

export function venueLogoUrl(
  venue: VenueMediaFields | null | undefined,
  categoryOverride?: VenueCategory | null,
): string {
  const category = resolveVenueCategory(venue, categoryOverride)
  const uploaded = pickMediaPath(venue?.logo_thumb, venue?.logo)

  const seed = venue?.name ?? category
  return uploaded ?? defaultVenueLogoImage(category, seed)
}

export function venueCoverUrl(
  venue: VenueMediaFields | null | undefined,
  categoryOverride?: VenueCategory | null,
): string {
  const category = resolveVenueCategory(venue, categoryOverride)
  const uploaded = pickMediaPath(venue?.cover_image)

  const seed = venue?.name ?? category
  return uploaded ?? defaultVenueCoverImage(category, seed)
}

export function venueHasCustomLogo(venue: VenueMediaFields | null | undefined): boolean {
  return Boolean(pickMediaPath(venue?.logo_thumb, venue?.logo))
}

export function venueHasCustomCover(venue: VenueMediaFields | null | undefined): boolean {
  return Boolean(pickMediaPath(venue?.cover_image))
}
