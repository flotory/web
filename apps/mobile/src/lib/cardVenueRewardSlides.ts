import type { MilestoneProgress, RewardRef } from '../types/loyalty'

export type CardVenueRewardSlide =
  | { id: string; kind: 'ready'; milestone: MilestoneProgress; unlockId: number }
  | { id: string; kind: 'next'; milestone: MilestoneProgress; stampsToGo: number }

function sortMilestones(milestones: MilestoneProgress[]): MilestoneProgress[] {
  return [...milestones]
    .filter((milestone) => !milestone.claimed)
    .sort((a, b) => a.required_stamps - b.required_stamps)
}

export function buildCardVenueRewardSlides(
  milestones: MilestoneProgress[],
  stamps: number,
  pendingUnlocks: { unlock_id: number; reward: RewardRef }[] = [],
): CardVenueRewardSlide[] {
  const unlockByRewardId = new Map(pendingUnlocks.map((item) => [item.reward.id, item.unlock_id]))
  const readySlides: CardVenueRewardSlide[] = []
  const nextSlides: CardVenueRewardSlide[] = []

  for (const milestone of sortMilestones(milestones)) {
    const unlockId = unlockByRewardId.get(milestone.id)

    if (unlockId != null) {
      readySlides.push({
        id: `reward-${milestone.id}`,
        kind: 'ready',
        milestone,
        unlockId,
      })
      continue
    }

    nextSlides.push({
      id: `reward-${milestone.id}`,
      kind: 'next',
      milestone,
      stampsToGo: Math.max(milestone.required_stamps - stamps, 0),
    })
  }

  const slides = [...readySlides, ...nextSlides]

  if (slides.length > 0) {
    return slides
  }

  const fallback = sortMilestones(milestones)[0]

  if (!fallback) {
    return []
  }

  const unlockId = unlockByRewardId.get(fallback.id)
  if (unlockId != null) {
    return [
      {
        id: `reward-${fallback.id}`,
        kind: 'ready',
        milestone: fallback,
        unlockId,
      },
    ]
  }

  return [
    {
      id: `reward-${fallback.id}`,
      kind: 'next',
      milestone: fallback,
      stampsToGo: Math.max(fallback.required_stamps - stamps, 0),
    },
  ]
}
