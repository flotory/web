import { describe, expect, it } from 'vitest'

import { buildHomeActivity, findWalletCardForLoyaltyVenue } from './customerData'
import type { RewardWalletItem, WalletCard } from '../types/loyalty'

const venue = { id: 10, name: 'Demo Cafe', slug: 'demo-cafe' }

function card(id: number, stamps: number, created_at?: string): WalletCard {
  return {
    id,
    venue_id: venue.id,
    stamps,
    venue,
    created_at,
    recent_visits: created_at
      ? [{ id: id * 10, created_at }]
      : [],
  }
}

function readyItem(unlockId: number): RewardWalletItem {
  return {
    unlock_id: unlockId,
    reward: { id: 1, title: 'Free coffee', required_stamps: 5 },
    customer: card(99, 5),
  }
}

describe('buildHomeActivity', () => {
  it('prioritizes visits and unlocks before joins and caps at three rows', () => {
    const rows = buildHomeActivity(
      [card(1, 4, '2026-06-01T10:00:00Z'), card(2, 2, '2026-06-02T10:00:00Z')],
      [readyItem(7), readyItem(8)],
    )

    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.id)).toEqual(['visit-10', 'visit-20', 'unlock-7'])
  })

  it('includes join rows when there is room after visits', () => {
    const rows = buildHomeActivity([card(1, 4, '2026-06-01T10:00:00Z')], [])

    expect(rows.map((row) => row.id)).toEqual(['visit-10', 'join-1'])
  })

  it('dedupes rows with the same id', () => {
    const single = card(1, 4, '2026-06-01T10:00:00Z')

    const rows = buildHomeActivity([single, { ...single }], [])

    expect(rows.filter((row) => row.id === 'join-1')).toHaveLength(1)
  })
})

describe('findWalletCardForLoyaltyVenue', () => {
  it('matches cards by loyalty venue id', () => {
    const cards = [card(1, 4), { ...card(2, 2), venue_id: 99 }]
    expect(findWalletCardForLoyaltyVenue(cards, 10)?.id).toBe(1)
    expect(findWalletCardForLoyaltyVenue(cards, 99)?.id).toBe(2)
    expect(findWalletCardForLoyaltyVenue(cards, 404)).toBeUndefined()
  })
})
