import type { ActivityRow, ApiClaimedReward, RewardJourney, RewardRef, RewardWalletItem, WalletCard } from '../types/loyalty'
import { apiRequest } from './api'
import { formatRelativeTime } from './format'
import { fetchWithCache, invalidateCache } from './resourceCache'

export interface RewardsWalletResponse {
  items: RewardWalletItem[]
  pending_count: number
}

export interface CardDetailPayload {
  active_card: WalletCard | null
  next_reward: RewardRef | null
  available_rewards: RewardRef[]
  pending_unlocks?: { unlock_id: number; reward: RewardRef }[]
  promotion?: import('../types/loyalty').VenuePromotion | null
  journey: RewardJourney | null
  recent_visits?: import('../types/loyalty').VisitRow[]
}

export interface ClaimedRewardRow {
  id: string
  title: string
  claimedAt: string
}

export interface CustomerCardsListResponse {
  cards: WalletCard[]
  claimed_history: ApiClaimedReward[]
  pending_rewards_count?: number
}

export interface RewardsOverviewData {
  readyItems: RewardWalletItem[]
  inProgress: WalletCard[]
  claimed: ClaimedRewardRow[]
}

export interface DiscoverVenue {
  id: number
  name: string
  slug: string
  cover_image?: string | null
  cover_image_thumb?: string | null
  category?: string | null
  joined_count?: number
  rewards_count?: number
}

export interface DiscoverVenuesData {
  venues: DiscoverVenue[]
  cardsByVenue: Record<number, WalletCard>
}

function cacheKey(scope: string, token: string) {
  return `${scope}:${token.slice(0, 12)}`
}

export function invalidateCustomerCaches(token: string) {
  invalidateCache(cacheKey('customer', token))
}

export function mapClaimedHistory(rows: ApiClaimedReward[]): ClaimedRewardRow[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    claimedAt: row.claimed_at,
  }))
}

export function buildHomeActivity(cards: WalletCard[], readyItems: RewardWalletItem[]): ActivityRow[] {
  const rows: ActivityRow[] = []

  for (const card of cards.slice(0, 3)) {
    const venueName = card.venue?.name ?? 'Venue'
    for (const visit of card.recent_visits ?? []) {
      rows.push({
        id: `visit-${visit.id}`,
        label: `+1 visit · ${venueName}`,
        time: formatRelativeTime(visit.created_at),
      })
    }
  }

  for (const item of readyItems.slice(0, 2)) {
    rows.push({
      id: `unlock-${item.unlock_id}`,
      label: `Reward unlocked · ${item.customer.venue?.name ?? 'Venue'}`,
      time: 'Today',
    })
  }

  for (const card of cards) {
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

  return [...unique.values()].slice(0, 3)
}

export async function fetchCustomerCardsList(token: string, fresh = false): Promise<CustomerCardsListResponse> {
  const key = `${cacheKey('customer', token)}:cards`
  return fetchWithCache(
    key,
    () => apiRequest<CustomerCardsListResponse>('/customer/cards', { token }),
    fresh,
  )
}

export async function fetchCustomerCards(token: string, fresh = false): Promise<WalletCard[]> {
  const response = await fetchCustomerCardsList(token, fresh)
  return response.cards
}

export async function fetchRewardsWallet(token: string, fresh = false): Promise<RewardsWalletResponse> {
  const key = `${cacheKey('customer', token)}:rewards-wallet`
  return fetchWithCache(key, () => apiRequest<RewardsWalletResponse>('/customer/rewards/wallet', { token }), fresh)
}

function pendingUnlocksForVenue(wallet: RewardsWalletResponse, venueId: string) {
  const id = Number(venueId)
  return wallet.items
    .filter((item) => item.customer.venue_id === id)
    .map((item) => ({ unlock_id: item.unlock_id, reward: item.reward }))
}

export async function fetchCardDetail(token: string, venueId: string, fresh = false): Promise<CardDetailPayload> {
  const key = `${cacheKey('customer', token)}:card:${venueId}`
  const detail = await fetchWithCache(
    key,
    () => apiRequest<CardDetailPayload>(`/customer/cards?venue_id=${venueId}`, { token }),
    fresh,
  )

  const pending_unlocks = detail.pending_unlocks?.length
    ? detail.pending_unlocks
    : pendingUnlocksForVenue(await fetchRewardsWallet(token, fresh), venueId)

  return { ...detail, pending_unlocks }
}

export async function fetchRewardsOverview(token: string, fresh = false): Promise<RewardsOverviewData> {
  const [wallet, cardsList] = await Promise.all([
    fetchRewardsWallet(token, fresh),
    fetchCustomerCardsList(token, fresh),
  ])

  const cards = cardsList.cards
  const pendingVenueIds = new Set(wallet.items.map((item) => item.customer.venue_id))
  const inProgress = cards.filter((card) => {
    const toNext = card.summary?.stamps_to_next ?? 0
    return toNext > 0 && !pendingVenueIds.has(card.venue_id)
  })

  return {
    readyItems: wallet.items,
    inProgress,
    claimed: mapClaimedHistory(cardsList.claimed_history ?? []),
  }
}

export async function fetchDiscoverVenues(token: string, fresh = false): Promise<DiscoverVenuesData> {
  const venuesKey = `${cacheKey('customer', token)}:discover-venues`
  const venues = await fetchWithCache(
    venuesKey,
    () => apiRequest<{ venues: DiscoverVenue[] }>('/venues/discover', { token }).then((response) => response.venues),
    fresh,
  )
  const cards = await fetchCustomerCards(token, fresh)
  const cardsByVenue: Record<number, WalletCard> = {}
  for (const card of cards) {
    cardsByVenue[card.venue_id] = card
  }
  return { venues, cardsByVenue }
}

export async function joinVenueBySlug(token: string, slug: string): Promise<void> {
  await apiRequest(`/venues/${slug}/join`, { method: 'POST', token })
  invalidateCustomerCaches(token)
}
