import { describe, expect, it } from 'vitest'

import type { NfcStampResponse } from './nfcStamp'
import {
  cardRouteFromNfcStamp,
  nfcResponseToStampPayload,
  rewardEarnedThisScan,
  slotsForStampIncrease,
  stampBannerCopy,
} from './stampLiveUpdate'
import type { RewardRef, VenueRef, WalletCard } from '../types/loyalty'
import type { StampAddedPayload } from '../types/realtime'

const venue: VenueRef = { id: 10, name: 'Demo Cafe', slug: 'demo-cafe' }

function reward(id: number, required_stamps: number): RewardRef {
  return { id, title: `Reward ${required_stamps}`, required_stamps }
}

function card(stamps: number): WalletCard {
  return { id: 42, venue_id: venue.id, stamps, venue }
}

function nfcResponse(overrides: Partial<NfcStampResponse> = {}): NfcStampResponse {
  return {
    scan_type: 'nfc',
    customer: card(4),
    venue,
    previous_stamps: 3,
    added_stamps: 1,
    stamps: 4,
    next_reward: reward(1, 5),
    available_rewards: [],
    milestones: [],
    current_cycle: 1,
    cycle_completed: false,
    message: '+1 stamp added',
    occurred_at: '2026-06-04T19:00:00.000Z',
    ...overrides,
  }
}

describe('nfcResponseToStampPayload', () => {
  it('maps the stamp response into a realtime payload', () => {
    const payload = nfcResponseToStampPayload(nfcResponse())

    expect(payload).toMatchObject({
      customer: card(4),
      venue,
      previous_stamps: 3,
      added_stamps: 1,
      stamps: 4,
      cycle_completed: false,
    })
  })

  it('falls back to the customer venue when top-level venue is missing', () => {
    const payload = nfcResponseToStampPayload(
      nfcResponse({
        venue: null,
        customer: card(4),
      }),
    )

    expect(payload.venue).toEqual(venue)
  })

  it('throws when no venue is present', () => {
    expect(() =>
      nfcResponseToStampPayload(
        nfcResponse({
          venue: null,
          customer: { id: 42, venue_id: 10, stamps: 4 },
        }),
      ),
    ).toThrow('Venue missing from stamp response.')
  })
})

describe('cardRouteFromNfcStamp', () => {
  it('builds the card screen route from the customer and venue ids', () => {
    expect(cardRouteFromNfcStamp(nfcResponse())).toEqual({
      pathname: '/card/[cardId]',
      params: { cardId: '42', venueId: '10' },
    })
  })
})

describe('slotsForStampIncrease', () => {
  it('returns filled slots for a normal stamp increase', () => {
    expect(slotsForStampIncrease(3, 2, false, 15)).toEqual([4, 5])
  })

  it('fills the remainder of the cycle when it completes', () => {
    expect(slotsForStampIncrease(14, 1, true, 15)).toEqual([15])
  })
})

describe('rewardEarnedThisScan', () => {
  it('prefers a newly listed unlock over threshold crossing', () => {
    const payload: StampAddedPayload = {
      customer: card(5),
      venue,
      previous_stamps: 4,
      added_stamps: 1,
      stamps: 5,
      next_reward: reward(2, 10),
      available_rewards: [reward(1, 5)],
      milestones: [],
      current_cycle: 1,
      cycle_completed: false,
      message: '+1 stamp added',
      occurred_at: '2026-06-04T19:00:00.000Z',
    }

    expect(rewardEarnedThisScan(payload, new Set(), 15)).toEqual(reward(1, 5))
  })

  it('returns the highest crossed reward when the unlock list did not change', () => {
    const available = [reward(1, 5), reward(2, 10)]
    const payload: StampAddedPayload = {
      customer: card(10),
      venue,
      previous_stamps: 8,
      added_stamps: 2,
      stamps: 10,
      next_reward: null,
      available_rewards: available,
      milestones: [],
      current_cycle: 1,
      cycle_completed: false,
      message: '+2 stamps added',
      occurred_at: '2026-06-04T19:00:00.000Z',
    }

    expect(rewardEarnedThisScan(payload, new Set(available.map((row) => row.id)), 15)).toEqual(reward(2, 10))
  })
})

describe('stampBannerCopy', () => {
  it('uses singular and plural titles and cycle-complete copy', () => {
    expect(stampBannerCopy(nfcResponseToStampPayload(nfcResponse()))).toEqual({
      title: '+1 stamp added',
      subtitle: 'Demo Cafe',
    })

    expect(
      stampBannerCopy(
        nfcResponseToStampPayload(
          nfcResponse({
            added_stamps: 2,
            cycle_completed: true,
            message: 'Cycle complete!',
          }),
        ),
      ),
    ).toEqual({
      title: 'Cycle complete!',
      subtitle: 'Demo Cafe',
    })
  })
})
