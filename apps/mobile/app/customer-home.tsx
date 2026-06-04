import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Animated, Text, View } from 'react-native'

import HomeCampaignCarousel from '../src/components/customer/HomeCampaignCarousel'
import HomeQuickActions from '../src/components/customer/HomeQuickActions'
import HomeRewardCarousel, { type HomeRewardSlide } from '../src/components/customer/HomeRewardCarousel'
import HomeRewardTicketCard from '../src/components/customer/HomeRewardTicketCard'
import AnimatedSection from '../src/components/ui/AnimatedSection'
import CustomerScreen from '../src/components/ui/CustomerScreen'
import HomeScreenHeader from '../src/components/ui/HomeScreenHeader'
import StateCard from '../src/components/ui/StateCard'
import { useFadeOnReady } from '../src/hooks/useFadeOnReady'
import { useRewardsWallet } from '../src/hooks/useRewardsWallet'
import { useScreenResource } from '../src/hooks/useScreenResource'
import { buildHomeActivity, fetchCustomerCardsList } from '../src/lib/customerData'
import { sortHomeCampaigns } from '../src/lib/homeCampaigns'
import { rewardImageUrl } from '../src/lib/media'
import { stampUpdateSignature } from '../src/lib/stampLiveUpdate'
import { useAuth } from '../src/providers/AuthProvider'
import { useRealtime } from '../src/providers/RealtimeProvider'
import { hapticLightTap, hapticSuccess } from '../src/lib/haptics'
import { heroProgressSubtitle, heroProgressTitle } from '../src/lib/progressCopy'
import type { VenueRef } from '../src/types/loyalty'
import { colors, space, type as typography } from '../src/theme'
import { withAppFont } from '../src/lib/typography'

