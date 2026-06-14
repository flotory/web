import { useEffect, useRef, useState } from 'react'

import type { CardDetailPayload } from '../lib/customerData'
import { hapticLightTap, hapticSuccess } from '../lib/haptics'
import { acknowledgeStampSignature } from '../lib/stampAck'
import {
  rewardEarnedThisScan,
  slotsForStampIncrease,
  stampUpdateSignature,
} from '../lib/stampLiveUpdate'
import { useRealtime } from '../providers/RealtimeProvider'
import { motion } from '../theme'
import type { StampAddedPayload } from '../types/realtime'

interface RewardUnlockedModalState {
  visible: boolean
  title: string
  subtitle: string
}

function stampAnimationTarget(payload: StampAddedPayload, fallback: number): number {
  const milestoneMax = Math.max(
    0,
    ...payload.milestones.map((item) => item.required_stamps),
    payload.next_reward?.required_stamps ?? 0,
  )
  const reachedThisScan = payload.previous_stamps + payload.added_stamps
  const cycleTarget = payload.cycle_completed ? reachedThisScan : 0
  const resolved = Math.max(milestoneMax, cycleTarget, fallback, 1)

  return resolved
}

export function useCardStampAnimation({
  payload,
  venueId,
  maxStamps,
  silentRefresh,
}: {
  payload: CardDetailPayload | null
  venueId?: string
  maxStamps: number
  silentRefresh: () => void
}) {
  const { latestStamp, clearLatestStamp } = useRealtime()
  const lastAnimatedStampSignature = useRef('')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [displayStamps, setDisplayStamps] = useState<number | null>(null)
  const [animatingSlots, setAnimatingSlots] = useState<number[]>([])
  const [celebrateGiftStamp, setCelebrateGiftStamp] = useState<number | null>(null)
  const [scanBanner, setScanBanner] = useState<StampAddedPayload | null>(null)
  const [rewardUnlockedModal, setRewardUnlockedModal] = useState<RewardUnlockedModalState>({
    visible: false,
    title: '',
    subtitle: '',
  })

  useEffect(() => {
    if (!latestStamp || !payload?.active_card) {
      return
    }

    if (latestStamp.customer.id !== payload.active_card.id) {
      return
    }

    if (venueId && String(latestStamp.venue.id) !== venueId) {
      return
    }

    const signature = stampUpdateSignature(latestStamp)
    if (signature === lastAnimatedStampSignature.current) {
      return
    }
    lastAnimatedStampSignature.current = signature
    const stampPayload = latestStamp

    timers.current.forEach((timer) => clearTimeout(timer))
    timers.current = []
    const schedule = (callback: () => void, delayMs: number) => {
      const timer = setTimeout(callback, delayMs)
      timers.current.push(timer)
    }

    const previousAvailableIds = new Set(payload.available_rewards.map((reward) => reward.id))
    const animationMaxStamps = stampAnimationTarget(stampPayload, maxStamps)
    const slots = slotsForStampIncrease(
      stampPayload.previous_stamps,
      stampPayload.added_stamps,
      stampPayload.cycle_completed,
      animationMaxStamps,
    )
    setDisplayStamps(stampPayload.previous_stamps)

    schedule(() => {
      acknowledgeStampSignature(signature)

      setScanBanner(stampPayload)
      hapticLightTap()

      schedule(() => {
        setDisplayStamps(stampPayload.cycle_completed ? animationMaxStamps : stampPayload.stamps)
        setAnimatingSlots(slots)
        hapticSuccess()

        if (stampPayload.cycle_completed) {
          setRewardUnlockedModal({
            visible: true,
            title: 'Reward unlocked!',
            subtitle: `${stampPayload.venue.name} · Ready to redeem`,
          })
          schedule(() => {
            setRewardUnlockedModal((current) => ({ ...current, visible: false }))
          }, 3200)
        }

        const unlocked = rewardEarnedThisScan(stampPayload, previousAvailableIds, animationMaxStamps)

        schedule(() => {
          setAnimatingSlots([])

          const giftStamp = unlocked
            ? Math.min(unlocked.required_stamps, animationMaxStamps)
            : stampPayload.cycle_completed
              ? animationMaxStamps
              : null

          if (giftStamp != null) {
            setCelebrateGiftStamp(giftStamp)
            schedule(() => {
              setCelebrateGiftStamp(null)
              if (stampPayload.cycle_completed) {
                setDisplayStamps(stampPayload.stamps)
              }
            }, motion.stampGiftUnlockMs)
          } else if (stampPayload.cycle_completed) {
            schedule(() => setDisplayStamps(stampPayload.stamps), 300)
          }

          schedule(() => {
            silentRefresh()
            clearLatestStamp()
          }, motion.stampGiftUnlockMs + 600)
        }, motion.stampSlotHighlightMs)
      }, motion.stampBannerBeforeSlotsMs)
    }, motion.stampCardRevealMs)
  }, [clearLatestStamp, latestStamp, maxStamps, payload, silentRefresh, venueId])

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer))
      timers.current = []
    }
  }, [])

  return {
    displayStamps,
    animatingSlots,
    celebrateGiftStamp,
    scanBanner,
    setScanBanner,
    rewardUnlockedModal,
    closeRewardUnlockedModal: () =>
      setRewardUnlockedModal((current) => ({
        ...current,
        visible: false,
      })),
  }
}
