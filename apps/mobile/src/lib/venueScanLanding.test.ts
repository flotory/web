import { describe, expect, it } from 'vitest'

import { exampleFilledStamps, formatHeroRewardLine, progressDotSymbols } from './venueScanLanding'

describe('venueScanLanding mobile', () => {
  it('formats hero line and progress dots', () => {
    expect(formatHeroRewardLine({ id: 1, title: 'Free coffee', required_stamps: 10 }, 'Coffee Lab')).toBe('Free coffee')
    expect(exampleFilledStamps(10)).toBe(5)
    expect(progressDotSymbols(10, 5)).toContain('●')
  })
})
