import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import MilestonePath from '../../src/components/customer/MilestonePath'
import StampRewardCelebration from '../../src/components/loyalty/StampRewardCelebration'
import CoverImage from '../../src/components/ui/CoverImage'
import CustomerScreen from '../../src/components/ui/CustomerScreen'
import PrimaryButton from '../../src/components/ui/PrimaryButton'
import ScreenGradientLayout from '../../src/components/ui/ScreenGradientLayout'
import ShakeGiftBadge from '../../src/components/ui/ShakeGiftBadge'
import StateCard from '../../src/components/ui/StateCard'
import { useCardDetail } from '../../src/hooks/useCardDetail'
import { useFadeOnReady } from '../../src/hooks/useFadeOnReady'
import { progressCountCopy, progressHintCopy, visitsToRewardCopy } from '../../src/lib/progressCopy'
import { hapticSuccess } from '../../src/lib/haptics'
import { rewardImageUrl, venueCoverUrl, venueLogoUrl } from '../../src/lib/media'
import { colors, radius, space, type as typography } from '../../src/theme'
import { rewardEarnedThisScan, slotsForStampIncrease, stampUpdateSignature } from '../../src/lib/stampLiveUpdate'
import { useRealtime } from '../../src/providers/RealtimeProvider'
import type { StampAddedPayload } from '../../src/types/realtime'
import { withAppFont } from '../../src/lib/typography'

const SCALE = 0.8
const s = (value: number) => Math.round(value * SCALE)

