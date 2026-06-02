import { Link, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Image, RefreshControl, Text, View } from 'react-native'
import HomeRewardCarousel, { type HomeRewardSlide } from '../src/components/customer/HomeRewardCarousel'
import RewardJourneyRibbon from '../src/components/customer/RewardJourneyRibbon'
import AnimatedSection from '../src/components/ui/AnimatedSection'
import PressableCard from '../src/components/ui/PressableCard'
import ScreenGradientLayout, { ScreenGradientLoading } from '../src/components/ui/ScreenGradientLayout'
import ScreenHeader from '../src/components/ui/ScreenHeader'
import ScreenSkeleton from '../src/components/ui/ScreenSkeleton'
import ShakeGiftBadge from '../src/components/ui/ShakeGiftBadge'
import StateCard from '../src/components/ui/StateCard'
import { apiRequest } from '../src/lib/api'
import { formatRelativeTime } from '../src/lib/format'
import { hapticSuccess } from '../src/lib/haptics'
import { heroProgressSubtitle, heroProgressTitle, progressCountCopy, visitsToRewardCopy } from '../src/lib/progressCopy'
import { venueLogoUrl } from '../src/lib/media'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, radius, shadows, space, type as typography } from '../src/theme'
import type { ActivityRow, RewardWalletItem, VisitRow, WalletCard } from '../src/types/loyalty'

interface CardsResponse {
  cards: WalletCard[]
}

interface CardDetailSlice {
  recent_visits: VisitRow[]
}

interface RewardsWalletResponse {
  items: RewardWalletItem[]
  pending_count: number
}

