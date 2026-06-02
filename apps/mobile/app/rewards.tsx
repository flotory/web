import { Link, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ProgressBar from '../src/components/customer/ProgressBar'
import { apiRequest } from '../src/lib/api'
import { formatShortDate } from '../src/lib/format'
import { rewardImageUrl } from '../src/lib/media'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, radius, space, type as typography } from '../src/theme'
import type { RewardJourney, RewardWalletItem, WalletCard } from '../src/types/loyalty'

interface RewardsWalletResponse {
  items: RewardWalletItem[]
  pending_count: number
}

interface CardDetailPayload {
  journey: RewardJourney | null
}

interface ClaimedRewardRow {
  id: string
  title: string
  claimedAt: string
}

export default function RewardsScreen() {
  const insets = useSafeAreaInsets()
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [readyItems, setReadyItems] = useState<RewardWalletItem[]>([])
  const [inProgress, setInProgress] = useState<WalletCard[]>([])
  const [claimed, setClaimed] = useState<ClaimedRewardRow[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const fade = useRef(new Animated.Value(0)).current
  const heroPulse = useRef(new Animated.Value(1)).current

  async function loadAll() {
    if (!token) return
    setError('')

    const [walletResponse, cardsResponse] = await Promise.all([
      apiRequest<RewardsWalletResponse>('/customer/rewards/wallet', { token }),
      apiRequest<{ cards: WalletCard[] }>('/customer/cards', { token }),
    ])

    setReadyItems(walletResponse.items)

    const pendingVenueIds = new Set(walletResponse.items.map((item) => item.customer.venue_id))
    const progressing = cardsResponse.cards.filter((card) => {
      const summary = card.summary
      const toNext = summary?.stamps_to_next ?? 0
      return toNext > 0 && !pendingVenueIds.has(card.venue_id)
    })
    setInProgress(progressing)

    const historyRows: ClaimedRewardRow[] = []
    await Promise.all(
      cardsResponse.cards.map(async (card) => {
        try {
          const detail = await apiRequest<CardDetailPayload>(`/customer/cards?venue_id=${card.venue_id}`, { token })
          for (const milestone of detail.journey?.milestones ?? []) {
            if (milestone.claimed && milestone.claimed_at) {
              historyRows.push({
                id: `${card.id}-${milestone.id}`,
                title: milestone.title,
                claimedAt: milestone.claimed_at,
              })
            }
          }
        } catch {
          // skip card history on failure
        }
      }),
    )

    historyRows.sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime())
    setClaimed(historyRows.slice(0, 12))
  }

  async function handleRefresh() {
    if (!token) return
    setRefreshing(true)
    try {
      await loadAll()
      setError('')
    } catch {
      setError('Could not refresh rewards.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    async function load() {
      if (!token) return
      try {
        await loadAll()
      } catch {
        setError('Could not load rewards.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token])

  useFocusEffect(
    useCallback(() => {
      if (!token || loading) return
      void loadAll().catch(() => undefined)
    }, [loading, token]),
  )

  useEffect(() => {
    if (loading) return
    fade.setValue(0)
    Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }).start()
  }, [fade, loading])

  useEffect(() => {
    if (!readyItems.length) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(heroPulse, { toValue: 1.02, duration: 800, useNativeDriver: true }),
        Animated.timing(heroPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => {
      loop.stop()
      heroPulse.setValue(1)
    }
  }, [heroPulse, readyItems.length])

  const hasContent = useMemo(
    () => readyItems.length > 0 || inProgress.length > 0 || claimed.length > 0,
    [claimed.length, inProgress.length, readyItems.length],
  )

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  const refreshOffset = insets.top + 116

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      refreshControl={<RefreshControl refreshing={refreshing} progressViewOffset={refreshOffset} onRefresh={() => void handleRefresh()} tintColor={colors.primary} />}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 28,
        paddingHorizontal: space.screenX,
      }}
    >
      <Animated.View style={{ opacity: fade }}>
        <Text style={typography.hero}>Rewards</Text>
        <Text style={{ ...typography.body, marginTop: 4 }}>What you can redeem now, and what is next.</Text>
        {error ? <Text style={{ color: colors.danger, marginTop: 10 }}>{error}</Text> : null}

        {!hasContent ? (
          <View style={{ marginTop: space.sectionY, alignItems: 'center' }}>
            <Text style={{ fontSize: 48 }}>🎁</Text>
            <Text style={{ ...typography.section, marginTop: 12, textAlign: 'center' }}>No rewards yet</Text>
            <Text style={{ ...typography.body, marginTop: 8, textAlign: 'center' }}>
              Collect stamps to unlock milestones at your favorite venues.
            </Text>
            <Link href="/(customer)/wallet" asChild>
              <Pressable
                style={{
                  marginTop: 20,
                  backgroundColor: colors.primary,
                  borderRadius: radius.button,
                  paddingVertical: 13,
                  paddingHorizontal: 24,
                }}
              >
                <Text style={{ color: colors.primaryText, fontWeight: '800' }}>Open wallet</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        {readyItems.length > 0 ? (
          <View style={{ marginTop: space.sectionY }}>
            <Text style={typography.section}>Ready now</Text>
            <View style={{ marginTop: 14, gap: 14 }}>
              {readyItems.map((item, index) => {
                const image = rewardImageUrl(item.reward)
                const CardWrapper = index === 0 ? Animated.View : View
                const wrapperProps =
                  index === 0 ? ({ style: { transform: [{ scale: heroPulse }] } } as const) : ({} as const)

                return (
                  <CardWrapper key={item.unlock_id} {...wrapperProps}>
                    <View
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: radius.card,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      {image ? (
                        <Image source={{ uri: image }} style={{ width: '100%', height: 150 }} resizeMode="cover" />
                      ) : (
                        <View style={{ height: 150, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 40 }}>🎁</Text>
                        </View>
                      )}
                      <View style={{ padding: space.cardPad }}>
                        <Text style={{ ...typography.label, color: colors.primary }}>READY NOW</Text>
                        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.plum, marginTop: 6 }}>
                          {item.reward.title}
                        </Text>
                        <Text style={{ ...typography.body, marginTop: 4, color: colors.inkMuted }}>{item.customer.venue?.name ?? 'Venue'}</Text>
                        <Link
                          href={{ pathname: '/claim/[unlockId]', params: { unlockId: String(item.unlock_id) } }}
                          asChild
                        >
                          <Pressable
                            style={{
                              marginTop: 14,
                              backgroundColor: colors.primary,
                              borderRadius: radius.button,
                              paddingVertical: 13,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: colors.primaryText, fontWeight: '800', fontSize: 16 }}>Claim now</Text>
                          </Pressable>
                        </Link>
                      </View>
                    </View>
                  </CardWrapper>
                )
              })}
            </View>
          </View>
        ) : null}

        {inProgress.length > 0 ? (
          <View style={{ marginTop: space.sectionY }}>
            <Text style={typography.section}>Keep collecting</Text>
            <View style={{ marginTop: 14, gap: 12 }}>
              {inProgress.map((card) => {
                const summary = card.summary
                const max = summary?.max_stamps ?? 10
                const stamps = summary?.stamps ?? card.stamps
                const remaining = summary?.stamps_to_next ?? Math.max(max - stamps, 0)
                const title = summary?.next_reward_title ?? 'Next reward'

                return (
                  <Link
                    key={card.id}
                    href={{
                      pathname: '/card/[cardId]',
                      params: { cardId: String(card.id), venueId: String(card.venue_id) },
                    }}
                    asChild
                  >
                    <Pressable
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: radius.image,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{title}</Text>
                      <Text style={{ ...typography.caption, marginTop: 2 }}>{card.venue?.name}</Text>
                      <View style={{ marginTop: 12 }}>
                        <ProgressBar value={stamps} max={max} />
                      </View>
                      <Text style={{ marginTop: 8, fontWeight: '700', color: colors.ink }}>
                        {stamps} / {max}
                      </Text>
                      <Text style={{ ...typography.caption, marginTop: 2 }}>
                        {remaining} stamp{remaining === 1 ? '' : 's'} remaining
                      </Text>
                    </Pressable>
                  </Link>
                )
              })}
            </View>
          </View>
        ) : null}

        {claimed.length > 0 ? (
          <View style={{ marginTop: space.sectionY }}>
            <Pressable
              onPress={() => setHistoryOpen((value) => !value)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Text style={typography.section}>Claim history</Text>
              <Text style={{ fontWeight: '700', color: colors.inkMuted }}>{historyOpen ? '−' : '+'}</Text>
            </Pressable>
            {historyOpen ? (
              <View style={{ marginTop: 12, gap: 10 }}>
                {claimed.map((row) => (
                  <View
                    key={row.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: colors.ink, fontWeight: '500' }}>✓ {row.title}</Text>
                    <Text style={typography.caption}>{formatShortDate(row.claimedAt)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    </ScrollView>
  )
}
