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
import QrImage from '../../src/components/QrImage'
import CoverImage from '../../src/components/ui/CoverImage'
import PrimaryButton from '../../src/components/ui/PrimaryButton'
import ScreenGradientLayout, { ScreenGradientLoading } from '../../src/components/ui/ScreenGradientLayout'
import ScreenSkeleton from '../../src/components/ui/ScreenSkeleton'
import ShakeGiftBadge from '../../src/components/ui/ShakeGiftBadge'
import StateCard from '../../src/components/ui/StateCard'
import { apiRequest } from '../../src/lib/api'
import { progressCountCopy, progressHintCopy, visitsToRewardCopy } from '../../src/lib/progressCopy'
import { hapticSuccess } from '../../src/lib/haptics'
import { rewardImageUrl, venueCoverUrl, venueLogoUrl } from '../../src/lib/media'
import { useAuth } from '../../src/providers/AuthProvider'
import { colors, radius, space, type as typography } from '../../src/theme'
import type { RewardJourney, RewardRef, WalletCard } from '../../src/types/loyalty'

interface CardPayload {
  active_card: WalletCard | null
  next_reward: RewardRef | null
  available_rewards: RewardRef[]
  journey: RewardJourney | null
}

export default function CardDetailScreen() {
  const router = useRouter()
  function handleBack() {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace('/(customer)/wallet')
  }

  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ cardId: string; venueId?: string }>()
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<CardPayload | null>(null)
  const fade = useRef(new Animated.Value(0)).current
  const readyHapticDone = useRef(false)

  const maxStamps = useMemo(() => {
    const required = payload?.journey?.milestones.map((item) => item.required_stamps) ?? []
    return Math.max(10, ...required, payload?.next_reward?.required_stamps ?? 0)
  }, [payload])

  async function load(isRefresh = false) {
    if (!token) return
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')
    try {
      const query = params.venueId ? `?venue_id=${params.venueId}` : ''
      const response = await apiRequest<CardPayload>(`/customer/cards${query}`, { token })
      setPayload(response)
    } catch {
      setError('Could not load this loyalty card.')
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void load()
  }, [params.venueId, token])

  useEffect(() => {
    if (loading) return
    fade.setValue(0)
    Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start()
  }, [fade, loading])

  const readyReward = payload?.available_rewards[0] ?? null

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

  if (loading) {
    return (
      <ScreenGradientLoading>
        <ScreenSkeleton topInset={0} cardCount={2} />
      </ScreenGradientLoading>
    )
  }

  const card = payload?.active_card
  if (!card) {
    return (
      <ScreenGradientLayout flexContent tabBarInset={false} paddingTop={insets.top + 8}>
        <View style={{ paddingHorizontal: space.screenX }}>
          <Pressable onPress={handleBack}>
            <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>← Back</Text>
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
  const stamps = card.stamps
  const stampsToNext = nextReward ? Math.max(nextReward.required_stamps - stamps, 0) : Math.max(maxStamps - stamps, 0)
  const milestones = [...(payload?.journey?.milestones ?? [])].sort((a, b) => a.required_stamps - b.required_stamps)
  const cover = venueCoverUrl(card.venue ?? undefined)
  const logo = venueLogoUrl(card.venue ?? undefined)
  const nextImage = rewardImageUrl(nextReward ?? undefined)

  return (
    <ScreenGradientLayout
      scrollable
      tabBarInset={false}
      paddingTop={insets.top + 8}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
    >
      <Pressable onPress={handleBack} style={{ paddingHorizontal: space.screenX }}>
        <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>← Back</Text>
      </Pressable>

      {error ? (
        <View style={{ paddingHorizontal: space.screenX, marginTop: 8 }}>
          <StateCard
            emoji="⚠️"
            title="Could not load card"
            message="Try again or return to your wallet."
            primaryAction={{ label: 'Try again', onPress: () => void load(true) }}
            secondaryAction={{ label: 'Open wallet', onPress: () => router.replace('/(customer)/wallet') }}
          />
        </View>
      ) : null}

      <Animated.View style={{ opacity: fade, marginTop: space.headerBottom }}>
        <View style={{ marginTop: 12, marginHorizontal: space.screenX, borderRadius: radius.card, overflow: 'hidden' }}>
          <CoverImage uri={cover} />
          {readyReward ? (
            <View style={{ position: 'absolute', top: 14, right: 14 }}>
              <ShakeGiftBadge />
            </View>
          ) : null}
          <View style={{ position: 'absolute', left: 16, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {logo ? <Image source={{ uri: logo }} style={{ width: 52, height: 52 }} /> : <Text style={{ fontSize: 24 }}>☕</Text>}
            </View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.primaryText, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 8 }}>
              {card.venue?.name ?? 'Loyalty card'}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: space.sectionY, paddingHorizontal: space.screenX }}>
          <Text style={typography.section}>Add a stamp</Text>
          <View
            style={{
              marginTop: 14,
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>Show this QR when staff scans</Text>
            <View style={{ marginTop: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 10 }}>
              <QrImage value={card.qr_token} size={190} />
            </View>
            <Text style={{ ...typography.caption, marginTop: 10, textAlign: 'center' }}>QR updates your current card progress instantly.</Text>
          </View>
        </View>

        <View style={{ marginTop: space.sectionY, paddingHorizontal: space.screenX }}>
          <Text style={typography.section}>Your progress</Text>
          <View
            style={{
              marginTop: 14,
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              padding: space.cardPad,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink }}>
              {readyReward
                ? progressHintCopy(0, readyReward.title)
                : progressHintCopy(stampsToNext, nextReward?.title)}
            </Text>
            <View style={{ marginTop: 14 }}>
              <MilestonePath
                collected={stamps}
                total={maxStamps}
                milestoneStamps={milestones.map((item) => item.required_stamps)}
                claimedStamps={milestones.filter((item) => item.claimed).map((item) => item.required_stamps)}
                columns={5}
              />
            </View>
            <Text style={{ ...typography.body, marginTop: 12 }}>
              {progressCountCopy(stamps, nextReward?.required_stamps ?? maxStamps)}
            </Text>
            {milestones.length > 1 ? (
              <View style={{ marginTop: 12 }}>
                <Text style={{ ...typography.caption, fontWeight: '700' }}>All reward milestones</Text>
                <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: unlocked ? colors.successText : '#475569' }}>
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
                  marginTop: 12,
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'center',
                  backgroundColor: colors.bg,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 10,
                }}
              >
                {nextImage ? (
                  <Image source={{ uri: nextImage }} style={{ width: 56, height: 56, borderRadius: 12 }} />
                ) : (
                  <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>🎁</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{nextReward.title}</Text>
                  <Text style={{ ...typography.caption, marginTop: 2 }}>
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
              marginTop: space.sectionY,
              marginHorizontal: space.screenX,
              backgroundColor: colors.successBg,
              borderRadius: radius.card,
              padding: space.cardPad,
              borderWidth: 1,
              borderColor: colors.successBorder,
            }}
          >
            <Text style={{ ...typography.label, color: colors.success }}>REWARD READY</Text>
            <Text style={{ marginTop: 8, fontSize: 28, fontWeight: '800', color: colors.ink }}>{readyReward.title}</Text>
            <Link href="/(customer)/rewards" asChild>
              <PrimaryButton label="Claim reward" style={{ marginTop: 16 }} />
            </Link>
          </View>
        ) : null}
      </Animated.View>
    </ScreenGradientLayout>
  )
}
