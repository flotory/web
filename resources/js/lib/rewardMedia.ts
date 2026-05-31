import { defaultRewardImage } from '@/lib/defaultImages'
import { rewardCategoryFromTitle } from '@/lib/rewardVisuals'
import type { MilestoneProgress, Reward } from '@/types'

export type RewardMediaFields = Pick<Reward, 'image' | 'image_thumb' | 'title'>

function pickMediaPath(...paths: Array<string | null | undefined>): string | null {
  for (const path of paths) {
    if (typeof path === 'string' && path.trim() !== '') {
      return path
    }
  }

  return null
}

export function rewardThumbUrl(reward: RewardMediaFields | MilestoneProgress | null | undefined): string {
  if (!reward) {
    return defaultRewardImage('free_item')
  }

  const uploaded = pickMediaPath(reward.image_thumb, reward.image)

  return uploaded ?? defaultRewardImage(rewardCategoryFromTitle(reward.title))
}

export function rewardImageUrl(reward: RewardMediaFields | MilestoneProgress | null | undefined): string {
  if (!reward) {
    return defaultRewardImage('free_item')
  }

  const uploaded = pickMediaPath(reward.image, reward.image_thumb)

  return uploaded ?? defaultRewardImage(rewardCategoryFromTitle(reward.title))
}

export function rewardHasCustomImage(reward: RewardMediaFields | null | undefined): boolean {
  return Boolean(pickMediaPath(reward?.image, reward?.image_thumb))
}
