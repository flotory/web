import { defaultRewardImage, normalizeRewardImagePath } from '@/lib/defaultImages'
import type { MilestoneProgress, Reward } from '@/types'

export type RewardMediaFields = Pick<Reward, 'image' | 'image_thumb' | 'title'>

function pickMediaPath(...paths: Array<string | null | undefined>): string | null {
  for (const path of paths) {
    const normalized = normalizeRewardImagePath(path)
    if (normalized) {
      return normalized
    }
  }

  return null
}

export function rewardThumbUrl(reward: RewardMediaFields | MilestoneProgress | null | undefined): string {
  if (!reward) {
    return defaultRewardImage()
  }

  const uploaded = pickMediaPath(reward.image_thumb, reward.image)

  return uploaded ?? defaultRewardImage()
}

export function rewardImageUrl(reward: RewardMediaFields | MilestoneProgress | null | undefined): string {
  if (!reward) {
    return defaultRewardImage()
  }

  const uploaded = pickMediaPath(reward.image, reward.image_thumb)

  return uploaded ?? defaultRewardImage()
}

export function rewardUploadedImageUrl(reward: RewardMediaFields | null | undefined): string | null {
  if (!reward) {
    return null
  }

  return pickMediaPath(reward.image, reward.image_thumb)
}

export function rewardHasCustomImage(reward: RewardMediaFields | null | undefined): boolean {
  const path = rewardUploadedImageUrl(reward)

  return Boolean(path && (path.startsWith('/uploads/') || path.startsWith('http://') || path.startsWith('https://')))
}
