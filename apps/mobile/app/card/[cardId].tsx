import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Animated, RefreshControl, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import CardDetailHeader from '../../src/components/customer/CardDetailHeader'
import CardVenueRewardsCarousel from '../../src/components/customer/CardVenueRewardsCarousel'
import StampScannedBanner from '../../src/components/customer/StampScannedBanner'
import CustomerScreen from '../../src/components/ui/CustomerScreen'
import ScreenGradientLayout from '../../src/components/ui/ScreenGradientLayout'
import { StickyBackHeader } from '../../src/components/ui/StickyBackButton'
import StateCard from '../../src/components/ui/StateCard'
import { useCardDetail } from '../../src/hooks/useCardDetail'
import { useCardRewards } from '../../src/hooks/useCardRewards'
import { useCardStampAnimation } from '../../src/hooks/useCardStampAnimation'
import { useFadeOnReady } from '../../src/hooks/useFadeOnReady'
import { useRedeemRefresh } from '../../src/hooks/useRedeemRefresh'
import { hapticSuccess } from '../../src/lib/haptics'
import { stampBannerCopy } from '../../src/lib/stampLiveUpdate'
import { colors, space } from '../../src/theme'

export default function CardDetailScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ cardId: string; venueId?: string }>()
  const venueId = params.venueId ? String(params.venueId) : undefined
  const { data: payload, loading, refreshing, error, refresh, silentRefresh, reload } = useCardDetail(venueId)
  const fade = useFadeOnReady(Boolean(payload))
  const readyHapticDone = useRef(false)
  const refreshAfterRedeem = useCallback(() => {
    void silentRefresh()
  }, [silentRefresh])
  useRedeemRefresh(refreshAfterRedeem, { customerId: payload?.active_card?.id ?? null })

  function handleBack() {
    if (router.canGoBack()) {
      router.back()
      return
    }

    router.replace('/(customer)/home')
  }

  const maxStamps = useMemo(() => {
    const required = payload?.journey?.milestones.map((item) => item.required_stamps) ?? []
    return Math.max(10, ...required, payload?.next_reward?.required_stamps ?? 0)
  }, [payload])

  const {
    displayStamps,
    animatingSlots,
    celebrateGiftStamp,
    scanBanner,
    setScanBanner,
  } = useCardStampAnimation({
    payload,
    venueId,
    maxStamps,
    silentRefresh: refreshAfterRedeem,
  })
  const stampCount = displayStamps ?? payload?.active_card?.stamps ?? 0
  const {
    sortedMilestones,
    venueRewardSlides,
    progressNextReward,
    progressTarget,
  } = useCardRewards(payload, stampCount, maxStamps)

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
        <CardDetailHeader
          venue={card.venue}
          promotion={promotion}
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
