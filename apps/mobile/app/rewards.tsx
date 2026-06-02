import { Link, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native'

import ProgressBar from '../src/components/customer/ProgressBar'
import CoverImage from '../src/components/ui/CoverImage'
import GradientCard from '../src/components/ui/GradientCard'
import GradientOutlineButton from '../src/components/ui/GradientOutlineButton'
import PressableCard from '../src/components/ui/PressableCard'
import ScreenGradientLayout, { ScreenGradientLoading } from '../src/components/ui/ScreenGradientLayout'
import ScreenHeader from '../src/components/ui/ScreenHeader'
import ScreenSkeleton from '../src/components/ui/ScreenSkeleton'
import StateCard from '../src/components/ui/StateCard'
import { progressCountCopy, progressHintCopy } from '../src/lib/progressCopy'
import { apiRequest } from '../src/lib/api'
import { formatShortDate } from '../src/lib/format'
import { rewardImageUrl } from '../src/lib/media'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, space, type as typography } from '../src/theme'
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
  const router = useRouter()
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [readyItems, setReadyItems] = useState<RewardWalletItem[]>([])
  const [inProgress, setInProgress] = useState<WalletCard[]>([])
  const [claimed, setClaimed] = useState<ClaimedRewardRow[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const fade = useRef(new Animated.Value(0)).current

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

  const hasContent = useMemo(
    () => readyItems.length > 0 || inProgress.length > 0 || claimed.length > 0,
    [claimed.length, inProgress.length, readyItems.length],
  )

  if (loading) {
    return (
      <ScreenGradientLoading>
        <ScreenSkeleton topInset={0} cardCount={3} />
      </ScreenGradientLoading>
    )
  }

  return (
    <ScreenGradientLayout
      scrollable
      tabBarInset
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={colors.primary} />}
    >
      <View style={{ paddingHorizontal: space.screenX }}>
        <ScreenHeader title="Rewards" subtitle="What you can redeem now, and what is next." />
      </View>

      {error ? (
        <View style={{ marginTop: space.headerBottom, paddingHorizontal: space.screenX }}>
          <StateCard
            emoji="⚠️"
            title="Could not load rewards"
            message="Try again or open your wallet to keep collecting."
            primaryAction={{ label: 'Try again', onPress: () => void handleRefresh() }}
            secondaryAction={{ label: 'Open wallet', onPress: () => router.push('/(customer)/wallet') }}
          />
        </View>
      ) : null}

        <Animated.View style={{ opacity: fade, marginTop: error ? space.sectionGap : space.headerBottom, paddingHorizontal: space.screenX }}>

        {!hasContent ? (
          <View style={{ marginTop: space.sectionY }}>
            <StateCard
              emoji="🎁"
              title="No rewards yet"
              message="Keep visiting your favorite spots to unlock your first treat."
              primaryAction={{ label: 'Open wallet', onPress: () => router.push('/(customer)/wallet') }}
              secondaryAction={{ label: 'Browse venues', onPress: () => router.push('/(customer)/venues') }}
            />
          </View>
        ) : null}

        {readyItems.length > 0 ? (
          <View style={{ marginTop: space.sectionY }}>
            <Text style={typography.section}>Ready now</Text>
            <View style={{ marginTop: 14, gap: 14 }}>
              {readyItems.map((item) => {
                const image = rewardImageUrl(item.reward)

                return (
                  <Link
                    key={item.unlock_id}
                    href={{ pathname: '/claim/[unlockId]', params: { unlockId: String(item.unlock_id) } }}
                    asChild
                  >
                    <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.97 : 1 })}>
                      <GradientCard header={<CoverImage uri={image} />}>
                        <Text style={{ ...typography.label, color: colors.accent }}>🎉 Reward unlocked</Text>
                        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.plum, marginTop: 6 }}>
                          {item.reward.title}
                        </Text>
                        <Text style={{ ...typography.body, marginTop: 4, color: colors.inkMuted }}>
                          {item.customer.venue?.name ?? 'Venue'}
                        </Text>
                        <GradientOutlineButton label="Claim in store" />
                      </GradientCard>
                    </Pressable>
                  </Link>
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
                    <PressableCard style={{ backgroundColor: 'transparent' }}>
                      <GradientCard>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{title}</Text>
                        <Text style={{ ...typography.caption, marginTop: 2 }}>{card.venue?.name}</Text>
                        <View style={{ marginTop: space.sectionGap }}>
                          <ProgressBar value={stamps} max={max} />
                        </View>
                        <Text style={{ marginTop: 8, fontWeight: '700', color: colors.ink }}>
                          {progressHintCopy(remaining, title)}
                        </Text>
                        <Text style={{ ...typography.caption, marginTop: 2 }}>
                          {progressCountCopy(stamps, max)}
                        </Text>
                        <GradientOutlineButton label="View progress" />
                      </GradientCard>
                    </PressableCard>
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
              <View style={{ marginTop: space.cardGap, gap: space.cardGap }}>
                {claimed.map((row) => (
                  <GradientCard key={row.id} padding={12}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }} numberOfLines={1}>
                          {row.title}
                        </Text>
                        <Text style={{ ...typography.caption, marginTop: 2, color: colors.successText }}>Redeemed</Text>
                      </View>
                      <Text style={{ ...typography.caption, fontSize: 12 }}>{formatShortDate(row.claimedAt)}</Text>
                    </View>
                  </GradientCard>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
        </Animated.View>
    </ScreenGradientLayout>
  )
}
