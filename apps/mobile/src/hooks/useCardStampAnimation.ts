import { useEffect, useRef, useState } from 'react'

import type { CardDetailPayload } from '../lib/customerData'
import { hapticLightTap, hapticSuccess } from '../lib/haptics'
import {
  rewardEarnedThisScan,
  slotsForStampIncrease,
  stampUpdateSignature,
} from '../lib/stampLiveUpdate'
import { useRealtime } from '../providers/RealtimeProvider'
import { motion } from '../theme'
import type { StampAddedPayload } from '../types/realtime'

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
  const stampFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [displayStamps, setDisplayStamps] = useState<number | null>(null)
  const [animatingSlots, setAnimatingSlots] = useState<number[]>([])
  const [celebrateGiftStamp, setCelebrateGiftStamp] = useState<number | null>(null)
  const [scanBanner, setScanBanner] = useState<StampAddedPayload | null>(null)

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
      clearLatestStamp()
      return
    }
    lastAnimatedStampSignature.current = signature

    if (stampFeedbackTimer.current) {
      clearTimeout(stampFeedbackTimer.current)
    }

    const previousAvailableIds = new Set(payload.available_rewards.map((reward) => reward.id))
    const slots = slotsForStampIncrease(
      latestStamp.previous_stamps,
      latestStamp.added_stamps,
      latestStamp.cycle_completed,
      maxStamps,
    )

    stampFeedbackTimer.current = setTimeout(() => {
      stampFeedbackTimer.current = null

      setScanBanner(latestStamp)
      hapticLightTap()

      setTimeout(() => {
        setDisplayStamps(latestStamp.cycle_completed ? maxStamps : latestStamp.stamps)
        setAnimatingSlots(slots)
        hapticSuccess()

        const unlocked = rewardEarnedThisScan(latestStamp, previousAvailableIds, maxStamps)

        setTimeout(() => {
          setAnimatingSlots([])

          if (unlocked) {
            const giftStamp = Math.min(unlocked.required_stamps, maxStamps)
            setCelebrateGiftStamp(giftStamp)
            setTimeout(() => {
              setCelebrateGiftStamp(null)
              if (latestStamp.cycle_completed) {
                setDisplayStamps(latestStamp.stamps)
              }
            }, motion.stampGiftUnlockMs)
          } else if (latestStamp.cycle_completed) {
            setTimeout(() => setDisplayStamps(latestStamp.stamps), 300)
          }

          setTimeout(() => {
            silentRefresh()
          }, motion.stampGiftUnlockMs + 600)
        }, motion.stampSlotHighlightMs)
      }, motion.stampBannerBeforeSlotsMs)
    }, motion.stampCardRevealMs)

    clearLatestStamp()
  }, [clearLatestStamp, latestStamp, maxStamps, payload, silentRefresh, venueId])

  useEffect(() => {
    return () => {
      if (stampFeedbackTimer.current) {
        clearTimeout(stampFeedbackTimer.current)
      }
    }
  }, [])

  return {
    displayStamps,
    animatingSlots,
    celebrateGiftStamp,
    scanBanner,
    setScanBanner,
  }
}
