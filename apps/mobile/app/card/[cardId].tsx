import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Animated, Pressable, RefreshControl, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import CardDetailHeader from '../../src/components/customer/CardDetailHeader'
import CardVenueRewardsCarousel from '../../src/components/customer/CardVenueRewardsCarousel'
import FirstJoinNfcEducation from '../../src/components/customer/FirstJoinNfcEducation'
import StampScannedBanner from '../../src/components/customer/StampScannedBanner'
import CustomerScreen from '../../src/components/ui/CustomerScreen'
import ScreenGradientLayout from '../../src/components/ui/ScreenGradientLayout'
import { StickyBackHeader } from '../../src/components/ui/StickyBackButton'
import StateCard from '../../src/components/ui/StateCard'
import { useCardDetail } from '../../src/hooks/useCardDetail'
import { useCardRewards } from '../../src/hooks/useCardRewards'
import { useCardStampAnimation } from '../../src/hooks/useCardStampAnimation'
import { useFadeOnReady } from '../../src/hooks/useFadeOnReady'
import { hapticSuccess } from '../../src/lib/haptics'
import { stampBannerCopy } from '../../src/lib/stampLiveUpdate'
import { withAppFont } from '../../src/lib/typography'
import { colors, space } from '../../src/theme'

export default function CardDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ cardId: string; venueId?: string; nfcEducation?: string }>()
  const venueId = params.venueId ? String(params.venueId) : undefined
  const showNfcEducation = params.nfcEducation === '1'
  const { data: payload, loading, refreshing, error, refresh, silentRefresh, reload } = useCardDetail(venueId)
  const fade = useFadeOnReady(Boolean(payload))
  const readyHapticDone = useRef(false)
  const refreshAfterRedeem = useCallback(() => {
    void silentRefresh()
  }, [silentRefresh])

  function handleBack() {
    if (router.canGoBack()) {
      router.back()
      return
    }

    router.replace('/(customer)/home')
  }

  const maxStamps = useMemo(() => {
    const required = payload?.journey?.milestones.map((item) => item.required_stamps) ?? []
    const target = Math.max(0, ...required, payload?.next_reward?.required_stamps ?? 0)
    return target > 0 ? target : 1
  }, [payload])

  const {
    displayStamps,
    animatingSlots,
    celebrateGiftStamp,
    scanBanner,
    setScanBanner,
    rewardUnlockedModal,
    closeRewardUnlockedModal,
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

  const modalOpacity = useRef(new Animated.Value(0)).current
  const modalScale = useRef(new Animated.Value(0.94)).current

  useEffect(() => {
    if (!rewardUnlockedModal.visible) {
      modalOpacity.setValue(0)
      modalScale.setValue(0.94)
      return
    }

    Animated.parallel([
      Animated.timing(modalOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(modalScale, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }),
    ]).start()
  }, [modalOpacity, modalScale, rewardUnlockedModal.visible])

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
              title={t('card.notFoundTitle')}
              message={t('card.notFoundMessage')}
              primaryAction={{ label: t('venues.openWallet'), onPress: () => router.replace('/(customer)/wallet') }}
              secondaryAction={{ label: t('wallet.browseVenues'), onPress: () => router.push('/(customer)/venues') }}
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
      {rewardUnlockedModal.visible ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 260,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
        >
          <Pressable
            onPress={closeRewardUnlockedModal}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(5, 13, 30, 0.3)',
            }}
          />
          <Animated.View
            style={{
              width: '100%',
              maxWidth: 380,
              borderRadius: 20,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.accentBorder,
              paddingHorizontal: 20,
              paddingVertical: 20,
              shadowColor: colors.ink,
              shadowOpacity: 0.16,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 12 },
              elevation: 10,
              opacity: modalOpacity,
              transform: [{ scale: modalScale }],
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: colors.accentSoft,
                borderWidth: 1,
                borderColor: colors.accentBorder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="gift-outline" size={24} color={colors.accentActive} />
            </View>
            <Text
              style={withAppFont({
                marginTop: 12,
                fontSize: 11,
                fontWeight: '800',
                color: colors.accentActive,
                letterSpacing: 1,
              })}
            >
              {t('card.rewardUnlocked')}
            </Text>
            <Text style={withAppFont({ marginTop: 6, fontSize: 24, fontWeight: '800', color: colors.ink, lineHeight: 30 })}>
              {rewardUnlockedModal.title}
            </Text>
            <Text style={withAppFont({ marginTop: 5, fontSize: 14, fontWeight: '500', color: colors.inkMuted, lineHeight: 20 })}>
              {rewardUnlockedModal.subtitle}
            </Text>
            <View style={{ marginTop: 16, height: 1, backgroundColor: 'rgba(5, 13, 30, 0.08)' }} />
            <View style={{ marginTop: 14, alignItems: 'center' }}>
              <Pressable
                onPress={closeRewardUnlockedModal}
                style={({ pressed }) => ({
                  minWidth: 120,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.9 : 1,
                  alignItems: 'center',
                })}
              >
                <Text style={withAppFont({ fontSize: 13, fontWeight: '800', color: colors.primaryText })}>{t('card.ok')}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      ) : null}
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
              title={t('card.loadErrorTitle')}
              message={t('card.loadErrorMessage')}
              primaryAction={{ label: t('venues.tryAgain'), onPress: reload }}
              secondaryAction={{ label: t('venues.openWallet'), onPress: () => router.replace('/(customer)/wallet') }}
            />
          </View>
        </View>
      ) : null}

      <Animated.View style={{ opacity: fade }}>
        {showNfcEducation ? (
          <View style={{ paddingHorizontal: space.screenX, marginTop: 12, marginBottom: 4 }}>
            <FirstJoinNfcEducation variant="nfc_first_stamp" />
          </View>
        ) : null}

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
