import { describe, expect, it } from 'vitest'

import { branchAnchorFor, venueStatsLine, venueSubtitle } from './venueLocationCard'
import type { Venue } from '@/types'

function venue(partial: Partial<Venue> & Pick<Venue, 'id' | 'name' | 'slug'>): Venue {
  return {
    brand_id: 1,
    is_primary: true,
    category: 'cafe',
    ...partial,
  }
}

describe('venueSubtitle', () => {
  it('prefers address over category', () => {
    expect(venueSubtitle(venue({ id: 1, name: 'A', slug: 'a', address: '1 Main St' }))).toBe('1 Main St')
    expect(venueSubtitle(venue({ id: 1, name: 'A', slug: 'a', address: '' }))).toBe('Cafe / Coffee shop')
  })
})

describe('venueStatsLine', () => {
  it('pluralizes counts correctly', () => {
    expect(venueStatsLine(venue({ id: 1, name: 'A', slug: 'a', customers_count: 1, visits_count: 2, rewards_count: 3 })))
      .toBe('1 guest · 2 visits · 3 rewards')
    expect(venueStatsLine(venue({ id: 1, name: 'A', slug: 'a' }))).toBe('0 guests · 0 visits · 0 rewards')
  })
})

describe('branchAnchorFor', () => {
  const primary = venue({ id: 1, name: 'Primary', slug: 'primary', brand_id: 10, is_primary: true })
  const branch = venue({ id: 2, name: 'Branch', slug: 'branch', brand_id: 10, is_primary: false })

  it('returns primary venue when anchoring from a branch', () => {
    expect(branchAnchorFor([primary, branch], branch).id).toBe(1)
    expect(branchAnchorFor([primary, branch], primary).id).toBe(1)
  })
})
