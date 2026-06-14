import type { RewardRef } from '../types/loyalty'
import type { StampAddedPayload } from '../types/realtime'
import type { NfcStampResponse } from './nfcStamp'

export function nfcResponseToStampPayload(response: NfcStampResponse): StampAddedPayload {
  const venue = response.venue ?? response.customer.venue
  if (!venue) {
    throw new Error('Venue missing from stamp response.')
  }

  return {
    customer: response.customer,
    venue,
    previous_stamps: response.previous_stamps,
    added_stamps: response.added_stamps,
    stamps: response.stamps,
    next_reward: response.next_reward,
    available_rewards: response.available_rewards,
    milestones: response.milestones,
    current_cycle: response.current_cycle,
    cycle_completed: response.cycle_completed,
    message: response.message,
    occurred_at: response.occurred_at,
  }
}

export function cardRouteFromNfcStamp(response: NfcStampResponse, options?: { showNfcEducation?: boolean }) {
  const venue = response.venue ?? response.customer.venue
  if (!venue) {
    throw new Error('Venue missing from stamp response.')
  }

  return {
    pathname: '/card/[cardId]' as const,
    params: {
      cardId: String(response.customer.id),
      venueId: String(venue.id),
      ...(options?.showNfcEducation ? { nfcEducation: '1' } : {}),
    },
  }
}

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
