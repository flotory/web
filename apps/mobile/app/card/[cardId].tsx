import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, RefreshControl, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import CardDetailHeader from '../../src/components/customer/CardDetailHeader'
import CardLoyaltyProgressCard from '../../src/components/customer/CardLoyaltyProgressCard'
import CardPromotionBanner from '../../src/components/customer/CardPromotionBanner'
import CardVenueRewardsCarousel, { cardVenueRewardSlidesFromProps } from '../../src/components/customer/CardVenueRewardsCarousel'
import StampScannedBanner from '../../src/components/customer/StampScannedBanner'
import CustomerScreen from '../../src/components/ui/CustomerScreen'
import ScreenGradientLayout from '../../src/components/ui/ScreenGradientLayout'
import { StickyBackHeader } from '../../src/components/ui/StickyBackButton'
import StateCard from '../../src/components/ui/StateCard'
import { useCardDetail } from '../../src/hooks/useCardDetail'
import { useFadeOnReady } from '../../src/hooks/useFadeOnReady'
import { hapticLightTap, hapticSuccess } from '../../src/lib/haptics'
import {
  rewardEarnedThisScan,
  slotsForStampIncrease,
  stampBannerCopy,
  stampUpdateSignature,
} from '../../src/lib/stampLiveUpdate'
import { useRealtime } from '../../src/providers/RealtimeProvider'
import type { StampAddedPayload } from '../../src/types/realtime'
import { colors, motion, space } from '../../src/theme'

