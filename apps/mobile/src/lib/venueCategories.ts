import type { ComponentProps } from 'react'
import type { TFunction } from 'i18next'
import type { Ionicons } from '@expo/vector-icons'

type IoniconName = ComponentProps<typeof Ionicons>['name']

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
  { id: 'other', label: 'Other' },
] as const

export type VenueCategory = (typeof VENUE_CATEGORIES)[number]['id']

export type VenueCategoryAssetGroup = 'cafe' | 'bakery' | 'restaurant' | 'bar'

const VENUE_CATEGORY_IDS = new Set<string>(VENUE_CATEGORIES.map((item) => item.id))

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

const LEGACY_FOOD_CATEGORIES = new Set(['restaurant', 'bar', 'wine_bar', 'quick_service'])
const LEGACY_DESSERT_CATEGORIES = new Set(['bakery'])
const LEGACY_COFFEE_CATEGORIES = new Set(['cafe'])
const LEGACY_RETAIL_CATEGORIES = new Set(['retail', 'pet_care', 'other', 'salon', 'spa', 'gym'])

export function normalizeVenueCategory(category: string | null | undefined): VenueCategory {
  const key = (category ?? '').toLowerCase()
  if (VENUE_CATEGORY_IDS.has(key)) {
    return key as VenueCategory
  }
  return 'cafe'
}

export function formatVenueCategoryLabel(category: string | null | undefined, t: TFunction): string {
  if (!category) return t('venues.categoryLoyalty')
  const normalized = normalizeVenueCategory(category)
  const found = VENUE_CATEGORIES.find((item) => item.id === normalized)
  return found ? t(`venues.cat_${found.id}`) : t('common.venue')
}

export function venueCategoryAssetGroup(category: string | null | undefined): VenueCategoryAssetGroup {
  return CATEGORY_ASSET_GROUP[normalizeVenueCategory(category)]
}

export function matchesDiscoverCategoryFilter(
  category: string | null | undefined,
  filter: 'all' | 'coffee' | 'food' | 'desserts' | 'more',
): boolean {
  const normalized = normalizeVenueCategory(category)
  switch (filter) {
    case 'all':
      return true
    case 'coffee':
      return LEGACY_COFFEE_CATEGORIES.has(normalized)
    case 'food':
      return LEGACY_FOOD_CATEGORIES.has(normalized)
    case 'desserts':
      return LEGACY_DESSERT_CATEGORIES.has(normalized)
    case 'more':
      return LEGACY_RETAIL_CATEGORIES.has(normalized)
    default:
      return true
  }
}

export function categoryEmoji(category?: string | null): string {
  const value = normalizeVenueCategory(category)
  if (value === 'cafe') return '☕'
  if (value === 'bakery') return '🥐'
  if (value === 'restaurant' || value === 'quick_service') return '🍽️'
  if (value === 'bar' || value === 'wine_bar') return '🍸'
  if (value === 'salon') return '💇'
  if (value === 'spa') return '🧖'
  if (value === 'gym') return '💪'
  if (value === 'retail') return '🛍️'
  if (value === 'pet_care') return '🐾'
  return '🎁'
}

export function venueCategoryIcon(category?: string | null): IoniconName {
  const value = normalizeVenueCategory(category)
  if (value === 'cafe') return 'cafe-outline'
  if (value === 'bakery') return 'ice-cream-outline'
  if (value === 'restaurant' || value === 'quick_service') return 'restaurant-outline'
  if (value === 'bar' || value === 'wine_bar') return 'wine-outline'
  if (value === 'salon') return 'cut-outline'
  if (value === 'spa') return 'leaf-outline'
  if (value === 'gym') return 'barbell-outline'
  if (value === 'retail') return 'bag-outline'
  if (value === 'pet_care') return 'paw-outline'
  return 'storefront-outline'
}
