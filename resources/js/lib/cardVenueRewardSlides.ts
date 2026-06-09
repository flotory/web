import type { MilestoneProgress, Reward } from '@/types'

export type CardVenueRewardSlide =
  | { id: string; kind: 'ready'; milestone: MilestoneProgress; unlockId: number }
  | { id: string; kind: 'next'; milestone: MilestoneProgress; stampsToGo: number }

export function buildCardVenueRewardSlides(
  milestones: MilestoneProgress[],
  stamps: number,
  pendingUnlocks: Array<{ unlock_id: number; reward: Reward }> = [],
): CardVenueRewardSlide[] {
  const unlockByRewardId = new Map(pendingUnlocks.map((item) => [item.reward.id, item.unlock_id]))
  const slides: CardVenueRewardSlide[] = []

  for (const milestone of [...milestones]
    .filter((milestone) => !milestone.claimed)
    .sort((a, b) => a.required_stamps - b.required_stamps)) {
    const unlockId = unlockByRewardId.get(milestone.id)

    if (unlockId != null) {
      slides.push({ id: `reward-${milestone.id}`, kind: 'ready', milestone, unlockId })
      continue
    }

    slides.push({
      id: `reward-${milestone.id}`,
      kind: 'next',
      milestone,
      stampsToGo: Math.max(milestone.required_stamps - stamps, 0),
    })
  }

  if (slides.length > 0) {
    return slides
  }

  const fallback = [...milestones]
    .filter((milestone) => !milestone.claimed)
    .sort((a, b) => a.required_stamps - b.required_stamps)[0]

  if (!fallback) {
    return []
  }

  const unlockId = unlockByRewardId.get(fallback.id)
  if (unlockId != null) {
    return [{ id: `reward-${fallback.id}`, kind: 'ready', milestone: fallback, unlockId }]
  }

  return [{
    id: `reward-${fallback.id}`,
    kind: 'next',
    milestone: fallback,
    stampsToGo: Math.max(fallback.required_stamps - stamps, 0),
  }]
}
