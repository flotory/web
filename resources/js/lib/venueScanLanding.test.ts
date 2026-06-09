import { describe, expect, it } from 'vitest'

import {
  buildScanLandingQuickFacts,
  exampleFilledStamps,
  formatHeroRewardLine,
  formatHeroSubtitle,
  formatSocialCount,
  progressDotSymbols,
} from '@/lib/venueScanLanding'

describe('venueScanLanding', () => {
  it('formats hero reward from milestone title', () => {
    expect(
      formatHeroRewardLine(
        { id: 1, title: 'Buy 10 coffees, get 1 free', description: null, image: null, required_stamps: 10 },
        'Coffee Lab',
      ),
    ).toBe('Buy 10 coffees, get 1 free')
  })

  it('formats hero subtitle with venue name', () => {
    expect(formatHeroSubtitle('Demo Cafe')).toBe(
      'Collect stamps every visit and unlock rewards from Demo Cafe.',
    )
  })

  it('builds quick facts from milestone data', () => {
    expect(
      buildScanLandingQuickFacts({ firstRewardStamps: 3, milestoneCount: 3 }),
    ).toEqual([
      { icon: 'stamps', text: '3 stamps to unlock your first reward' },
      { icon: 'rewards', text: '3 rewards available' },
      { icon: 'join', text: 'Takes less than 30 seconds to join' },
    ])
  })

  it('builds example progress without looking complete', () => {
    expect(exampleFilledStamps(10)).toBe(5)
    expect(progressDotSymbols(10, 5)).toContain('●')
  })

  it('formats social proof counts', () => {
    expect(formatSocialCount(0, 'member', 'members')).toBeNull()
    expect(formatSocialCount(1, 'member', 'members')).toBe('1 member')
    expect(formatSocialCount(180, 'member', 'members')).toBe('180 members')
  })
})
