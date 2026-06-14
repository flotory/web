import { describe, expect, it } from 'vitest'

import {
  formatJoinSocialProof,
  formatVenueJoinRewardHeadline,
  formatVisitsToUnlock,
} from './venueJoinBridge'

describe('venueJoinBridge', () => {
  it('formats reward headlines and visit counts', () => {
    expect(formatVenueJoinRewardHeadline({ title: '50% off for a coffee', required_stamps: 5 })).toBe(
      '50% off for a coffee',
    )
    expect(formatVenueJoinRewardHeadline(null)).toBe('Collect stamps and unlock rewards')
    expect(formatVisitsToUnlock(5)).toBe('5 visits to unlock')
    expect(formatVisitsToUnlock(1)).toBe('1 visit to unlock')
  })

  it('shows social proof only when counts are meaningful', () => {
    expect(formatJoinSocialProof({ members_count: 2, rewards_claimed_count: 1 })).toBeNull()
    expect(formatJoinSocialProof({ members_count: 6, rewards_claimed_count: 1 })).toBe(
      'Join others collecting rewards here',
    )
    expect(formatJoinSocialProof({ members_count: 20, rewards_claimed_count: 3 })).toBe(
      '20 people already collect stamps here',
    )
  })
})
