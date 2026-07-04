import { describe, expect, it } from 'vitest'

import {
  categoryLabel,
  normalizeVenueCategory,
  VENUE_CATEGORY_IDS,
  venueCategoryAssetGroup,
} from '@/lib/venueCategories'

describe('venueCategories', () => {
  it('includes 12 categories with other as the catch-all', () => {
    expect(VENUE_CATEGORY_IDS).toHaveLength(12)
    expect(VENUE_CATEGORY_IDS).toContain('other')
    expect(VENUE_CATEGORY_IDS).toContain('wine_bar')
    expect(VENUE_CATEGORY_IDS).toContain('salon')
  })

  it('normalizes unknown values to cafe', () => {
    expect(normalizeVenueCategory('salon')).toBe('salon')
    expect(normalizeVenueCategory('tea house')).toBe('cafe')
    expect(normalizeVenueCategory(null)).toBe('cafe')
  })

  it('returns human labels and asset groups', () => {
    expect(categoryLabel('other')).toBe('Other')
    expect(categoryLabel('pet_care')).toBe('Pet grooming & care')
    expect(venueCategoryAssetGroup('wine_bar')).toBe('bar')
    expect(venueCategoryAssetGroup('other')).toBe('cafe')
  })
})
