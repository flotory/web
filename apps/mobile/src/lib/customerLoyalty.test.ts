import { describe, expect, it } from 'vitest'

import { buildStampPayloadFromCardDetail } from './buildStampPayload'
import { buildCardVenueRewardSlides } from './cardVenueRewardSlides'
import { invalidateCustomerRewardCaches } from './customerData'
import { readCache, writeCache } from './resourceCache'
import { stampUpdateSignature } from './stampLiveUpdate'
import type { CardDetailPayload } from './customerData'
import type { MilestoneProgress, RewardRef, VenueRef, WalletCard } from '../types/loyalty'
import type { StampAddedPayload } from '../types/realtime'

const venue: VenueRef = { id: 10, name: 'Demo Cafe', slug: 'demo-cafe' }

function reward(id: number, required_stamps: number, title = `Reward ${required_stamps}`): RewardRef {
  return { id, title, required_stamps }
}

function milestone(id: number, required_stamps: number, claimed = false): MilestoneProgress {
  return { id, title: `Reward ${required_stamps}`, required_stamps, claimed }
}

function card(stamps: number): WalletCard {
  return { id: 42, venue_id: venue.id, stamps, venue }
}

function detail(previousStamps: number, nextStamps: number): CardDetailPayload {
  const milestones = [milestone(1, 5), milestone(2, 10), milestone(3, 15)]

  return {
    active_card: card(nextStamps),
    next_reward: nextStamps === 0 ? reward(1, 5, '50% off coffee') : reward(3, 15, 'Free coffee'),
    available_rewards: previousStamps >= 14 && nextStamps === 0 ? [reward(3, 15, 'Free coffee')] : [],
    journey: {
      current_cycle: nextStamps === 0 ? 2 : 1,
      current_stamps: nextStamps,
      milestones,
    },
  }
}

function stampPayload(overrides: Partial<StampAddedPayload> = {}): StampAddedPayload {
  return {
    customer: card(4),
    venue,
    previous_stamps: 3,
    added_stamps: 1,
    stamps: 4,
    next_reward: reward(1, 5),
    available_rewards: [],
    milestones: [milestone(1, 5)],
    current_cycle: 1,
    cycle_completed: false,
    message: '+1 stamp added',
    occurred_at: '2026-06-04T19:00:00.000Z',
    ...overrides,
  }
}

describe('buildCardVenueRewardSlides', () => {
  it('returns sorted ready and next reward slides without TypeScript union ambiguity', () => {
    const slides = buildCardVenueRewardSlides(
      [milestone(3, 15), milestone(1, 5), milestone(2, 10, true)],
      4,
      [{ unlock_id: 99, reward: reward(1, 5) }],
    )

    expect(slides).toEqual([
      {
        id: 'reward-1',
        kind: 'ready',
        milestone: milestone(1, 5),
        unlockId: 99,
      },
      {
        id: 'reward-3',
        kind: 'next',
        milestone: milestone(3, 15),
        stampsToGo: 11,
      },
    ])
  })

  it('keeps a next slide visible even when the user is already at the milestone', () => {
    expect(buildCardVenueRewardSlides([milestone(1, 5)], 5)).toEqual([
      {
        id: 'reward-1',
        kind: 'next',
        milestone: milestone(1, 5),
        stampsToGo: 0,
      },
    ])
  })

  it('lists ready rewards before upcoming rewards regardless of stamp threshold', () => {
    const slides = buildCardVenueRewardSlides(
      [milestone(1, 5), milestone(2, 10)],
      4,
      [{ unlock_id: 42, reward: reward(2, 10) }],
    )

    expect(slides.map((slide) => slide.kind)).toEqual(['ready', 'next'])
    expect(slides[0]).toMatchObject({ kind: 'ready', unlockId: 42, milestone: milestone(2, 10) })
    expect(slides[1]).toMatchObject({ kind: 'next', stampsToGo: 1, milestone: milestone(1, 5) })
  })
})

describe('buildStampPayloadFromCardDetail', () => {
  it('detects a completed cycle when stamps reset from 14 to 0', () => {
    const payload = buildStampPayloadFromCardDetail(14, detail(14, 0))

    expect(payload).toMatchObject({
      previous_stamps: 14,
      added_stamps: 1,
      stamps: 0,
      cycle_completed: true,
      current_cycle: 2,
      message: 'Cycle complete at Demo Cafe!',
    })
  })

  it('ignores unchanged card detail', () => {
    expect(buildStampPayloadFromCardDetail(4, detail(4, 4))).toBeNull()
  })
})

describe('stampUpdateSignature', () => {
  it('changes when cycle completion changes so navigation can dedupe correctly', () => {
    const normal = stampUpdateSignature(stampPayload())
    const completed = stampUpdateSignature(stampPayload({ cycle_completed: true, stamps: 0 }))

    expect(normal).toBe('42:1:3:4:1:false')
    expect(completed).toBe('42:1:3:0:1:true')
  })
})

describe('customer reward cache invalidation', () => {
  it('clears customer-scoped reward/card caches for the current token only', () => {
    const token = 'abcdefghijklmnop'
    const otherToken = 'zzzzzzzzzzzzzzzz'
    const customerPrefix = `customer:${token.slice(0, 12)}`
    const otherPrefix = `customer:${otherToken.slice(0, 12)}`

    writeCache(`${customerPrefix}:cards`, { ok: true })
    writeCache(`${customerPrefix}:rewards-wallet`, { ok: true })
    writeCache(`${otherPrefix}:cards`, { ok: true })

    invalidateCustomerRewardCaches(token)

    expect(readCache(`${customerPrefix}:cards`)).toBeNull()
    expect(readCache(`${customerPrefix}:rewards-wallet`)).toBeNull()
    expect(readCache(`${otherPrefix}:cards`)).toEqual({ ok: true })
  })
})
