import type { RewardCategory } from '@/lib/rewardVisuals'

export type VenueCategory = 'cafe' | 'restaurant' | 'bar' | 'bakery'

const unsplash = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

/** Curated hospitality defaults — warm, modern, venue-appropriate */
const VENUE_LOGO_DEFAULTS: Record<VenueCategory, string> = {
  cafe: unsplash('photo-1495474472287-4d71bcdd2085'),
  restaurant: unsplash('photo-1517248135467-4c7edcad34c4'),
  bar: unsplash('photo-1514933651103-005eec06c04b'),
  bakery: unsplash('photo-1509440159596-0249088772ff'),
}

const VENUE_COVER_DEFAULTS: Record<VenueCategory, string> = {
  cafe: unsplash('photo-1554118811-1e0d58224f24', 1200),
  restaurant: unsplash('photo-1414235077428-338989a2e8c0', 1200),
  bar: unsplash('photo-1572116469696-31de0fa17a2a', 1200),
  bakery: unsplash('photo-1486427946789-8ebfd54fb9a3', 1200),
}

const REWARD_IMAGE_DEFAULTS: Record<RewardCategory, string> = {
  drink: unsplash('photo-1495474472287-4d71bcdd2085'),
  dessert: unsplash('photo-1551024506-0bccd828d307'),
  free_item: unsplash('photo-1509042239860-f550ce710b93'),
  discount: unsplash('photo-1607083206869-4c7b334efba3'),
  vip: unsplash('photo-1414235077428-338989a2e8c0'),
  special_reward: unsplash('photo-1464347755200-ca2363482b24'),
}

export function normalizeVenueCategory(category: string | null | undefined): VenueCategory {
  if (category === 'restaurant' || category === 'bar' || category === 'bakery' || category === 'cafe') {
    return category
  }
  return 'cafe'
}

export function defaultVenueLogoImage(category: VenueCategory): string {
  return VENUE_LOGO_DEFAULTS[category]
}

export function defaultVenueCoverImage(category: VenueCategory): string {
  return VENUE_COVER_DEFAULTS[category]
}

export function defaultRewardImage(category: RewardCategory): string {
  return REWARD_IMAGE_DEFAULTS[category]
}
