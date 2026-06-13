import { describe, expect, it } from 'vitest'

import {
  buildScanLandingQuickFacts,
  categoryEmoji,
  formatHeroRewardLine,
  formatHeroSubtitle,
  formatSocialCount,
  formatUnlockRequirement,
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
