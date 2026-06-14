import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { HomeRewardSlide } from '../components/customer/HomeRewardCarousel'
import { buildHomeActivity, fetchCustomerCardsList } from '../lib/customerData'
import { hapticSuccess } from '../lib/haptics'
import { sortHomeCampaigns } from '../lib/homeCampaigns'
import { stampUpdateSignature } from '../lib/stampLiveUpdate'
import { useAuth } from '../providers/AuthProvider'
import { useRealtime } from '../providers/RealtimeProvider'
import type { RewardWalletItem, VenueRef } from '../types/loyalty'
import { useFadeOnReady } from './useFadeOnReady'
import { useCustomerSurfaceRefresh } from './useCustomerSurfaceRefresh'
import { useRewardsWallet } from './useRewardsWallet'
import { useScreenResource } from './useScreenResource'

const PULL_REFRESH_TIMEOUT_MS = 10_000
const PULL_REFRESH_MIN_VISIBLE_MS = 550

export function useCustomerHome() {
  const router = useRouter()
  const { role, user, token } = useAuth()
  const { latestStamp } = useRealtime()
  const lastUnlockHaptic = useRef<number | null>(null)
  const lastHomeStampSignature = useRef('')
  const lastCycleRetrySignature = useRef('')

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
  const [pullRefreshing, setPullRefreshing] = useState(false)
  const pullRefreshGenerationRef = useRef(0)
  const surfaceRefreshInFlightRef = useRef(false)
  const refreshing = pullRefreshing
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

  const surfaceRefresh = useCallback(() => {
    if (surfaceRefreshInFlightRef.current) {
      return
    }

    surfaceRefreshInFlightRef.current = true
    void Promise.allSettled([silentRefreshCards(), silentRefreshWallet()]).finally(() => {
      surfaceRefreshInFlightRef.current = false
    })
  }, [silentRefreshCards, silentRefreshWallet])

  const refresh = useCallback(() => {
    pullRefreshGenerationRef.current += 1
    const generation = pullRefreshGenerationRef.current
    const startedAt = Date.now()
    setPullRefreshing(true)

    const timeout = setTimeout(() => {
      if (generation === pullRefreshGenerationRef.current) {
        setPullRefreshing(false)
      }
    }, PULL_REFRESH_TIMEOUT_MS)

    void Promise.allSettled([refreshCards(), refreshWallet()]).finally(() => {
      clearTimeout(timeout)
      const elapsed = Date.now() - startedAt
      const remaining = Math.max(PULL_REFRESH_MIN_VISIBLE_MS - elapsed, 0)
      const finish = () => {
        if (generation === pullRefreshGenerationRef.current) {
          setPullRefreshing(false)
        }
      }
      if (remaining > 0) {
        setTimeout(finish, remaining)
      } else {
        finish()
      }
    })
  }, [refreshCards, refreshWallet])

  useCustomerSurfaceRefresh(surfaceRefresh)

  useFocusEffect(
    useCallback(() => {
      return () => {
        pullRefreshGenerationRef.current += 1
        setPullRefreshing(false)
      }
    }, []),
  )

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
        .sort((a, b) => (a.summary?.stamps_to_next ?? 999) - (b.summary?.stamps_to_next ?? 999)),
    [cards],
  )

  const primaryReady = readyItems[0] ?? null

  const stableRewardSlidesRef = useRef<HomeRewardSlide[]>([])
  const rewardSlides = useMemo((): HomeRewardSlide[] => {
    const readySlides = readyItems.map((item) => ({
      id: `ready-${item.unlock_id}`,
      kind: 'ready' as const,
      item,
    }))

    const progressSlides = activeCards.map((card) => ({
      id: `next-${card.id}`,
      kind: 'next' as const,
      card,
    }))

    const slides = [...readySlides, ...progressSlides]

    if (slides.length > 0 || !refreshing) {
      stableRewardSlidesRef.current = slides
      return slides
    }

    return stableRewardSlidesRef.current
  }, [activeCards, readyItems, refreshing])

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
      lastCycleRetrySignature.current = ''
      return
    }

    const signature = stampUpdateSignature(latestStamp)
    if (signature === lastHomeStampSignature.current) {
      return
    }
    lastHomeStampSignature.current = signature

    surfaceRefresh()
  }, [latestStamp, surfaceRefresh])

  // If the user leaves the card before the 5/5 celebration finishes, backend unlock
  // propagation can lag behind the first Home refresh. Retry once for cycle-complete.
  useEffect(() => {
    if (!latestStamp?.cycle_completed) {
      return
    }
    if (readyItems.length > 0) {
      return
    }

    const signature = stampUpdateSignature(latestStamp)
    if (lastCycleRetrySignature.current === signature) {
      return
    }
    lastCycleRetrySignature.current = signature

    const retry = setTimeout(() => {
      surfaceRefresh()
    }, 1200)

    return () => clearTimeout(retry)
  }, [latestStamp, readyItems.length, surfaceRefresh])

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
    rewardSlides,
    headerStampsLeft,
    headerRewardTitle,
    activity,
    fade,
    refresh,
    reload,
    silentRefreshWallet,
  }
}