export default function CustomerHomeScreen() {
  const router = useRouter()
  const { token, role, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [cards, setCards] = useState<WalletCard[]>([])
  const [readyItems, setReadyItems] = useState<RewardWalletItem[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const fade = useRef(new Animated.Value(0)).current

  const firstName = useMemo(() => {
    const name = user?.name?.trim() ?? 'there'
    return name.split(/\s+/)[0] ?? name
  }, [user?.name])

  const activeCards = useMemo(
    () =>
      [...cards]
        .filter((card) => card.venue)
        .sort((a, b) => (b.summary?.pending_rewards_count ?? 0) - (a.summary?.pending_rewards_count ?? 0))
        .slice(0, 3),
    [cards],
  )

  const readyVenueIds = useMemo(() => new Set(readyItems.map((item) => item.customer.venue_id)), [readyItems])

  const rewardSlides = useMemo((): HomeRewardSlide[] => {
    if (readyItems.length > 0) {
      return readyItems.map((item) => ({
        id: `ready-${item.unlock_id}`,
        kind: 'ready' as const,
        item,
      }))
    }
    return activeCards.map((card) => ({
      id: `next-${card.id}`,
      kind: 'next' as const,
      card,
    }))
  }, [activeCards, readyItems])

  const priorityCard = activeCards[0] ?? null
  const lastUnlockHaptic = useRef<number | null>(null)

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!token || role !== 'customer') return
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError('')

      try {
        const [cardsResponse, walletResponse] = await Promise.all([
          apiRequest<CardsResponse>('/customer/cards', { token }),
          apiRequest<RewardsWalletResponse>('/customer/rewards/wallet', { token }),
        ])

        setCards(cardsResponse.cards)
        setReadyItems(walletResponse.items)

        const visitSources = await Promise.all(
          cardsResponse.cards.slice(0, 3).map(async (card) => {
            try {
              const detail = await apiRequest<CardDetailSlice>(`/customer/cards?venue_id=${card.venue_id}`, { token })
              return { card, visits: detail.recent_visits ?? [] }
            } catch {
              return { card, visits: [] as VisitRow[] }
            }
          }),
        )

        const rows: ActivityRow[] = []
        for (const source of visitSources) {
          const venueName = source.card.venue?.name ?? 'Venue'
          for (const visit of source.visits.slice(0, 2)) {
            rows.push({
              id: `visit-${visit.id}`,
              label: `+1 visit · ${venueName}`,
              time: formatRelativeTime(visit.created_at),
            })
          }
        }
        for (const item of walletResponse.items.slice(0, 2)) {
          rows.push({
            id: `unlock-${item.unlock_id}`,
            label: `Reward unlocked · ${item.customer.venue?.name ?? 'Venue'}`,
            time: 'Today',
          })
        }
        for (const card of cardsResponse.cards) {
          if (card.created_at) {
            rows.push({
              id: `join-${card.id}`,
              label: `Joined ${card.venue?.name ?? 'venue'}`,
              time: formatRelativeTime(card.created_at),
            })
          }
        }
        const unique = new Map<string, ActivityRow>()
        for (const row of rows) {
          if (!unique.has(row.id)) unique.set(row.id, row)
        }
        setActivity([...unique.values()].slice(0, 3))
      } catch {
        setError('Could not load your home.')
      } finally {
        if (isRefresh) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      }
    },
    [role, token],
  )

  useFocusEffect(
    useCallback(() => {
      void loadData()
    }, [loadData]),
  )

  useEffect(() => {
    if (loading) return
    fade.setValue(0)
    Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start()
  }, [fade, loading])

  useEffect(() => {
    const newest = readyItems[0]
    if (!newest) return
    if (lastUnlockHaptic.current === newest.unlock_id) return
    lastUnlockHaptic.current = newest.unlock_id
    hapticSuccess()
  }, [readyItems])

  if (role !== 'customer') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: space.screenX, backgroundColor: colors.bg }}>
        <Text style={typography.section}>Customer home only</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <ScreenGradientLoading>
        <ScreenSkeleton topInset={0} cardCount={3} />
      </ScreenGradientLoading>
    )
  }

  const nextTitle = priorityCard?.summary?.next_reward_title ?? 'your next reward'
  const stampsLeft = priorityCard?.summary?.stamps_to_next ?? null
  const headerRewardTitle = readyItems[0]?.reward.title ?? nextTitle
  const headerStampsLeft = readyItems.length > 0 ? 0 : (stampsLeft ?? 0)

  const screenHeader = (
    <ScreenHeader
      pretitle={`Hi, ${firstName}`}
      title={heroProgressTitle(headerStampsLeft, headerRewardTitle)}
      subtitle={heroProgressSubtitle(headerStampsLeft, headerRewardTitle)}
    />
  )

  return (
    <ScreenGradientLayout
      scrollable
      tabBarInset
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} tintColor={colors.primary} />}
    >
          {error ? (
            <AnimatedSection style={{ marginBottom: space.headerBottom, paddingHorizontal: space.screenX }}>
              <StateCard
                emoji="⚠️"
                title="Could not load home"
                message="Pull to refresh or try again in a moment."
                primaryAction={{ label: 'Try again', onPress: () => void loadData(true) }}
                secondaryAction={{ label: 'Open wallet', onPress: () => router.push('/(customer)/wallet') }}
              />
            </AnimatedSection>
          ) : null}

          <Animated.View style={{ opacity: fade }}>
            <View style={{ paddingHorizontal: space.screenX }}>{screenHeader}</View>

            {rewardSlides.length > 0 ? (
              <View style={{ marginTop: space.sectionGap, backgroundColor: 'transparent' }}>
                <HomeRewardCarousel slides={rewardSlides} />
              </View>
            ) : null}

        {activeCards.length > 0 ? (
          <View style={{ marginTop: space.sectionY, paddingHorizontal: space.screenX }}>
            <Text style={typography.section}>Keep collecting</Text>
            <View style={{ marginTop: 14, gap: 14 }}>
              {activeCards.map((card) => {
                const summary = card.summary
                const max = summary?.max_stamps ?? 10
                const stamps = summary?.stamps ?? card.stamps
                const nextTarget = summary?.next_reward_stamps ?? max
                const currentToNextReward = Math.min(stamps, nextTarget)
                const toNext = Math.max(nextTarget - currentToNextReward, 0)
                const cardNextTitle = summary?.next_reward_title ?? 'your next reward'
                const hasReadyReward =
                  readyVenueIds.has(card.venue_id) || (summary?.pending_rewards_count ?? 0) > 0

                return (
                  <Link
                    key={card.id}
                    href={{
                      pathname: '/card/[cardId]',
                      params: { cardId: String(card.id), venueId: String(card.venue_id) },
                    }}
                    asChild
                  >
                    <PressableCard
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: radius.card,
                        padding: space.cardPad,
                        borderWidth: 1,
                        borderColor: colors.border,
                        ...shadows.sm,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            backgroundColor: colors.surfaceMuted,
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          {venueLogoUrl(card.venue ?? undefined) ? (
                            <Image
                              source={{ uri: venueLogoUrl(card.venue ?? undefined)! }}
                              style={{ width: 48, height: 48 }}
                            />
                          ) : (
                            <Text style={{ fontSize: 22 }}>☕</Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{card.venue?.name}</Text>
                          <Text style={{ marginTop: 4, fontSize: 14, color: colors.inkMuted }}>
                            {hasReadyReward
                              ? 'Reward unlocked'
                              : visitsToRewardCopy(toNext, cardNextTitle)}
                          </Text>
                        </View>
                        {hasReadyReward ? <ShakeGiftBadge /> : null}
                      </View>
                      <View style={{ marginTop: 14 }}>
                        <RewardJourneyRibbon value={currentToNextReward} target={nextTarget} checkpoints={[nextTarget]} />
                      </View>
                      <Text style={{ ...typography.caption, marginTop: 10 }}>
                        {progressCountCopy(currentToNextReward, nextTarget)}
                      </Text>
                    </PressableCard>
                  </Link>
                )
              })}
            </View>
          </View>
        ) : (
          <AnimatedSection style={{ marginTop: space.sectionY, paddingHorizontal: space.screenX }}>
            <StateCard
              emoji="☕"
              title="Start your first card"
              message="Discover a venue nearby and begin collecting visits toward your first reward."
              primaryAction={{ label: 'Browse venues', onPress: () => router.push('/(customer)/venues') }}
            />
          </AnimatedSection>
        )}

        {activity.length > 0 ? (
          <View style={{ marginTop: space.sectionY, paddingHorizontal: space.screenX }}>
            <Text style={typography.section}>Recent activity</Text>
            <View style={{ marginTop: 14, gap: 12 }}>
              {activity.map((row) => (
                <View key={row.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ flex: 1, fontSize: 16, color: colors.ink, fontWeight: '500' }}>{row.label}</Text>
                  <Text style={typography.caption}>{row.time}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
          </Animated.View>
    </ScreenGradientLayout>
  )
}
