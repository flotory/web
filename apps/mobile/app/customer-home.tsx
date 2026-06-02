import { Link, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import RewardJourneyRibbon from '../src/components/customer/RewardJourneyRibbon'
import { apiRequest } from '../src/lib/api'
import { formatRelativeTime, greetingForHour } from '../src/lib/format'
import { rewardImageUrl, venueLogoUrl } from '../src/lib/media'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, radius, space, type as typography } from '../src/theme'
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
  const insets = useSafeAreaInsets()
  const { token, role, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cards, setCards] = useState<WalletCard[]>([])
  const [readyItems, setReadyItems] = useState<RewardWalletItem[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const fade = useRef(new Animated.Value(0)).current
  const heroPulse = useRef(new Animated.Value(1)).current

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

  const heroReward = readyItems[0] ?? null
  const priorityCard = activeCards[0] ?? null

  useFocusEffect(
    useCallback(() => {
      let active = true

      async function load() {
        if (!token || role !== 'customer') return
        setLoading(true)
        setError('')

        try {
          const [cardsResponse, walletResponse] = await Promise.all([
            apiRequest<CardsResponse>('/customer/cards', { token }),
            apiRequest<RewardsWalletResponse>('/customer/rewards/wallet', { token }),
          ])

          if (!active) return

          setCards(cardsResponse.cards)
          setReadyItems(walletResponse.items)

          const visitSources = await Promise.all(
            cardsResponse.cards.slice(0, 3).map(async (card) => {
              try {
                const detail = await apiRequest<CardDetailSlice>(
                  `/customer/cards?venue_id=${card.venue_id}`,
                  { token },
                )
                return { card, visits: detail.recent_visits ?? [] }
              } catch {
                return { card, visits: [] as VisitRow[] }
              }
            }),
          )

          if (!active) return

          const rows: ActivityRow[] = []

          for (const source of visitSources) {
            const venueName = source.card.venue?.name ?? 'Venue'
            for (const visit of source.visits.slice(0, 2)) {
              rows.push({
                id: `visit-${visit.id}`,
                label: `+1 stamp · ${venueName}`,
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
          if (active) setError('Could not load your home.')
        } finally {
          if (active) setLoading(false)
        }
      }

      void load()
      return () => {
        active = false
      }
    }, [role, token]),
  )

  useEffect(() => {
    if (loading) return
    fade.setValue(0)
    Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start()
  }, [fade, loading])

  useEffect(() => {
    if (!heroReward) return
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
  }, [heroPulse, heroReward])

  if (role !== 'customer') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: space.screenX, backgroundColor: colors.bg }}>
        <Text style={typography.section}>Customer home only</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    )
  }

  const pendingCount = readyItems.length
  const nextTitle = priorityCard?.summary?.next_reward_title ?? 'your next reward'
  const stampsLeft = priorityCard?.summary?.stamps_to_next ?? null
  const homeInk = colors.ink
  const homeMuted = '#475569'
  const homeBorder = colors.border
  const homeAccent = colors.primary

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 28,
        paddingHorizontal: space.screenX,
      }}
    >
      <Animated.View style={{ opacity: fade }}>
        <Text style={{ ...typography.caption, fontWeight: '600' }}>
          {greetingForHour()}, {firstName}
        </Text>
        <Text style={{ ...typography.hero, marginTop: 6 }}>
          {pendingCount > 0 ? 'Reward waiting for you' : stampsLeft && stampsLeft > 0 ? `Only ${stampsLeft} left` : 'Keep going'}
        </Text>
        <Text style={{ ...typography.body, marginTop: 6 }}>
          {pendingCount > 0 ? 'Claim it on your next visit.' : `Unlock ${nextTitle}`}
        </Text>

        {error ? <Text style={{ color: '#B91C1C', marginTop: 12, fontWeight: '600' }}>{error}</Text> : null}

        {heroReward ? (
          <Animated.View style={{ marginTop: space.sectionY, transform: [{ scale: heroPulse }] }}>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: radius.card,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: homeBorder,
              }}
            >
              {rewardImageUrl(heroReward.reward) ? (
                <Image
                  source={{ uri: rewardImageUrl(heroReward.reward)! }}
                  style={{ width: '100%', height: 180 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ height: 180, backgroundColor: '#EDECE8', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 48 }}>🎁</Text>
                </View>
              )}
              <View style={{ padding: space.cardPad }}>
                <Text style={{ ...typography.label, color: homeAccent }}>READY NOW</Text>
                <Text style={{ fontSize: 30, fontWeight: '800', color: homeInk }}>{heroReward.reward.title}</Text>
                <Text style={{ ...typography.body, marginTop: 4, color: homeMuted }}>{heroReward.customer.venue?.name ?? 'Venue'}</Text>
                <Link href={{ pathname: '/claim/[unlockId]', params: { unlockId: String(heroReward.unlock_id) } }} asChild>
                  <Pressable
                    style={{
                      marginTop: 16,
                      backgroundColor: homeAccent,
                      borderRadius: radius.button,
                      paddingVertical: 14,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.primaryText, fontWeight: '800', fontSize: 16 }}>Claim reward</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </Animated.View>
        ) : (
          <View style={{ marginTop: space.sectionY, backgroundColor: '#FFFFFF', borderRadius: radius.card, padding: space.cardPad, borderWidth: 1, borderColor: homeBorder }}>
            <Text style={{ ...typography.label, color: homeAccent }}>NEXT UP</Text>
            <Text style={{ marginTop: 6, fontSize: 26, fontWeight: '800', color: homeInk }}>{nextTitle}</Text>
            <Text style={{ ...typography.body, marginTop: 6 }}>{stampsLeft ? `${stampsLeft} stamps away` : 'You are on track'}</Text>
            <Link href="/(customer)/wallet" asChild>
              <Pressable style={{ marginTop: 14, backgroundColor: homeAccent, borderRadius: radius.button, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>View progress</Text>
              </Pressable>
            </Link>
          </View>
        )}

        {activeCards.length > 0 ? (
          <View style={{ marginTop: space.sectionY }}>
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
                        borderRadius: radius.card,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            backgroundColor: '#EDECE8',
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
                            {toNext > 0 ? `${toNext} until ${cardNextTitle}` : `${cardNextTitle} unlocked`}
                          </Text>
                        </View>
                      </View>
                      <View style={{ marginTop: 14 }}>
                        <RewardJourneyRibbon value={currentToNextReward} target={nextTarget} checkpoints={[nextTarget]} />
                      </View>
                      <Text style={{ ...typography.caption, marginTop: 10 }}>
                        {currentToNextReward} / {nextTarget}
                      </Text>
                    </Pressable>
                  </Link>
                )
              })}
            </View>
          </View>
        ) : (
          <View
            style={{
              marginTop: space.sectionY,
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              padding: space.cardPad,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>Start your first card</Text>
            <Text style={{ ...typography.body, marginTop: 6 }}>Join a venue to collect stamps and unlock rewards.</Text>
            <Link href="/(customer)/venues" asChild>
              <Pressable
                style={{
                  marginTop: 16,
                  backgroundColor: colors.primary,
                  borderRadius: radius.button,
                  paddingVertical: 13,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.primaryText, fontWeight: '800' }}>Discover venues</Text>
              </Pressable>
            </Link>
          </View>
        )}

        {activity.length > 0 ? (
          <View style={{ marginTop: space.sectionY }}>
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
    </ScrollView>
  )
}
