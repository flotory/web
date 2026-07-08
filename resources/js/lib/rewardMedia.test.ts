import { describe, expect, it } from 'vitest'

import { DEFAULT_REWARD_IMAGE } from './defaultImages'
import {
  rewardHasCustomImage,
  rewardImageUrl,
  rewardThumbUrl,
  rewardUploadedImageUrl,
} from './rewardMedia'

describe('rewardMedia', () => {
  it('uses the unified default when reward media is missing', () => {
    expect(rewardImageUrl(null)).toBe(DEFAULT_REWARD_IMAGE)
    expect(rewardThumbUrl(undefined)).toBe(DEFAULT_REWARD_IMAGE)
    expect(rewardImageUrl({ title: 'Free coffee', image: null, image_thumb: null })).toBe(DEFAULT_REWARD_IMAGE)
  })

  it('prefers full image for rewardImageUrl and thumb for rewardThumbUrl', () => {
    const reward = {
      title: 'Free coffee',
      image: '/uploads/reward-milestones/reward.jpg',
      image_thumb: '/uploads/reward-milestones/reward-thumb.jpg',
    }

    expect(rewardImageUrl(reward)).toBe('/uploads/reward-milestones/reward.jpg')
    expect(rewardThumbUrl(reward)).toBe('/uploads/reward-milestones/reward-thumb.jpg')
  })

  it('remaps removed stock reward images to the new default', () => {
    const reward = {
      title: '50% off ice cream',
      image: '/images/defaults/rewards/ice-cream-cone.png',
      image_thumb: null,
    }

    expect(rewardImageUrl(reward)).toBe(DEFAULT_REWARD_IMAGE)
    expect(rewardUploadedImageUrl(reward)).toBe(DEFAULT_REWARD_IMAGE)
  })

  it('detects owner uploads but not bundled default art', () => {
    expect(rewardHasCustomImage({
      title: 'Free coffee',
      image: '/uploads/reward-milestones/custom.jpg',
      image_thumb: null,
    })).toBe(true)

    expect(rewardHasCustomImage({
      title: 'Free coffee',
      image: DEFAULT_REWARD_IMAGE,
      image_thumb: null,
    })).toBe(false)

    expect(rewardHasCustomImage({
      title: '50% off ice cream',
      image: '/images/defaults/rewards/ice-cream-cone.png',
      image_thumb: null,
    })).toBe(false)

    expect(rewardHasCustomImage({
      title: 'Free coffee',
      image: null,
      image_thumb: null,
    })).toBe(false)
  })
})
