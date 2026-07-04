export const VENUE_CATEGORIES = [
  { id: 'cafe', label: 'Cafe / Coffee shop' },
  { id: 'bakery', label: 'Bakery' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'bar', label: 'Bar / Pub' },
  { id: 'wine_bar', label: 'Wine bar' },
  { id: 'quick_service', label: 'Quick service / Takeaway' },
  { id: 'salon', label: 'Hair & beauty salon' },
  { id: 'spa', label: 'Spa & wellness' },
  { id: 'gym', label: 'Gym & fitness' },
  { id: 'retail', label: 'Retail & boutique' },
  { id: 'pet_care', label: 'Pet grooming & care' },
  { id: 'other', label: 'Other', description: 'Any business with repeat customers can use Flotory.' },
] as const

export type VenueCategory = (typeof VENUE_CATEGORIES)[number]['id']

export const VENUE_CATEGORY_IDS: VenueCategory[] = VENUE_CATEGORIES.map((item) => item.id)

export const VENUE_CATEGORY_GROUPS: Array<{ label: string; ids: VenueCategory[] }> = [
  {
    label: 'Food & drink',
    ids: ['cafe', 'bakery', 'restaurant', 'bar', 'wine_bar', 'quick_service'],
  },
  {
    label: 'Services & wellness',
    ids: ['salon', 'spa', 'gym'],
  },
  {
    label: 'Retail & other',
    ids: ['retail', 'pet_care', 'other'],
  },
]

/** Maps each category to default image / reward preset groups. */
export type VenueCategoryAssetGroup = 'cafe' | 'bakery' | 'restaurant' | 'bar'

const CATEGORY_ASSET_GROUP: Record<VenueCategory, VenueCategoryAssetGroup> = {
  cafe: 'cafe',
  bakery: 'bakery',
  restaurant: 'restaurant',
  bar: 'bar',
  wine_bar: 'bar',
  quick_service: 'restaurant',
  salon: 'cafe',
  spa: 'cafe',
  gym: 'cafe',
  retail: 'cafe',
  pet_care: 'cafe',
  other: 'cafe',
}

export function isVenueCategory(value: string | null | undefined): value is VenueCategory {
  return VENUE_CATEGORY_IDS.includes(value as VenueCategory)
}

export function normalizeVenueCategory(category: string | null | undefined): VenueCategory {
  if (category && isVenueCategory(category)) {
    return category
  }

  return 'cafe'
}

export function categoryLabel(category: VenueCategory | string | null | undefined): string {
  const normalized = normalizeVenueCategory(category ?? null)
  return VENUE_CATEGORIES.find((item) => item.id === normalized)?.label ?? 'Venue'
}

export function venueCategoryAssetGroup(category: VenueCategory | string | null | undefined): VenueCategoryAssetGroup {
  return CATEGORY_ASSET_GROUP[normalizeVenueCategory(category ?? null)]
}
