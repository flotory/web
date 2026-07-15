import { describe, expect, it } from 'vitest'

import { walletMilestoneProgress } from './walletMilestoneProgress'
import type { CardSummary } from '../types/loyalty'

describe('walletMilestoneProgress', () => {
  it('uses next_reward_stamps as milestone target', () => {
    const summary: CardSummary = {
      stamps: 4,
      next_reward_stamps: 5,
      stamps_to_next: 1,
    }

    expect(walletMilestoneProgress(summary)).toEqual({
      current: 4,
      target: 5,
      toNext: 1,
      milestoneStamp: 5,
    })
  })

  it('falls back to max_stamps and clamps current stamps', () => {
    const summary: CardSummary = {
      stamps: 12,
      max_stamps: 10,
    }

    expect(walletMilestoneProgress(summary)).toEqual({
      current: 10,
      target: 10,
      toNext: 0,
      milestoneStamp: 10,
    })
  })

  it('uses fallback stamp count when summary is missing', () => {
    expect(walletMilestoneProgress(null, 2)).toEqual({
      current: 1,
      target: 1,
      toNext: 0,
      milestoneStamp: 1,
    })
  })
})
