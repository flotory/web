import { describe, expect, it } from 'vitest'

import { buildStampPayloadFromCardDetail } from './buildStampPayload'
import type { CardDetailPayload } from './customerData'
import type { VenueRef, WalletCard } from '../types/loyalty'

const venue: VenueRef = { id: 1, name: 'Demo Cafe', slug: 'demo-cafe' }

function card(stamps: number): WalletCard {
  return { id: 10, venue_id: 1, brand_id: 1, stamps, venue }
}

function detail(stamps: number, overrides: Partial<CardDetailPayload> = {}): CardDetailPayload {
  return {
    active_card: card(stamps),
    next_reward: { id: 1, title: 'Free coffee', required_stamps: 5 },
    available_rewards: [],
    journey: {
      current_cycle: 1,
      milestones: [{ required_stamps: 5, reward_id: 1, title: 'Free coffee' }],
    },
    ...overrides,
  }
}

describe('buildStampPayloadFromCardDetail', () => {
  it('returns null when card detail is missing venue', () => {
    expect(buildStampPayloadFromCardDetail(0, { ...detail(1), active_card: null })).toBeNull()
  })

  it('returns null when stamp count did not increase', () => {
    expect(buildStampPayloadFromCardDetail(4, detail(4))).toBeNull()
  })

  it('builds payload when stamps increase', () => {
    const payload = buildStampPayloadFromCardDetail(3, detail(4))

    expect(payload).toMatchObject({
      previous_stamps: 3,
      added_stamps: 1,
      stamps: 4,
      cycle_completed: false,
      venue,
    })
  })

  it('detects cycle completion when stamps reset to zero', () => {
    const payload = buildStampPayloadFromCardDetail(5, detail(0))

    expect(payload).toMatchObject({
      previous_stamps: 5,
      stamps: 0,
      cycle_completed: true,
    })
  })
})
