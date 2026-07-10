import { describe, expect, it } from 'vitest'

import {
  DEFAULT_REWARD_IMAGE,
  defaultRewardImage,
  normalizeRewardImagePath,
  rewardPresetsForCategory,
} from './defaultImages'

describe('defaultImages reward helpers', () => {
  it('returns the unified default reward image', () => {
    expect(defaultRewardImage()).toBe(DEFAULT_REWARD_IMAGE)
  })

  it('normalizes legacy stock reward paths', () => {
    expect(normalizeRewardImagePath('/images/defaults/rewards/free-coffee.png')).toBe(DEFAULT_REWARD_IMAGE)
    expect(normalizeRewardImagePath('/uploads/owners/2/brands/4/rewards/custom.jpg')).toBe(
      '/uploads/owners/2/brands/4/rewards/custom.jpg',
    )
    expect(normalizeRewardImagePath('')).toBeNull()
    expect(normalizeRewardImagePath(null)).toBeNull()
  })

  it('uses the unified default for all cafe reward presets', () => {
    const presets = rewardPresetsForCategory('cafe')

    expect(presets).toHaveLength(3)
    expect(presets.every((preset) => preset.image === DEFAULT_REWARD_IMAGE)).toBe(true)
  })
})
