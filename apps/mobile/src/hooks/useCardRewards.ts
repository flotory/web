import { useMemo } from 'react'

import { cardVenueRewardSlidesFromProps } from '../components/customer/CardVenueRewardsCarousel'
import type { CardDetailPayload } from '../lib/customerData'
import type { RewardRef } from '../types/loyalty'

function readyRewardFromPayload(payload: CardDetailPayload | null | undefined): RewardRef | null {
  const unlocks = payload?.pending_unlocks ?? []
  const preferredRewardId = payload?.available_rewards[0]?.id
  const unlock = preferredRewardId
    ? unlocks.find((item) => item.reward.id === preferredRewardId) ?? unlocks[0] ?? null
    : unlocks[0] ?? null

  const fromApi = unlock?.reward ?? payload?.available_rewards[0] ?? null
  if (fromApi) return fromApi

  const stamps = payload?.active_card?.stamps ?? 0
  const milestone = [...(payload?.journey?.milestones ?? [])]
    .filter((item) => !item.claimed && stamps >= item.required_stamps)
    .sort((a, b) => a.required_stamps - b.required_stamps)[0]

  if (!milestone) return null

  return {
    id: milestone.id,
    title: milestone.title,
    required_stamps: milestone.required_stamps,
    image: milestone.image,
    image_thumb: milestone.image_thumb,
  }
}

export function useCardRewards(payload: CardDetailPayload | null | undefined, stampCount: number, maxStamps: number) {
  const sortedMilestones = useMemo(
    () => [...(payload?.journey?.milestones ?? [])].sort((a, b) => a.required_stamps - b.required_stamps),
    [payload?.journey?.milestones],
  )

  const readyReward = useMemo(() => readyRewardFromPayload(payload), [payload])

  const venueRewardSlides = useMemo(() => {
    const active = payload?.active_card
    if (!active) return []

    return cardVenueRewardSlidesFromProps({
      venue: active.venue,
      milestones: sortedMilestones,
      stamps: stampCount,
      cardId: active.id,
      venueId: active.venue_id,
      pendingUnlocks: payload?.pending_unlocks,
    })
  }, [payload?.active_card, payload?.pending_unlocks, sortedMilestones, stampCount])

  const { progressNextReward, progressTarget } = useMemo(() => {
    const apiNext = payload?.next_reward ?? null
    let nextReward = apiNext
    let target = apiNext?.required_stamps ?? maxStamps

    if (readyReward) {
      if (apiNext && stampCount < apiNext.required_stamps) {
        nextReward = apiNext
        target = apiNext.required_stamps
      } else {
        const upcoming = sortedMilestones.find(
          (milestone) =>
            !milestone.claimed &&
            milestone.id !== readyReward.id &&
            milestone.required_stamps > (readyReward.required_stamps ?? 0) &&
            stampCount < milestone.required_stamps,
        )

        if (upcoming) {
          nextReward = {
            id: upcoming.id,
            title: upcoming.title,
            required_stamps: upcoming.required_stamps,
            image: upcoming.image,
            image_thumb: upcoming.image_thumb,
          }
          target = upcoming.required_stamps
        } else {
          nextReward = apiNext
          target = maxStamps
        }
      }
    }

    return { progressNextReward: nextReward, progressTarget: target }
  }, [maxStamps, payload?.next_reward, readyReward, sortedMilestones, stampCount])

  return {
    readyReward,
    sortedMilestones,
    venueRewardSlides,
    progressNextReward,
    progressTarget,
  }
}
