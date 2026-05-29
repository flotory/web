import type { RewardCategory } from '@/lib/rewardVisuals'

export type VenueCategory = 'cafe' | 'restaurant' | 'bar' | 'bakery'

/** Local default assets (downloaded from Unsplash and committed) */
function unsplash(photoId: string, width = 900, height?: number): string {
  const size = height ? `${width}x${height}` : `${width}`
  return `/images/defaults/${photoId}-${size}.jpg`
}

const VENUE_LOGO_DEFAULTS: Record<VenueCategory, string[]> = {
  cafe: [
    unsplash('photo-1501339847302-ac426a4a7cbb', 512, 512),
    unsplash('photo-1495474472287-4d71bcdd2085', 512, 512),
    unsplash('photo-1509042239860-f550ce710b93', 512, 512),
    unsplash('photo-1554118811-1e0d58224f24', 512, 512),
  ],
  bar: [
    unsplash('photo-1470337458703-46ad1756a187', 512, 512),
    unsplash('photo-1514933651103-005eec06c04b', 512, 512),
    unsplash('photo-1776763019214-9658490d8b65', 512, 512),
    unsplash('photo-1555396273-367ea4eb4db5', 512, 512),
  ],
  restaurant: [
    unsplash('photo-1414235077428-338989a2e8c0', 512, 512),
    unsplash('photo-1517248135467-4c7edcad34c4', 512, 512),
    unsplash('photo-1546069901-ba9599a7e63c', 512, 512),
    unsplash('photo-1504674900247-0877df9cc836', 512, 512),
  ],
  bakery: [
    unsplash('photo-1509440159596-0249088772ff', 512, 512),
    unsplash('photo-1555507036-ab1f4038808a', 512, 512),
    unsplash('photo-1578985545062-69928b1d9587', 512, 512),
    unsplash('photo-1711672284661-bd70e38f31b2', 512, 512),
  ],
}

const VENUE_COVER_DEFAULTS: Record<VenueCategory, string[]> = {
  cafe: [
    unsplash('photo-1554118811-1e0d58224f24', 1400, 700),
    unsplash('photo-1495474472287-4d71bcdd2085', 1400, 700),
    unsplash('photo-1501339847302-ac426a4a7cbb', 1400, 700),
    unsplash('photo-1509042239860-f550ce710b93', 1400, 700),
  ],
  bar: [
    unsplash('photo-1776763019214-9658490d8b65', 1400, 700),
    unsplash('photo-1514933651103-005eec06c04b', 1400, 700),
    unsplash('photo-1470337458703-46ad1756a187', 1400, 700),
    unsplash('photo-1555396273-367ea4eb4db5', 1400, 700),
  ],
  restaurant: [
    unsplash('photo-1517248135467-4c7edcad34c4', 1400, 700),
    unsplash('photo-1414235077428-338989a2e8c0', 1400, 700),
    unsplash('photo-1546069901-ba9599a7e63c', 1400, 700),
    unsplash('photo-1504674900247-0877df9cc836', 1400, 700),
  ],
  bakery: [
    unsplash('photo-1711672284661-bd70e38f31b2', 1400, 700),
    unsplash('photo-1509440159596-0249088772ff', 1400, 700),
    unsplash('photo-1555507036-ab1f4038808a', 1400, 700),
    unsplash('photo-1778940517177-3ff09530ef98', 1400, 700),
  ],
}

const REWARD_IMAGE_DEFAULTS: Record<RewardCategory, string> = {
  drink: unsplash('photo-1509042239860-f550ce710b93', 800, 600),
  dessert: unsplash('photo-1551024506-0bccd828d307', 800, 600),
  free_item: unsplash('photo-1504674900247-0877df9cc836', 800, 600),
  discount: unsplash('photo-1555396273-367ea4eb4db5', 800, 600),
  vip: unsplash('photo-1414235077428-338989a2e8c0', 800, 600),
  special_reward: unsplash('photo-1501339847302-ac426a4a7cbb', 800, 600),
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
      id: 'half-off',
      title: '50% off one coffee',
      required_stamps: 5,
      description: 'Half price on any coffee drink after your fifth stamp.',
      image: unsplash('photo-1509042239860-f550ce710b93', 800, 600),
    },
    {
      id: 'free-coffee-10',
      title: 'Free coffee',
      required_stamps: 10,
      description: 'A complimentary coffee on the house.',
      image: unsplash('photo-1495474472287-4d71bcdd2085', 800, 600),
    },
    {
      id: 'free-coffee-15',
      title: 'Free coffee',
      required_stamps: 15,
      description: 'Another free coffee for your most loyal regulars.',
      image: unsplash('photo-1501339847302-ac426a4a7cbb', 800, 600),
    },
  ],
  bar: [
    {
      id: 'half-off',
      title: '50% off one cocktail',
      required_stamps: 5,
      description: 'Half price on any signature cocktail after your fifth stamp.',
      image: unsplash('photo-1776763019214-9658490d8b65', 800, 600),
    },
    {
      id: 'free-cocktail-10',
      title: 'Free cocktail',
      required_stamps: 10,
      description: 'A complimentary cocktail on the house.',
      image: unsplash('photo-1470337458703-46ad1756a187', 800, 600),
    },
    {
      id: 'free-cocktail-15',
      title: 'Free cocktail',
      required_stamps: 15,
      description: 'Another free cocktail for your best regulars.',
      image: unsplash('photo-1514933651103-005eec06c04b', 800, 600),
    },
  ],
  restaurant: [
    {
      id: 'half-off',
      title: '50% off one starter',
      required_stamps: 5,
      description: 'Half price on any starter after your fifth stamp.',
      image: unsplash('photo-1414235077428-338989a2e8c0', 800, 600),
    },
    {
      id: 'free-starter-10',
      title: 'Free starter',
      required_stamps: 10,
      description: 'A complimentary starter on the house.',
      image: unsplash('photo-1546069901-ba9599a7e63c', 800, 600),
    },
    {
      id: 'free-starter-15',
      title: 'Free starter',
      required_stamps: 15,
      description: 'Another free starter for returning guests.',
      image: unsplash('photo-1504674900247-0877df9cc836', 800, 600),
    },
  ],
  bakery: [
    {
      id: 'half-off',
      title: '50% off one pastry',
      required_stamps: 5,
      description: 'Half price on any pastry after your fifth stamp.',
      image: unsplash('photo-1555396273-367ea4eb4db5', 800, 600),
    },
    {
      id: 'free-pastry-10',
      title: 'Free pastry',
      required_stamps: 10,
      description: 'A complimentary pastry from the counter.',
      image: unsplash('photo-1509440159596-0249088772ff', 800, 600),
    },
    {
      id: 'free-pastry-15',
      title: 'Free pastry',
      required_stamps: 15,
      description: 'Another free pastry for loyal guests.',
      image: unsplash('photo-1555507036-ab1f4038808a', 800, 600),
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

function hashSeed(seed: string): number {
  // djb2, stable and fast
  let hash = 5381
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i)
  }
  return Math.abs(hash)
}

function pickStable(list: string[], seed: string): string {
  if (!list.length) {
    return ''
  }

  return list[hashSeed(seed) % list.length]
}

export function defaultVenueLogoImage(category: VenueCategory, seed: string = category): string {
  return pickStable(VENUE_LOGO_DEFAULTS[category], seed)
}

export function defaultVenueCoverImage(category: VenueCategory, seed: string = category): string {
  return pickStable(VENUE_COVER_DEFAULTS[category], seed)
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
