import type { CardDetailPayload } from './customerData'
import type { StampAddedPayload } from '../types/realtime'

export function buildStampPayloadFromCardDetail(
  previousStamps: number,
  detail: CardDetailPayload,
): StampAddedPayload | null {
  const card = detail.active_card
  if (!card?.venue) {
    return null
  }

  const stamps = card.stamps
  const added = stamps - previousStamps
  const maxMilestone = Math.max(
    0,
    ...(detail.journey?.milestones.map((item) => item.required_stamps) ?? []),
    detail.next_reward?.required_stamps ?? 0,
  )
  const cycleCompleted = added < 0 || (previousStamps >= maxMilestone && maxMilestone > 0 && stamps === 0)
  const addedStamps = cycleCompleted
    ? Math.max(maxMilestone - previousStamps, 1)
    : Math.max(added, 1)

  if (!cycleCompleted && added <= 0) {
    return null
  }

  return {
    customer: card,
    venue: card.venue,
    previous_stamps: previousStamps,
    added_stamps: addedStamps,
    stamps,
    next_reward: detail.next_reward,
    available_rewards: detail.available_rewards,
    milestones: detail.journey?.milestones ?? [],
    current_cycle: detail.journey?.current_cycle ?? 1,
    cycle_completed: cycleCompleted,
    message: cycleCompleted
      ? `Cycle complete at ${card.venue.name}!`
      : `${addedStamps} stamp${addedStamps === 1 ? '' : 's'} added at ${card.venue.name}.`,
    occurred_at: new Date().toISOString(),
  }
}
