import type { RewardRef } from '../types/loyalty'
import type { StampAddedPayload } from '../types/realtime'

export function stampUpdateSignature(payload: StampAddedPayload): string {
  return [
    payload.customer.id,
    payload.previous_stamps,
    payload.stamps,
    payload.added_stamps,
    payload.cycle_completed,
  ].join(':')
}

export function slotsForStampIncrease(
  previousStamps: number,
  addedStamps: number,
  cycleCompleted: boolean,
  maxStamps: number,
): number[] {
  if (cycleCompleted) {
    const slots: number[] = []
    for (let position = previousStamps + 1; position <= maxStamps; position += 1) {
      slots.push(position)
    }

    return slots.length ? slots : [maxStamps]
  }

  const slots: number[] = []
  for (let position = previousStamps + 1; position <= previousStamps + addedStamps; position += 1) {
    if (position <= maxStamps) {
      slots.push(position)
    }
  }

  return slots
}

export function rewardEarnedThisScan(
  payload: StampAddedPayload,
  previousAvailableIds: Set<number>,
  maxStamps: number,
): RewardRef | null {
  const newlyListed = payload.available_rewards.find((reward) => !previousAvailableIds.has(reward.id))
  if (newlyListed) {
    return newlyListed
  }

  const effectiveStamps = payload.cycle_completed
    ? maxStamps
    : payload.previous_stamps + payload.added_stamps

  const crossed = payload.available_rewards
    .filter(
      (reward) =>
        reward.required_stamps > payload.previous_stamps &&
        reward.required_stamps <= effectiveStamps,
    )
    .sort((a, b) => b.required_stamps - a.required_stamps)

  if (crossed.length > 0) {
    return crossed[0] ?? null
  }

  if (payload.cycle_completed && payload.available_rewards.length > 0) {
    return payload.available_rewards
      .slice()
      .sort((a, b) => b.required_stamps - a.required_stamps)[0] ?? null
  }

  return null
}

export function stampBannerCopy(payload: StampAddedPayload): { title: string; subtitle: string } {
  const venue = payload.venue.name ?? 'your venue'
  const count = payload.added_stamps

  if (payload.cycle_completed) {
    return {
      title: 'Cycle complete!',
      subtitle: venue,
    }
  }

  return {
    title: count === 1 ? '+1 stamp added' : `+${count} stamps added`,
    subtitle: venue,
  }
}
