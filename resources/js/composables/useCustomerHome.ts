import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { buildHomeActivity, sortHomeCampaigns } from '@/lib/customerHome'
import { heroProgressSubtitle, heroProgressTitle } from '@/lib/progressCopy'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useCustomerRewardsStore, type CustomerRewardWalletItem } from '@/stores/customerRewards'
import { useRealtimeStore } from '@/stores/realtime'
import type { Customer, HomeCampaign, Venue } from '@/types'

export interface HomeRewardSlide {
  id: string
  kind: 'ready' | 'next'
  item?: CustomerRewardWalletItem
  card?: Customer
}

export function useCustomerHome() {
  const router = useRouter()
  const auth = useAuthStore()
  const rewardsStore = useCustomerRewardsStore()
  const realtime = useRealtimeStore()

  const loading = ref(true)
  const refreshing = ref(false)
  const error = ref('')
  const cards = ref<Customer[]>([])
  const homeCampaigns = ref<HomeCampaign[]>([])

  const firstName = computed(() => {
    const name = auth.user?.name?.trim() ?? 'there'
    return name.split(/\s+/)[0] ?? name
  })

  const readyItems = computed(() => rewardsStore.items)
  const primaryReady = computed(() => readyItems.value[0] ?? null)

  const featuredNextCard = computed(() => {
    if (primaryReady.value) return null

    const nextCards = [...cards.value]
      .filter((card) => card.venue)
      .sort((a, b) => (a.summary?.stamps_to_next ?? 999) - (b.summary?.stamps_to_next ?? 999))

    return nextCards[0] ?? null
  })

  const activeCards = computed(() =>
    [...cards.value]
      .filter((card) => card.venue)
      .sort((a, b) => (b.summary?.pending_rewards_count ?? 0) - (a.summary?.pending_rewards_count ?? 0))
      .slice(0, 3),
  )

  const rewardSlides = computed((): HomeRewardSlide[] => {
    if (readyItems.value.length > 0) {
      return readyItems.value.slice(1).map((item) => ({
        id: `ready-${item.unlock_id}`,
        kind: 'ready' as const,
        item,
      }))
    }

    const carouselCards = featuredNextCard.value
      ? activeCards.value.filter((card) => card.id !== featuredNextCard.value?.id)
      : activeCards.value

    return carouselCards.map((card) => ({
      id: `next-${card.id}`,
      kind: 'next' as const,
      card,
    }))
  })

  const headerStampsLeft = computed(() => {
    if (readyItems.value.length > 0) return 0
    const nextCards = [...cards.value]
      .filter((card) => card.venue)
      .sort((a, b) => (a.summary?.stamps_to_next ?? 999) - (b.summary?.stamps_to_next ?? 999))
    return nextCards[0]?.summary?.stamps_to_next ?? 0
  })

  const headerRewardTitle = computed(() => {
    if (primaryReady.value) return primaryReady.value.reward.title
    const nextCards = [...cards.value]
      .filter((card) => card.venue)
      .sort((a, b) => (a.summary?.stamps_to_next ?? 999) - (b.summary?.stamps_to_next ?? 999))
    return nextCards[0]?.summary?.next_reward_title ?? 'your next reward'
  })

  const campaignVenueById = computed(() => {
    const map = new Map<number, Venue>()
    for (const card of cards.value) {
      if (card.venue) {
        map.set(card.venue_id, card.venue)
      }
    }
    return map
  })

  const quickActions = computed(() => [
    {
      id: 'scan',
      label: 'Scan QR',
      subtitle: 'Earn stamps',
      to: '/my-qr',
      tint: 'bg-accent-soft',
    },
    {
      id: 'wallet',
      label: 'Open wallet',
      subtitle: 'Your cards and rewards',
      to: '/wallet',
      tint: 'bg-surface-muted',
    },
    {
      id: 'venues',
      label: 'Find a venue',
      subtitle: 'Explore nearby venues',
      to: '/venues',
      tint: 'bg-danger-soft',
    },
  ])

  const activity = computed(() => buildHomeActivity(cards.value, readyItems.value))

  async function loadData(silent = false) {
    if (!silent) {
      loading.value = cards.value.length === 0
    } else {
      refreshing.value = true
    }
    error.value = ''

    try {
      const [cardsResponse] = await Promise.all([
        api<{ cards: Customer[]; home_campaigns?: HomeCampaign[] }>('/customer/cards'),
        rewardsStore.refresh(),
      ])
      cards.value = cardsResponse.cards
      homeCampaigns.value = sortHomeCampaigns(cardsResponse.home_campaigns ?? [])
    } catch {
      error.value = 'Could not load your wallet.'
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  function reload() {
    void loadData()
  }

  function refresh() {
    void loadData(true)
  }

  watch(
    () => realtime.latestStamp,
    () => {
      if (realtime.latestStamp) {
        void loadData(true)
      }
    },
  )

  onMounted(() => {
    void loadData()
  })

  return {
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
    headerTitle: computed(() =>
      headerStampsLeft.value > 0 ? heroProgressTitle(headerStampsLeft.value, headerRewardTitle.value) : undefined,
    ),
    headerSubtitle: computed(() =>
      headerStampsLeft.value > 0 ? heroProgressSubtitle(headerStampsLeft.value, headerRewardTitle.value) : undefined,
    ),
    quickActions,
    activity,
    refresh,
    reload,
    silentRefreshWallet: () => rewardsStore.refresh(),
  }
}
