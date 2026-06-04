import type { MilestoneProgress, RewardRef } from '../types/loyalty'

export type CardVenueRewardSlide =
  | { id: string; kind: 'ready'; milestone: MilestoneProgress; unlockId?: number }
  | { id: string; kind: 'next'; milestone: MilestoneProgress; stampsToGo: number }

export function buildCardVenueRewardSlides(
  milestones: MilestoneProgress[],
  stamps: number,
  pendingUnlocks: { unlock_id: number; reward: RewardRef }[] = [],
): CardVenueRewardSlide[] {
  const unlockByRewardId = new Map(pendingUnlocks.map((item) => [item.reward.id, item.unlock_id]))

  return [...milestones]
    .filter((milestone) => !milestone.claimed)
    .sort((a, b) => a.required_stamps - b.required_stamps)
    .map((milestone) => {
      const reached = stamps >= milestone.required_stamps

      if (reached) {
        return {
          id: `reward-${milestone.id}`,
          kind: 'ready' as const,
          milestone,
          unlockId: unlockByRewardId.get(milestone.id),
        }
      }

      return {
        id: `reward-${milestone.id}`,
        kind: 'next' as const,
        milestone,
        stampsToGo: Math.max(milestone.required_stamps - stamps, 0),
      }
    })
}
