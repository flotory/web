import { describe, expect, it } from 'vitest'

import {
  formatJoinSocialProof,
  formatStampsToUnlock,
  formatVenueJoinRewardHeadline,
  NFC_RETURN_STAMP_HEADLINE,
  VENUE_JOIN_NFC_EDUCATION,
} from './venueJoinBridge'

describe('venueJoinBridge', () => {
  it('formats reward headlines and stamp counts', () => {
    expect(formatVenueJoinRewardHeadline({ title: '50% off for a coffee', required_stamps: 5 })).toBe(
      '50% off for a coffee',
    )
    expect(formatVenueJoinRewardHeadline(null)).toBe('Collect stamps and unlock rewards')
    expect(formatStampsToUnlock(5)).toBe('5 stamps to unlock')
    expect(formatStampsToUnlock(1)).toBe('1 stamp to unlock')
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

  it('exposes NFC stamp education copy for the join bridge', () => {
    expect(VENUE_JOIN_NFC_EDUCATION.headline).toBe(NFC_RETURN_STAMP_HEADLINE)
    expect(VENUE_JOIN_NFC_EDUCATION.detail).toContain('collect stamps')
  })
})
