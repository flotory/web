import {
  categoryLabel,
  normalizeVenueCategory,
  venueCategoryAssetGroup,
  type VenueCategory,
  type VenueCategoryAssetGroup,
} from '@/lib/venueCategories'

export type { VenueCategory }
export { categoryLabel, normalizeVenueCategory }

/** Local default assets (downloaded from Unsplash and committed) */
function unsplash(photoId: string, width = 900, height?: number): string {
  const size = height ? `${width}x${height}` : `${width}`
  return `/images/defaults/${photoId}-${size}.jpg`
}

const VENUE_LOGO_DEFAULTS: Record<VenueCategoryAssetGroup, string[]> = {
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

const VENUE_COVER_DEFAULTS: Record<VenueCategoryAssetGroup, string[]> = {
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

/** Default milestone image when a reward has no custom upload (512×512). */
export const DEFAULT_REWARD_IMAGE = '/images/defaults/rewards/default-reward.png'

/** Removed stock reward art — remap to {@link DEFAULT_REWARD_IMAGE}. */
export const LEGACY_DEFAULT_REWARD_IMAGES = [
  '/images/defaults/rewards/ice-cream-cone.png',
  '/images/defaults/rewards/free-coffee.png',
  '/images/defaults/rewards/chocolate-cake.png',
] as const

export function normalizeRewardImagePath(path: string | null | undefined): string | null {
  if (typeof path !== 'string' || path.trim() === '') {
    return null
  }

  if ((LEGACY_DEFAULT_REWARD_IMAGES as readonly string[]).includes(path)) {
    return DEFAULT_REWARD_IMAGE
  }

  return path
}

export type RewardPreset = {
  id: string
  title: string
  required_stamps: number
  description: string
  image: string
}

const REWARD_PRESETS_BY_GROUP: Record<VenueCategoryAssetGroup, RewardPreset[]> = {
  cafe: [
    {
      id: 'half-off-ice-cream',
      title: '50% off ice cream',
      required_stamps: 5,
      description: 'Half price on any ice cream after your fifth stamp.',
      image: DEFAULT_REWARD_IMAGE,
    },
    {
      id: 'free-coffee-10',
      title: 'Free coffee',
      required_stamps: 10,
      description: 'A complimentary coffee on the house.',
      image: DEFAULT_REWARD_IMAGE,
    },
    {
      id: 'free-cake-15',
      title: 'Free piece of cake',
      required_stamps: 15,
      description: 'A complimentary slice of cake for loyal regulars.',
      image: DEFAULT_REWARD_IMAGE,
    },
  ],
  bar: [
    {
      id: 'half-off',
      title: '50% off one cocktail',
      required_stamps: 5,
      description: 'Half price on any signature cocktail after your fifth stamp.',
      image: DEFAULT_REWARD_IMAGE,
    },
    {
      id: 'free-cocktail-10',
      title: 'Free cocktail',
      required_stamps: 10,
      description: 'A complimentary cocktail on the house.',
      image: DEFAULT_REWARD_IMAGE,
    },
    {
      id: 'free-cocktail-15',
      title: 'Free cocktail',
      required_stamps: 15,
      description: 'Another free cocktail for your best regulars.',
      image: DEFAULT_REWARD_IMAGE,
    },
  ],
  restaurant: [
    {
      id: 'half-off',
      title: '50% off one starter',
      required_stamps: 5,
      description: 'Half price on any starter after your fifth stamp.',
      image: DEFAULT_REWARD_IMAGE,
    },
    {
      id: 'free-starter-10',
      title: 'Free starter',
      required_stamps: 10,
      description: 'A complimentary starter on the house.',
      image: DEFAULT_REWARD_IMAGE,
    },
    {
      id: 'free-starter-15',
      title: 'Free starter',
      required_stamps: 15,
      description: 'Another free starter for returning guests.',
      image: DEFAULT_REWARD_IMAGE,
    },
  ],
  bakery: [
    {
      id: 'half-off',
      title: '50% off one pastry',
      required_stamps: 5,
      description: 'Half price on any pastry after your fifth stamp.',
      image: DEFAULT_REWARD_IMAGE,
    },
    {
      id: 'free-pastry-10',
      title: 'Free pastry',
      required_stamps: 10,
      description: 'A complimentary pastry from the counter.',
      image: DEFAULT_REWARD_IMAGE,
    },
    {
      id: 'free-pastry-15',
      title: 'Free pastry',
      required_stamps: 15,
      description: 'Another free pastry for loyal guests.',
      image: DEFAULT_REWARD_IMAGE,
    },
  ],
}

export function rewardPresetsForCategory(category: string | null | undefined): RewardPreset[] {
  return REWARD_PRESETS_BY_GROUP[venueCategoryAssetGroup(category)]
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
  return pickStable(VENUE_LOGO_DEFAULTS[venueCategoryAssetGroup(category)], seed)
}

export function defaultVenueCoverImage(category: VenueCategory, seed: string = category): string {
  return pickStable(VENUE_COVER_DEFAULTS[venueCategoryAssetGroup(category)], seed)
}

export function defaultRewardImage(): string {
  return DEFAULT_REWARD_IMAGE
}
