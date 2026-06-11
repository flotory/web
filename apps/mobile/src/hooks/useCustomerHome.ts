import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { HomeRewardSlide } from '../components/customer/HomeRewardCarousel'
import { buildHomeActivity, fetchCustomerCardsList } from '../lib/customerData'
import { hapticSuccess } from '../lib/haptics'
import { sortHomeCampaigns } from '../lib/homeCampaigns'
import { stampUpdateSignature } from '../lib/stampLiveUpdate'
import { useAuth } from '../providers/AuthProvider'
import { useRealtime } from '../providers/RealtimeProvider'
import { colors } from '../theme'
import type { RewardWalletItem, VenueRef } from '../types/loyalty'
import { useFadeOnReady } from './useFadeOnReady'
import { useRedeemRefresh } from './useRedeemRefresh'
import { useRewardsWallet } from './useRewardsWallet'
import { useScreenResource } from './useScreenResource'

export function useCustomerHome() {
  const router = useRouter()
  const { role, user, token } = useAuth()
  const { latestStamp } = useRealtime()
  const lastUnlockHaptic = useRef<number | null>(null)
  const lastHomeStampSignature = useRef('')

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
  const walletQuery = useRewardsWallet({ refetchOnFocus: false })

  const loading = cardsQuery.loading || walletQuery.loading
  const refreshing = cardsQuery.refreshing || walletQuery.refreshing
  const error = cardsQuery.error || walletQuery.error
  const cards = cardsQuery.data?.cards ?? []
  const walletItems = walletQuery.data?.items ?? []

  const stableReadyItemsRef = useRef<RewardWalletItem[]>([])
  const readyItems = useMemo(() => {
    if (walletItems.length > 0) {
      stableReadyItemsRef.current = walletItems
      return walletItems
    }

    if (refreshing && stableReadyItemsRef.current.length > 0) {
      return stableReadyItemsRef.current
    }

    stableReadyItemsRef.current = walletItems
    return walletItems
  }, [walletItems, refreshing])

  const refreshCards = cardsQuery.refresh
  const refreshWallet = walletQuery.refresh
  const silentRefreshCards = cardsQuery.silentRefresh
  const silentRefreshWallet = walletQuery.silentRefresh

  const refresh = useCallback(() => {
    void refreshCards()
    void refreshWallet()
  }, [refreshCards, refreshWallet])

  const refreshAfterRedeem = useCallback(() => {
    void silentRefreshCards()
    void silentRefreshWallet()
  }, [silentRefreshCards, silentRefreshWallet])
  useRedeemRefresh(refreshAfterRedeem)

  const reload = useCallback(() => {
    cardsQuery.reload()
    walletQuery.reload()
  }, [cardsQuery, walletQuery])

  const fade = useFadeOnReady(!loading && !error)

  const firstName = useMemo(() => {
    const name = user?.name?.trim() ?? 'there'
    return name.split(/\s+/)[0] ?? name
  }, [user?.name])

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

  const activeCards = useMemo(
    () =>
      [...cards]
        .filter((card) => card.venue)
        .sort((a, b) => (b.summary?.pending_rewards_count ?? 0) - (a.summary?.pending_rewards_count ?? 0))
        .slice(0, 3),
    [cards],
  )

  const primaryReady = readyItems[0] ?? null

  const featuredNextCard = useMemo(() => {
    if (primaryReady) {
      return null
    }

    const nextCards = [...cards]
      .filter((card) => card.venue)
      .sort((a, b) => (a.summary?.stamps_to_next ?? 999) - (b.summary?.stamps_to_next ?? 999))

    return nextCards[0] ?? null
  }, [cards, primaryReady])

  const stableRewardSlidesRef = useRef<HomeRewardSlide[]>([])
  const rewardSlides = useMemo((): HomeRewardSlide[] => {
    let slides: HomeRewardSlide[]
    if (readyItems.length > 0) {
      const rest = readyItems.length > 1 ? readyItems.slice(1) : []
      slides = rest.map((item) => ({
        id: `ready-${item.unlock_id}`,
        kind: 'ready' as const,
        item,
      }))
    } else {
      const carouselCards = featuredNextCard
        ? activeCards.filter((card) => card.id !== featuredNextCard.id)
        : activeCards
      slides = carouselCards.map((card) => ({
        id: `next-${card.id}`,
        kind: 'next' as const,
        card,
      }))
    }

    if (slides.length > 0 || !refreshing) {
      stableRewardSlidesRef.current = slides
      return slides
    }

    return stableRewardSlidesRef.current
  }, [activeCards, featuredNextCard, readyItems, refreshing])

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
        label: 'Collect a stamp',
        subtitle: 'Open Stamp tab and tap the NFC stand',
        icon: 'radio-outline' as const,
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

    void silentRefreshCards()
    void silentRefreshWallet()
  }, [latestStamp, silentRefreshCards, silentRefreshWallet])

  return {
    role,
    router,
    firstName,
    loading,
    refreshing,
    error,
    cards,
    homeCampaigns,
    campaignVenueById,
    readyItems,
    primaryReady,
    featuredNextCard,
    rewardSlides,
    headerStampsLeft,
    headerRewardTitle,
    quickActions,
    activity,
    fade,
    refresh,
    reload,
    silentRefreshWallet,
  }
}
