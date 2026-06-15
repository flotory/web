import { describe, expect, it } from 'vitest'

import {
  buildScanLandingQuickFacts,
  categoryEmoji,
  formatHeroRewardLine,
  formatHeroSubtitle,
  formatMemberStampCaption,
  formatSocialCount,
  formatUnlockRequirement,
  membershipFromWalletCard,
  progressDotSymbols,
} from './venueScanLanding'

describe('venueScanLanding mobile', () => {
  it('formats hero line and progress dots', () => {
    expect(formatHeroRewardLine({ id: 1, title: 'Free coffee', required_stamps: 10 }, 'Coffee Lab')).toBe('Free coffee')
    expect(formatHeroRewardLine(null, 'Coffee Lab')).toBe('Collect stamps at Coffee Lab and unlock rewards.')
    expect(formatUnlockRequirement(3)).toBe('Unlocks after 3 stamps')
    expect(formatUnlockRequirement(1)).toBe('Unlocks after 1 stamp')
    expect(progressDotSymbols(10, 5)).toContain('●')
    expect(formatHeroSubtitle('Coffee Lab')).toContain('Coffee Lab')
  })

  it('builds quick facts and social proof labels', () => {
    expect(buildScanLandingQuickFacts({ firstRewardStamps: 3, milestoneCount: 2 })).toEqual([
      { icon: 'stamps', text: 'First reward unlocks after 3 stamps' },
      { icon: 'rewards', text: '2 rewards available' },
      { icon: 'join', text: 'Takes less than 30 seconds to join' },
    ])
    expect(
      buildScanLandingQuickFacts({
        firstRewardStamps: 5,
        milestoneCount: 1,
        membership: { stamps: 4, target: 5, stampsToNext: 1, pendingRewardsCount: 0 },
      }),
    ).toEqual([
      { icon: 'stamps', text: '4 / 5 stamps on your card' },
      { icon: 'stamps', text: '1 stamp to next reward' },
      { icon: 'nfc', text: 'Tap the NFC stand at the counter to collect stamps' },
    ])
    expect(formatMemberStampCaption({ stamps: 4, target: 5, stampsToNext: 1, pendingRewardsCount: 0 })).toBe(
      '1 stamp to your next reward',
    )
    expect(membershipFromWalletCard({ stamps: 7, summary: { stamps: 7, next_reward_stamps: 10, stamps_to_next: 3 } })).toEqual({
      stamps: 7,
      target: 10,
      stampsToNext: 3,
      pendingRewardsCount: 0,
    })
    expect(formatSocialCount(0, 'member', 'members')).toBeNull()
    expect(formatSocialCount(1, 'member', 'members')).toBe('1 member')
    expect(formatSocialCount(12, 'member', 'members')).toBe('12 members')
  })

  it('maps venue categories to emoji', () => {
    expect(categoryEmoji('cafe')).toBe('☕')
    expect(categoryEmoji('bar')).toBe('🍸')
    expect(categoryEmoji('unknown')).toBe('🎁')
  })
})
