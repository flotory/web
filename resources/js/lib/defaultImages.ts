import type { RewardCategory } from '@/lib/rewardVisuals'

export type VenueCategory = 'cafe' | 'restaurant' | 'bar' | 'bakery'

/** Unsplash — stable crop URLs for hospitality imagery */
function unsplash(photoId: string, width = 900, height?: number): string {
  const h = height ? `&h=${height}` : ''

  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}${h}&q=80`
}

const VENUE_LOGO_DEFAULTS: Record<VenueCategory, string> = {
  cafe: unsplash('photo-1501339847302-ac426a4a7cbb', 512, 512),
  bar: unsplash('photo-1514933651103-005eec06c04b', 512, 512),
  restaurant: unsplash('photo-1414235077428-338989a2e8c0', 512, 512),
  bakery: unsplash('photo-1509440159596-0249088772ff', 512, 512),
}

const VENUE_COVER_DEFAULTS: Record<VenueCategory, string> = {
  cafe: unsplash('photo-1554118811-1e0d58224f24', 1400, 700),
  bar: unsplash('photo-1572116469696-31de0fa17a2a', 1400, 700),
  restaurant: unsplash('photo-1517248135467-4c7edcad34c4', 1400, 700),
  bakery: unsplash('photo-1486427946789-8ebfd54fb9a3', 1400, 700),
}

const REWARD_IMAGE_DEFAULTS: Record<RewardCategory, string> = {
  drink: unsplash('photo-1509042239860-f550ce710b93', 800, 600),
  dessert: unsplash('photo-1551024506-0bccd828d307', 800, 600),
  free_item: unsplash('photo-1504674900247-0877df9cc836', 800, 600),
  discount: unsplash('photo-1555396273-367ea4eb4db5', 800, 600),
  vip: unsplash('photo-1414235077428-338989a2e8c0', 800, 600),
  special_reward: unsplash('photo-1464347755200-ca2363482b24', 800, 600),
}

export type RewardPreset = {
  id: string
  title: string
  required_stamps: number
  description: string
  image: string
}

export const REWARD_PRESETS_BY_CATEGORY: Record<VenueCategory, RewardPreset[]> = {
  cafe: [
    {
      id: 'coffee',
      title: 'Free coffee after 5 visits',
      required_stamps: 5,
      description: 'A free signature coffee for regulars.',
      image: unsplash('photo-1495474472287-4d71bcdd2085', 800, 600),
    },
    {
      id: 'pastry',
      title: 'Free pastry after 10 visits',
      required_stamps: 10,
      description: 'Sweet treat on the house for loyal guests.',
      image: unsplash('photo-1555507036-ab1f4038808a', 800, 600),
    },
    {
      id: 'vip',
      title: 'VIP skip-the-line after 15 visits',
      required_stamps: 15,
      description: 'Priority service for your best regulars.',
      image: unsplash('photo-1501339847302-ac426a4a7cbb', 800, 600),
    },
  ],
  bar: [
    {
      id: 'cocktail',
      title: 'Free cocktail after 5 visits',
      required_stamps: 5,
      description: 'Signature drink on the house.',
      image: unsplash('photo-1514362545857-3bc16c4c7d8e', 800, 600),
    },
    {
      id: 'discount',
      title: '20% off your tab after 10 visits',
      required_stamps: 10,
      description: 'Keep regulars coming back on busy nights.',
      image: unsplash('photo-1572116469696-31de0fa17a2a', 800, 600),
    },
    {
      id: 'round',
      title: 'Free round after 15 visits',
      required_stamps: 15,
      description: 'Celebrate loyalty with a round for the table.',
      image: unsplash('photo-1470337458703-46ad1756a187', 800, 600),
    },
  ],
  restaurant: [
    {
      id: 'starter',
      title: 'Free starter after 5 visits',
      required_stamps: 5,
      description: 'Welcome back with a complimentary starter.',
      image: unsplash('photo-1546069901-ba9599a7e63c', 800, 600),
    },
    {
      id: 'discount',
      title: '20% off after 10 visits',
      required_stamps: 10,
      description: 'A loyalty discount for returning diners.',
      image: unsplash('photo-1414235077428-338989a2e8c0', 800, 600),
    },
    {
      id: 'dessert',
      title: 'Free dessert after 15 visits',
      required_stamps: 15,
      description: 'End the meal on a high note.',
      image: unsplash('photo-1551024506-0bccd828d307', 800, 600),
    },
  ],
  bakery: [
    {
      id: 'pastry',
      title: 'Free pastry after 5 visits',
      required_stamps: 5,
      description: 'Pick any pastry from the counter.',
      image: unsplash('photo-1509440159596-0249088772ff', 800, 600),
    },
    {
      id: 'bread',
      title: 'Free loaf after 10 visits',
      required_stamps: 10,
      description: 'Fresh bread for your most loyal guests.',
      image: unsplash('photo-1486427946789-8ebfd54fb9a3', 800, 600),
    },
    {
      id: 'cake',
      title: 'Free slice of cake after 15 visits',
      required_stamps: 15,
      description: 'Celebrate milestones with something sweet.',
      image: unsplash('photo-1578985545062-69928b1d9587', 800, 600),
    },
  ],
}

export function rewardPresetsForCategory(category: string | null | undefined): RewardPreset[] {
  return REWARD_PRESETS_BY_CATEGORY[normalizeVenueCategory(category)]
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

export function categoryLabel(category: VenueCategory): string {
  const labels: Record<VenueCategory, string> = {
    cafe: 'Cafe',
    bar: 'Bar',
    restaurant: 'Restaurant',
    bakery: 'Bakery',
  }
  return labels[category]
}
