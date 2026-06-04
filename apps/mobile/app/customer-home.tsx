import { Link, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Animated, Image, Pressable, Text, View } from 'react-native'
import HomeRewardCarousel, { type HomeRewardSlide } from '../src/components/customer/HomeRewardCarousel'
import RewardJourneyRibbon from '../src/components/customer/RewardJourneyRibbon'
import AnimatedSection from '../src/components/ui/AnimatedSection'
import CustomerScreen from '../src/components/ui/CustomerScreen'
import PressableCard from '../src/components/ui/PressableCard'
import ScreenHeader from '../src/components/ui/ScreenHeader'
import ShakeGiftBadge from '../src/components/ui/ShakeGiftBadge'
import PrimaryButton from '../src/components/ui/PrimaryButton'
import StateCard from '../src/components/ui/StateCard'
import { useCustomerCards } from '../src/hooks/useCustomerCards'
import { useFadeOnReady } from '../src/hooks/useFadeOnReady'
import { useRewardsWallet } from '../src/hooks/useRewardsWallet'
import { buildHomeActivity } from '../src/lib/customerData'
import { hapticSuccess } from '../src/lib/haptics'
import { heroProgressSubtitle, heroProgressTitle, progressCountCopy, visitsToRewardCopy } from '../src/lib/progressCopy'
import { venueLogoUrl } from '../src/lib/media'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, radius, shadows, space, type as typography } from '../src/theme'

export default function CustomerHomeScreen() {
  const router = useRouter()
  const { role, user } = useAuth()
  const cardsQuery = useCustomerCards({ refetchOnFocus: true })
  const walletQuery = useRewardsWallet({ refetchOnFocus: true })
  const lastUnlockHaptic = useRef<number | null>(null)

  const loading = cardsQuery.loading || walletQuery.loading
  const refreshing = cardsQuery.refreshing || walletQuery.refreshing
  const error = cardsQuery.error || walletQuery.error
  const cards = cardsQuery.data ?? []
  const readyItems = walletQuery.data?.items ?? []
  const fade = useFadeOnReady(!loading)

  const refresh = useCallback(() => {
    cardsQuery.refresh()
    walletQuery.refresh()
  }, [cardsQuery, walletQuery])

  const reload = useCallback(() => {
    cardsQuery.reload()
    walletQuery.reload()
  }, [cardsQuery, walletQuery])

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
  const homePromotion = useMemo(() => cards.find((card) => card.promotion)?.promotion ?? null, [cards])

  const activity = useMemo(
    () => buildHomeActivity(cards, readyItems),
    [cards, readyItems],
  )

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

  const nextTitle = priorityCard?.summary?.next_reward_title ?? 'your next reward'
  const stampsLeft = priorityCard?.summary?.stamps_to_next ?? null
  const headerRewardTitle = readyItems[0]?.reward.title ?? nextTitle
  const headerStampsLeft = readyItems.length > 0 ? 0 : (stampsLeft ?? 0)

  const header = (
    <Animated.View style={{ opacity: fade }}>
      <View style={{ paddingHorizontal: space.screenX }}>
        <ScreenHeader
          pretitle={`Hi, ${firstName}`}
          title={heroProgressTitle(headerStampsLeft, headerRewardTitle)}
          subtitle={heroProgressSubtitle(headerStampsLeft, headerRewardTitle)}
        />
        <PrimaryButton
          label="Show My QR"
          onPress={() => router.navigate('/(customer)/qr')}
          pulse
          style={{ marginTop: 16 }}
        />
        <Pressable
          onPress={() => router.push('/(customer)/venues')}
          style={{ marginTop: 12, alignSelf: 'center', paddingVertical: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Discover venues"
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>Discover venues</Text>
        </Pressable>
      </View>
    </Animated.View>
  )

  return (
    <CustomerScreen
      loading={loading}
      error={error}
      scrollable
      tabBarInset
      refreshing={refreshing}
      onRefresh={refresh}
      header={header}
      errorState={
        error
          ? {
              title: 'Could not load home',
              message: 'Pull to refresh or try again in a moment.',
              primaryLabel: 'Try again',
              onPrimary: reload,
              secondaryLabel: 'Open wallet',
              onSecondary: () => router.push('/(customer)/wallet'),
            }
          : undefined
      }
    >
      {!error ? (
        <Animated.View style={{ opacity: fade }}>
            {rewardSlides.length > 0 ? (
              <View style={{ marginTop: space.sectionGap, backgroundColor: 'transparent' }}>
                <HomeRewardCarousel slides={rewardSlides} />
              </View>
            ) : null}

            {homePromotion ? (
              <View
                style={{
                  marginTop: space.sectionGap,
                  marginHorizontal: space.screenX,
                  backgroundColor: colors.accentSoft,
                  borderRadius: radius.card,
                  borderWidth: 1,
                  borderColor: colors.accentBorder,
                  padding: space.cardPad,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.accent }}>🔥 {homePromotion.headline}</Text>
                <Text style={{ ...typography.body, marginTop: 6, color: colors.inkMuted }}>{homePromotion.message}</Text>
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
              primaryAction={{ label: 'Discover venues', onPress: () => router.push('/(customer)/venues') }}
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
      ) : null}
    </CustomerScreen>
  )
}
