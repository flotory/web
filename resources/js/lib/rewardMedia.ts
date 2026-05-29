import { defaultRewardImage } from '@/lib/defaultImages'
import { rewardCategoryFromTitle } from '@/lib/rewardVisuals'
import type { MilestoneProgress, Reward } from '@/types'

export type RewardMediaFields = Pick<Reward, 'image' | 'image_thumb' | 'title'>

export function rewardImageUrl(reward: RewardMediaFields | MilestoneProgress | null | undefined): string {
  if (!reward) {
    return defaultRewardImage('free_item')
  }
  return reward.image_thumb ?? reward.image ?? defaultRewardImage(rewardCategoryFromTitle(reward.title))
}

export function rewardHasCustomImage(reward: RewardMediaFields | null | undefined): boolean {
  return Boolean(reward?.image_thumb ?? reward?.image)
}
