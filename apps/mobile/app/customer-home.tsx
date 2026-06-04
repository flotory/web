import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Animated, Text, View } from 'react-native'

import HomeCampaignCarousel, { type HomeCampaignSlide } from '../src/components/customer/HomeCampaignCarousel'
import HomeNearestRewardCard, { type NearestRewardFocus } from '../src/components/customer/HomeNearestRewardCard'
import HomeQuickActions from '../src/components/customer/HomeQuickActions'
import AnimatedSection from '../src/components/ui/AnimatedSection'
import CustomerScreen from '../src/components/ui/CustomerScreen'
import ScreenHeader from '../src/components/ui/ScreenHeader'
import StateCard from '../src/components/ui/StateCard'
import { useCustomerCards } from '../src/hooks/useCustomerCards'
import { useFadeOnReady } from '../src/hooks/useFadeOnReady'
import { useRewardsWallet } from '../src/hooks/useRewardsWallet'
import { buildHomeActivity } from '../src/lib/customerData'
import { hapticSuccess } from '../src/lib/haptics'
import { heroProgressSubtitle, heroProgressTitle } from '../src/lib/progressCopy'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, space, type as typography } from '../src/theme'

const MAX_HOME_CAMPAIGNS = 10

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

  const nearestReward = useMemo((): NearestRewardFocus | null => {
    if (readyItems[0]) {
      return { kind: 'ready', item: readyItems[0] }
    }

    const nextCards = [...cards]
      .filter((card) => card.venue)
      .sort((a, b) => {
        const aLeft = a.summary?.stamps_to_next ?? 999
        const bLeft = b.summary?.stamps_to_next ?? 999
        if (aLeft !== bLeft) return aLeft - bLeft
        return (b.summary?.pending_rewards_count ?? 0) - (a.summary?.pending_rewards_count ?? 0)
      })

    if (nextCards[0]) {
      return { kind: 'next', card: nextCards[0] }
    }

    return null
  }, [cards, readyItems])

  const campaignSlides = useMemo((): HomeCampaignSlide[] => {
    const seenVenues = new Set<number>()
    const slides: HomeCampaignSlide[] = []

    for (const card of cards) {
      if (!card.promotion || !card.venue || seenVenues.has(card.venue_id)) {
        continue
      }
      seenVenues.add(card.venue_id)
      slides.push({
        id: String(card.venue_id),
        card,
        promotion: card.promotion,
      })
      if (slides.length >= MAX_HOME_CAMPAIGNS) {
        break
      }
    }

    return slides
  }, [cards])

  const activity = useMemo(
    () => buildHomeActivity(cards, readyItems),
    [cards, readyItems],
  )

  const headerStampsLeft = useMemo(() => {
    if (readyItems.length > 0) return 0
    if (nearestReward?.kind === 'next') {
      return nearestReward.card.summary?.stamps_to_next ?? 0
    }
    return 0
  }, [nearestReward, readyItems.length])

  const headerRewardTitle = useMemo(() => {
    if (nearestReward?.kind === 'ready') return nearestReward.item.reward.title
    if (nearestReward?.kind === 'next') return nearestReward.card.summary?.next_reward_title ?? 'your next reward'
    return 'your next reward'
  }, [nearestReward])

  const quickActions = useMemo(
    () => [
      {
        id: 'scan',
        label: 'Scan QR',
        subtitle: 'Earn stamps',
        icon: 'qr-code-outline' as const,
        tint: colors.lavender,
        onPress: () => router.navigate('/(customer)/qr'),
      },
      {
        id: 'rewards',
        label: 'View rewards',
        subtitle: 'See what you can unlock',
        icon: 'gift-outline' as const,
        tint: colors.accentSoft,
        onPress: () => router.navigate('/(customer)/rewards'),
      },
      {
        id: 'venues',
        label: 'Find a venue',
        subtitle: 'Explore nearby venues',
        icon: 'compass-outline' as const,
        tint: colors.dangerSoft,
        onPress: () => router.push('/(customer)/venues'),
      },
    ],
    [router],
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

  const header = (
    <Animated.View style={{ opacity: fade }}>
      <View style={{ paddingHorizontal: space.screenX }}>
        <ScreenHeader
          pretitle={`Hi, ${firstName}`}
          title={heroProgressTitle(headerStampsLeft, headerRewardTitle)}
          subtitle={heroProgressSubtitle(headerStampsLeft, headerRewardTitle)}
        />
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
          {nearestReward ? (
            <View style={{ marginTop: space.sectionGap, paddingHorizontal: space.screenX }}>
              <HomeNearestRewardCard focus={nearestReward} />
            </View>
          ) : (
            <AnimatedSection style={{ marginTop: space.sectionY, paddingHorizontal: space.screenX }}>
              <StateCard
                emoji="☕"
                title="Start your first card"
                message="Discover a venue nearby and begin collecting visits toward your first reward."
                primaryAction={{ label: 'Find a venue', onPress: () => router.push('/(customer)/venues') }}
              />
            </AnimatedSection>
          )}

          {campaignSlides.length > 0 ? (
            <View style={{ marginTop: space.sectionY }}>
              <HomeCampaignCarousel slides={campaignSlides} />
            </View>
          ) : null}

          <View style={{ marginTop: space.sectionY }}>
            <HomeQuickActions actions={quickActions} />
          </View>

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