export default function CardDetailScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ cardId: string; venueId?: string }>()
  const venueId = params.venueId ? String(params.venueId) : undefined
  const { data: payload, loading, refreshing, error, refresh, reload } = useCardDetail(venueId)
  const { latestStamp, clearLatestStamp } = useRealtime()
  const fade = useFadeOnReady(!loading)
  const readyHapticDone = useRef(false)
  const lastAnimatedStampSignature = useRef('')
  const [displayStamps, setDisplayStamps] = useState<number | null>(null)
  const [animatingSlots, setAnimatingSlots] = useState<number[]>([])
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationTitle, setCelebrationTitle] = useState('')

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

  const { readyUnlock, readyReward } = useMemo(() => {
    const unlocks = payload?.pending_unlocks ?? []
    const preferredRewardId = payload?.available_rewards[0]?.id
    const unlock = preferredRewardId
      ? unlocks.find((item) => item.reward.id === preferredRewardId) ?? unlocks[0] ?? null
      : unlocks[0] ?? null

    const fromApi = unlock?.reward ?? payload?.available_rewards[0] ?? null
    if (fromApi) return { readyUnlock: unlock, readyReward: fromApi }

    const stamps = payload?.active_card?.stamps ?? 0
    const milestone = [...(payload?.journey?.milestones ?? [])]
      .filter((item) => !item.claimed && stamps >= item.required_stamps)
      .sort((a, b) => a.required_stamps - b.required_stamps)[0]

    if (!milestone) return { readyUnlock: unlock, readyReward: null }

    return {
      readyUnlock: unlock,
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
    if (!readyReward) {
      readyHapticDone.current = false
      return
    }
    if (!readyHapticDone.current) {
      readyHapticDone.current = true
      hapticSuccess()
    }
  }, [readyReward])

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

  function applyLiveStampUpdate(stampPayload: StampAddedPayload) {
    if (!payload?.active_card) {
      return
    }

    const previousAvailableIds = new Set(payload.available_rewards.map((reward) => reward.id))
    const max = maxStamps

    if (stampPayload.cycle_completed) {
      setDisplayStamps(max)
    } else {
      setDisplayStamps(null)
    }

    const slots = slotsForStampIncrease(
      stampPayload.previous_stamps,
      stampPayload.added_stamps,
      stampPayload.cycle_completed,
      max,
    )
    setAnimatingSlots(slots)
    setTimeout(() => setAnimatingSlots([]), 1400)

    hapticSuccess()

    const unlocked = rewardEarnedThisScan(stampPayload, previousAvailableIds, max)
    if (unlocked) {
      setCelebrationTitle(unlocked.title)
      setShowCelebration(true)
      setTimeout(() => {
        setShowCelebration(false)
        if (stampPayload.cycle_completed) {
          setDisplayStamps(stampPayload.stamps)
        }
        void refresh()
      }, 2400)
      return
    }

    void refresh()
    if (stampPayload.cycle_completed) {
      setTimeout(() => setDisplayStamps(stampPayload.stamps), 900)
    }
  }

  if (loading) {
    return <CustomerScreen loading tabBarInset={false} header={null} children={null} />
  }

  const card = payload?.active_card
  const cardMismatch = Boolean(params.cardId && card && String(card.id) !== String(params.cardId))

  if (!venueId || !card || cardMismatch) {
    return (
      <ScreenGradientLayout flexContent tabBarInset={false} paddingTop={insets.top + 8}>
        <View style={{ paddingHorizontal: space.screenX }}>
          <Pressable onPress={handleBack}>
            <Text style={withAppFont({ color: colors.ink, fontWeight: '700', fontSize: 16 })}>← Back</Text>
          </Pressable>
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

  const nextReward = payload?.next_reward
  const stamps = displayStamps ?? card.stamps
  const stampsToNext = nextReward ? Math.max(nextReward.required_stamps - stamps, 0) : Math.max(maxStamps - stamps, 0)
  const milestones = [...(payload?.journey?.milestones ?? [])].sort((a, b) => a.required_stamps - b.required_stamps)
  const cover = venueCoverUrl(card.venue ?? undefined)
  const logo = venueLogoUrl(card.venue ?? undefined)
  const nextImage = rewardImageUrl(nextReward ?? undefined)
  const promotion = payload?.promotion

  return (
    <ScreenGradientLayout
      scrollable
      tabBarInset={false}
      paddingTop={insets.top + 8}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <Pressable onPress={handleBack} style={{ paddingHorizontal: space.screenX }}>
        <Text style={withAppFont({ color: colors.ink, fontWeight: '700', fontSize: 16 })}>← Back</Text>
      </Pressable>

      {error ? (
        <View style={{ paddingHorizontal: space.screenX, marginTop: 8 }}>
          <StateCard
            emoji="⚠️"
            title="Could not load card"
            message="Try again or return to your wallet."
            primaryAction={{ label: 'Try again', onPress: reload }}
            secondaryAction={{ label: 'Open wallet', onPress: () => router.replace('/(customer)/wallet') }}
          />
        </View>
      ) : null}

      <Animated.View style={{ opacity: fade, marginTop: s(space.headerBottom) }}>
        <View style={{ marginTop: s(12), marginHorizontal: space.screenX, borderRadius: radius.card, overflow: 'hidden' }}>
          <CoverImage uri={cover} height={s(140)} />
          {readyReward ? (
            <View style={{ position: 'absolute', top: s(14), right: s(14) }}>
              <ShakeGiftBadge />
            </View>
          ) : null}
          <View style={{ position: 'absolute', left: s(16), bottom: s(14), flexDirection: 'row', alignItems: 'center', gap: s(10) }}>
            <View
              style={{
                width: s(52),
                height: s(52),
                borderRadius: s(14),
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {logo ? <Image source={{ uri: logo }} style={{ width: s(52), height: s(52) }} /> : <Text style={{ fontSize: s(24) }}>☕</Text>}
            </View>
            <Text style={withAppFont({ fontSize: s(26), fontWeight: '800', color: colors.primaryText, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 8 })}>
              {card.venue?.name ?? 'Loyalty card'}
            </Text>
          </View>
        </View>

        {promotion ? (
          <View
            style={{
              marginTop: s(space.sectionY),
              marginHorizontal: space.screenX,
              backgroundColor: colors.accentSoft,
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: colors.accentBorder,
              padding: s(space.cardPad),
            }}
          >
            <Text style={withAppFont({ fontSize: s(16), fontWeight: '800', color: colors.accent })}>🔥 {promotion.headline}</Text>
            <Text style={{ ...typography.body, fontSize: s(16), marginTop: s(6), color: colors.inkMuted }}>{promotion.message}</Text>
            {promotion.days_left != null && promotion.days_left >= 0 ? (
              <Text style={{ ...typography.caption, fontSize: s(13), marginTop: s(8), color: colors.inkSoft }}>
                Ends in {promotion.days_left} {promotion.days_left === 1 ? 'day' : 'days'}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={{ marginTop: s(space.sectionY), paddingHorizontal: space.screenX }}>
          <View
            style={{
              backgroundColor: colors.accentSoft,
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: colors.accentBorder,
              padding: s(space.cardPad),
            }}
          >
            <Text style={withAppFont({ fontSize: s(16), fontWeight: '800', color: colors.ink })}>One QR for every venue</Text>
            <Text style={{ ...typography.body, fontSize: s(15), marginTop: s(6), color: colors.inkMuted }}>
              Use My QR at the counter — staff stamp the card for this visit's venue.
            </Text>
            <PrimaryButton
              label="Show My QR"
              onPress={() => router.navigate('/(customer)/qr')}
              style={{ marginTop: s(14) }}
            />
          </View>
        </View>

        <View style={{ marginTop: s(space.sectionY), paddingHorizontal: space.screenX }}>
          <Text style={{ ...typography.section, fontSize: s(22) }}>Your progress</Text>
          <View
            style={{
              marginTop: s(14),
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              padding: s(space.cardPad),
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={withAppFont({ fontSize: s(28), fontWeight: '800', color: colors.ink })}>
              {readyReward
                ? progressHintCopy(0, readyReward.title)
                : progressHintCopy(stampsToNext, nextReward?.title)}
            </Text>
            <View style={{ marginTop: s(14) }}>
              <MilestonePath
                collected={stamps}
                total={maxStamps}
                milestoneStamps={milestones.map((item) => item.required_stamps)}
                claimedStamps={milestones.filter((item) => item.claimed).map((item) => item.required_stamps)}
                highlightStamps={animatingSlots}
                columns={5}
                sizeScale={SCALE}
              />
            </View>
            <Text style={{ ...typography.body, fontSize: s(16), lineHeight: s(22), marginTop: s(12) }}>
              {progressCountCopy(stamps, nextReward?.required_stamps ?? maxStamps)}
            </Text>
            {milestones.length > 1 ? (
              <View style={{ marginTop: s(12) }}>
                <Text style={withAppFont({ ...typography.caption, fontSize: s(13), fontWeight: '700' })}>All reward milestones</Text>
                <View style={{ marginTop: s(8), flexDirection: 'row', flexWrap: 'wrap', gap: s(8) }}>
                  {milestones.map((milestone) => {
                    const unlocked = stamps >= milestone.required_stamps
                    return (
                      <View
                        key={milestone.id}
                        style={{
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: unlocked ? colors.successBorder : colors.border,
                          backgroundColor: unlocked ? colors.successBg : colors.bg,
                          paddingHorizontal: s(10),
                          paddingVertical: s(6),
                        }}
                      >
                        <Text style={withAppFont({ fontSize: s(12), fontWeight: '700', color: unlocked ? colors.successText : '#475569' })}>
                          {milestone.required_stamps} • {milestone.title}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            ) : null}
            {nextReward && !readyReward ? (
              <View
                style={{
                  marginTop: s(12),
                  flexDirection: 'row',
                  gap: s(12),
                  alignItems: 'center',
                  backgroundColor: colors.bg,
                  borderRadius: s(14),
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: s(10),
                }}
              >
                {nextImage ? (
                  <Image source={{ uri: nextImage }} style={{ width: s(56), height: s(56), borderRadius: s(12) }} />
                ) : (
                  <View style={{ width: s(56), height: s(56), borderRadius: s(12), backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: s(22) }}>🎁</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={withAppFont({ fontSize: s(16), fontWeight: '800', color: colors.ink })}>{nextReward.title}</Text>
                  <Text style={{ ...typography.caption, fontSize: s(13), marginTop: 2 }}>
                    {visitsToRewardCopy(stampsToNext, nextReward.title)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {readyReward ? (
          <View
            style={{
              marginTop: s(space.sectionY),
              marginBottom: s(16),
              marginHorizontal: space.screenX,
              backgroundColor: colors.successBg,
              borderRadius: radius.card,
              padding: s(space.cardPad),
              borderWidth: 1,
              borderColor: colors.successBorder,
            }}
          >
            <Text style={{ ...typography.label, fontSize: s(12), color: colors.success }}>REWARD READY</Text>
            <Text style={withAppFont({ marginTop: s(8), fontSize: s(28), fontWeight: '800', color: colors.ink })}>{readyReward.title}</Text>
            {readyUnlock ? (
              <Link
                href={{ pathname: '/claim/[unlockId]', params: { unlockId: String(readyUnlock.unlock_id) } }}
                asChild
              >
                <PrimaryButton label="Claim reward" style={{ marginTop: s(16) }} />
              </Link>
            ) : (
              <PrimaryButton label="Claim reward" style={{ marginTop: s(16) }} onPress={() => void refresh()} />
            )}
          </View>
        ) : null}
      </Animated.View>

      <StampRewardCelebration
        visible={showCelebration}
        title={celebrationTitle}
        subtitle="Saved to Rewards — redeem when you are ready."
      />
    </ScreenGradientLayout>
  )
}