export default function CardDetailScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ cardId: string; venueId?: string }>()
  const venueId = params.venueId ? String(params.venueId) : undefined
  const { data: payload, loading, refreshing, error, refresh, silentRefresh, reload } = useCardDetail(venueId)
  const { latestStamp, clearLatestStamp } = useRealtime()
  const fade = useFadeOnReady(Boolean(payload))
  const readyHapticDone = useRef(false)
  const lastAnimatedStampSignature = useRef('')
  const [displayStamps, setDisplayStamps] = useState<number | null>(null)
  const [animatingSlots, setAnimatingSlots] = useState<number[]>([])
  const [celebrateGiftStamp, setCelebrateGiftStamp] = useState<number | null>(null)
  const [scanBanner, setScanBanner] = useState<StampAddedPayload | null>(null)
  const stampFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleBack() {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace('/(customer)/wallet')
  }

  const maxStamps = useMemo(() => {
    const required = payload?.journey?.milestones.map((item) => item.required_stamps) ?? []
    return Math.max(10, ...required, payload?.next_reward?.required_stamps ?? 0)
  }, [payload])

  const { readyReward } = useMemo(() => {
    const unlocks = payload?.pending_unlocks ?? []
    const preferredRewardId = payload?.available_rewards[0]?.id
    const unlock = preferredRewardId
      ? unlocks.find((item) => item.reward.id === preferredRewardId) ?? unlocks[0] ?? null
      : unlocks[0] ?? null

    const fromApi = unlock?.reward ?? payload?.available_rewards[0] ?? null
    if (fromApi) return { readyReward: fromApi }

    const stamps = payload?.active_card?.stamps ?? 0
    const milestone = [...(payload?.journey?.milestones ?? [])]
      .filter((item) => !item.claimed && stamps >= item.required_stamps)
      .sort((a, b) => a.required_stamps - b.required_stamps)[0]

    if (!milestone) return { readyReward: null }

    return {
      readyReward: {
        id: milestone.id,
        title: milestone.title,
        required_stamps: milestone.required_stamps,
        image: milestone.image,
        image_thumb: milestone.image_thumb,
      },
    }
  }, [payload])

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

    applyLiveStampUpdate(latestStamp)
    clearLatestStamp()
  }, [latestStamp, payload?.active_card?.id, venueId, maxStamps])

  useEffect(() => {
    return () => {
      if (stampFeedbackTimer.current) {
        clearTimeout(stampFeedbackTimer.current)
      }
    }
  }, [])

  const sortedMilestones = useMemo(
    () => [...(payload?.journey?.milestones ?? [])].sort((a, b) => a.required_stamps - b.required_stamps),
    [payload?.journey?.milestones],
  )
  const stampCount = displayStamps ?? payload?.active_card?.stamps ?? 0

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

  useEffect(() => {
    const hasReady = venueRewardSlides.some((slide) => slide.kind === 'ready')
    if (!hasReady) {
      readyHapticDone.current = false
      return
    }
    if (!readyHapticDone.current) {
      readyHapticDone.current = true
      hapticSuccess()
    }
  }, [venueRewardSlides])

  function applyLiveStampUpdate(stampPayload: StampAddedPayload) {
    if (!payload?.active_card) {
      return
    }

    if (stampFeedbackTimer.current) {
      clearTimeout(stampFeedbackTimer.current)
    }

    const previousAvailableIds = new Set(payload.available_rewards.map((reward) => reward.id))
    const max = maxStamps

    const slots = slotsForStampIncrease(
      stampPayload.previous_stamps,
      stampPayload.added_stamps,
      stampPayload.cycle_completed,
      max,
    )

    stampFeedbackTimer.current = setTimeout(() => {
      stampFeedbackTimer.current = null

      setScanBanner(stampPayload)
      hapticLightTap()

      setTimeout(() => {
        if (stampPayload.cycle_completed) {
          setDisplayStamps(max)
        } else {
          setDisplayStamps(stampPayload.stamps)
        }

        setAnimatingSlots(slots)
        hapticSuccess()

        const unlocked = rewardEarnedThisScan(stampPayload, previousAvailableIds, max)

        setTimeout(() => {
          setAnimatingSlots([])

          if (unlocked) {
            const giftStamp = Math.min(unlocked.required_stamps, max)
            setCelebrateGiftStamp(giftStamp)
            setTimeout(() => {
              setCelebrateGiftStamp(null)
              if (stampPayload.cycle_completed) {
                setDisplayStamps(stampPayload.stamps)
              }
            }, motion.stampGiftUnlockMs)
          } else if (stampPayload.cycle_completed) {
            setTimeout(() => setDisplayStamps(stampPayload.stamps), 300)
          }

          scheduleSilentRefresh()
        }, motion.stampSlotHighlightMs)
      }, motion.stampBannerBeforeSlotsMs)
    }, motion.stampCardRevealMs)
  }

  function scheduleSilentRefresh() {
    const refreshDelay = motion.stampGiftUnlockMs + 600
    setTimeout(() => {
      void silentRefresh()
    }, refreshDelay)
  }

  if (loading && !payload) {
    return <CustomerScreen loading tabBarInset={false} header={null} children={null} />
  }

  const card = payload?.active_card
  const cardMismatch = Boolean(params.cardId && card && String(card.id) !== String(params.cardId))

  const stickyBack = <StickyBackHeader onPress={handleBack} topInset={insets.top} />

  if (!venueId || !card || cardMismatch) {
    return (
      <ScreenGradientLayout flexContent tabBarInset={false} paddingTop={0} fixedHeader={stickyBack}>
        <View style={{ paddingHorizontal: space.screenX }}>
          <View style={{ marginTop: space.sectionY }}>
            <StateCard
              emoji="🎫"
              title="Card not found"
              message="This loyalty card may have been removed. Check your wallet or discover a new venue."
              primaryAction={{ label: 'Open wallet', onPress: () => router.replace('/(customer)/wallet') }}
              secondaryAction={{ label: 'Browse venues', onPress: () => router.push('/(customer)/venues') }}
            />
          </View>
        </View>
      </ScreenGradientLayout>
    )
  }

  const stamps = stampCount
  const milestones = sortedMilestones
  const apiNext = payload?.next_reward ?? null

  let progressNextReward = apiNext
  let progressTarget = apiNext?.required_stamps ?? maxStamps

  if (readyReward) {
    if (apiNext && stamps < apiNext.required_stamps) {
      progressNextReward = apiNext
      progressTarget = apiNext.required_stamps
    } else {
      const upcoming = milestones.find(
        (m) =>
          !m.claimed &&
          m.id !== readyReward.id &&
          m.required_stamps > (readyReward.required_stamps ?? 0) &&
          stamps < m.required_stamps,
      )
      if (upcoming) {
        progressNextReward = {
          id: upcoming.id,
          title: upcoming.title,
          required_stamps: upcoming.required_stamps,
          image: upcoming.image,
          image_thumb: upcoming.image_thumb,
        }
        progressTarget = upcoming.required_stamps
      } else {
        progressNextReward = apiNext
        progressTarget = maxStamps
      }
    }
  }
  const promotion = payload?.promotion
  const bannerCopy = scanBanner ? stampBannerCopy(scanBanner) : null

  return (
    <>
      <StampScannedBanner
        visible={Boolean(scanBanner && bannerCopy)}
        title={bannerCopy?.title ?? ''}
        subtitle={bannerCopy?.subtitle}
        onDismiss={() => setScanBanner(null)}
      />
    <ScreenGradientLayout
      scrollable
      tabBarInset={false}
      paddingTop={0}
      fixedHeader={stickyBack}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
    >
      {error ? (
        <View style={{ paddingHorizontal: space.screenX }}>
          <View style={{ marginTop: 12 }}>
            <StateCard
              emoji="⚠️"
              title="Could not load card"
              message="Try again or return to your wallet."
              primaryAction={{ label: 'Try again', onPress: reload }}
              secondaryAction={{ label: 'Open wallet', onPress: () => router.replace('/(customer)/wallet') }}
            />
          </View>
        </View>
      ) : null}

      <Animated.View style={{ opacity: fade }}>
        <CardDetailHeader venue={card.venue} />

        {promotion ? <CardPromotionBanner promotion={promotion} /> : null}

        <CardLoyaltyProgressCard
          stamps={stamps}
          progressTarget={progressTarget}
          nextReward={progressNextReward}
          milestones={milestones}
          animatingSlots={animatingSlots}
          celebrateGiftStamp={celebrateGiftStamp}
        />

        <CardVenueRewardsCarousel
          venue={card.venue}
          milestones={milestones}
          stamps={stamps}
          cardId={card.id}
          venueId={card.venue_id}
          pendingUnlocks={payload?.pending_unlocks}
        />
      </Animated.View>

    </ScreenGradientLayout>
    </>
  )
}