export default function CustomerHomeScreen() {
  const router = useRouter()
  const { role, user, token } = useAuth()
  const loadHomeCards = useCallback(
    (fresh: boolean) => {
      if (!token) return Promise.reject(new Error('missing token'))
      return fetchCustomerCardsList(token, fresh)
    },
    [token],
  )

  const cardsQuery = useScreenResource({
    enabled: Boolean(token),
    refetchOnFocus: true,
    errorMessage: 'Could not load your wallet.',
    load: loadHomeCards,
  })
  const walletQuery = useRewardsWallet({ refetchOnFocus: true })
  const { latestStamp } = useRealtime()
  const lastUnlockHaptic = useRef<number | null>(null)
  const lastHomeStampSignature = useRef('')

  const loading = cardsQuery.loading || walletQuery.loading
  const refreshing = cardsQuery.refreshing || walletQuery.refreshing
  const error = cardsQuery.error || walletQuery.error
  const cards = cardsQuery.data?.cards ?? []
  const homeCampaigns = useMemo(
    () => sortHomeCampaigns(cardsQuery.data?.home_campaigns ?? []),
    [cardsQuery.data?.home_campaigns],
  )
  const campaignVenueById = useMemo(() => {
    const map = new Map<number, VenueRef>()
    for (const card of cards) {
      if (card.venue) {
        map.set(card.venue_id, card.venue)
      }
    }
    return map
  }, [cards])
  const readyItems = walletQuery.data?.items ?? []
  const fade = useFadeOnReady(!loading)

  const refreshCards = cardsQuery.refresh
  const refreshWallet = walletQuery.refresh
  const refresh = useCallback(() => {
    void refreshCards()
    void refreshWallet()
  }, [refreshCards, refreshWallet])

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

  const primaryReady = readyItems[0] ?? null

  const rewardSlides = useMemo((): HomeRewardSlide[] => {
    if (readyItems.length > 0) {
      const rest = readyItems.length > 1 ? readyItems.slice(1) : []
      return rest.map((item) => ({
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

  const headerStampsLeft = useMemo(() => {
    if (readyItems.length > 0) return 0
    const nextCards = [...cards].filter((card) => card.venue).sort((a, b) => (a.summary?.stamps_to_next ?? 999) - (b.summary?.stamps_to_next ?? 999))
    return nextCards[0]?.summary?.stamps_to_next ?? 0
  }, [cards, readyItems.length])

  const headerRewardTitle = useMemo(() => {
    if (primaryReady) return primaryReady.reward.title
    const nextCards = [...cards].filter((card) => card.venue).sort((a, b) => (a.summary?.stamps_to_next ?? 999) - (b.summary?.stamps_to_next ?? 999))
    return nextCards[0]?.summary?.next_reward_title ?? 'your next reward'
  }, [cards, primaryReady])

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
        id: 'wallet',
        label: 'Open wallet',
        subtitle: 'Your cards and rewards',
        icon: 'wallet-outline' as const,
        tint: colors.accentSoft,
        onPress: () => router.navigate('/(customer)/wallet'),
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

  useEffect(() => {
    if (!latestStamp) {
      lastHomeStampSignature.current = ''
      return
    }

    const signature = stampUpdateSignature(latestStamp)
    if (signature === lastHomeStampSignature.current) {
      return
    }
    lastHomeStampSignature.current = signature

    void refreshCards()
    void refreshWallet()
  }, [latestStamp, refreshCards, refreshWallet])

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
        <HomeScreenHeader
          pretitle={`Hi, ${firstName}`}
          title={heroProgressTitle(headerStampsLeft, headerRewardTitle)}
          subtitle={heroProgressSubtitle(headerStampsLeft, headerRewardTitle)}
          onNotificationsPress={() => {
            hapticLightTap()
            router.push('/(customer)/notifications')
          }}
        />
      </View>
    </Animated.View>
  )

  const hasHeroReady = Boolean(primaryReady)
  const hasCarousel = rewardSlides.length > 0

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
          {hasHeroReady ? (
            <View style={{ marginTop: space.sectionGap, paddingHorizontal: space.screenX }}>
              <HomeRewardTicketCard
                variant="ready"
                title={primaryReady!.reward.title}
                venue={primaryReady!.customer.venue}
                imageUri={rewardImageUrl(primaryReady!.reward)}
                unlockId={primaryReady!.unlock_id}
              />
            </View>
          ) : cards.length === 0 ? (
            <AnimatedSection style={{ marginTop: space.sectionGap, paddingHorizontal: space.screenX }}>
              <StateCard
                emoji="☕"
                title="Start your first card"
                message="Discover a venue nearby and begin collecting visits toward your first reward."
                primaryAction={{ label: 'Find a venue', onPress: () => router.push('/(customer)/venues') }}
              />
            </AnimatedSection>
          ) : null}

          {homeCampaigns.length > 0 ? (
            <View
              style={{
                marginTop: hasHeroReady || cards.length === 0 ? space.sectionY : space.sectionGap,
              }}
            >
              <HomeCampaignCarousel campaigns={homeCampaigns} venueById={campaignVenueById} />
            </View>
          ) : null}

          <View
            style={{
              marginTop:
                homeCampaigns.length > 0 || hasHeroReady || cards.length === 0 ? space.sectionY : space.sectionGap,
            }}
          >
            <HomeQuickActions actions={quickActions} />
          </View>

          {hasCarousel ? (
            <View style={{ marginTop: space.sectionY }}>
              <Text style={{ ...typography.section, paddingHorizontal: space.screenX, marginBottom: 12 }}>
                {readyItems.length > 0 ? 'More ready to claim' : 'Keep collecting'}
              </Text>
              <HomeRewardCarousel slides={rewardSlides} />
            </View>
          ) : null}

          {activity.length > 0 ? (
            <View style={{ marginTop: space.sectionY, paddingHorizontal: space.screenX }}>
              <Text style={typography.section}>Recent activity</Text>
              <View style={{ marginTop: 14, gap: 12 }}>
                {activity.map((row) => (
                  <View key={row.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <Text style={withAppFont({ flex: 1, fontSize: 16, color: colors.ink, fontWeight: '500' })}>{row.label}</Text>
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
