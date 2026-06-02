import type { ActivityRow, RewardJourney, RewardRef, RewardWalletItem, VisitRow, WalletCard } from '../types/loyalty'
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
  journey: RewardJourney | null
  recent_visits?: VisitRow[]
}

export interface ClaimedRewardRow {
  id: string
  title: string
  claimedAt: string
}

export interface RewardsOverviewData {
  readyItems: RewardWalletItem[]
  inProgress: WalletCard[]
  claimed: ClaimedRewardRow[]
}

function cacheKey(scope: string, token: string) {
  return `${scope}:${token.slice(0, 12)}`
}

export function invalidateCustomerCaches(token: string) {
  invalidateCache(cacheKey('customer', token))
}

export async function fetchCustomerCards(token: string, fresh = false): Promise<WalletCard[]> {
  const key = `${cacheKey('customer', token)}:cards`
  const response = await fetchWithCache(key, () => apiRequest<{ cards: WalletCard[] }>('/customer/cards', { token }), fresh)
  return response.cards
}

export async function fetchRewardsWallet(token: string, fresh = false): Promise<RewardsWalletResponse> {
  const key = `${cacheKey('customer', token)}:rewards-wallet`
  return fetchWithCache(key, () => apiRequest<RewardsWalletResponse>('/customer/rewards/wallet', { token }), fresh)
}

export async function fetchCardDetail(token: string, venueId: string, fresh = false): Promise<CardDetailPayload> {
  const key = `${cacheKey('customer', token)}:card:${venueId}`
  return fetchWithCache(
    key,
    () => apiRequest<CardDetailPayload>(`/customer/cards?venue_id=${venueId}`, { token }),
    fresh,
  )
}

export async function fetchRecentVisits(token: string, venueId: string, fresh = false): Promise<VisitRow[]> {
  const detail = await fetchCardDetail(token, venueId, fresh)
  return detail.recent_visits ?? []
}

export async function fetchClaimHistory(token: string, cards: WalletCard[], fresh = false): Promise<ClaimedRewardRow[]> {
  const rows: ClaimedRewardRow[] = []

  await Promise.all(
    cards.map(async (card) => {
      try {
        const detail = await fetchCardDetail(token, String(card.venue_id), fresh)
        for (const milestone of detail.journey?.milestones ?? []) {
          if (milestone.claimed && milestone.claimed_at) {
            rows.push({
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

  rows.sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime())
  return rows.slice(0, 12)
}

export async function fetchHomeActivity(
  token: string,
  cards: WalletCard[],
  readyItems: RewardWalletItem[],
  fresh = false,
): Promise<ActivityRow[]> {
  const visitSources = await Promise.all(
    cards.slice(0, 3).map(async (card) => {
      try {
        const visits = await fetchRecentVisits(token, String(card.venue_id), fresh)
        return { card, visits }
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

export async function fetchRewardsOverview(token: string, fresh = false): Promise<RewardsOverviewData> {
  const [wallet, cards] = await Promise.all([
    fetchRewardsWallet(token, fresh),
    fetchCustomerCards(token, fresh),
  ])

  const pendingVenueIds = new Set(wallet.items.map((item) => item.customer.venue_id))
  const inProgress = cards.filter((card) => {
    const toNext = card.summary?.stamps_to_next ?? 0
    return toNext > 0 && !pendingVenueIds.has(card.venue_id)
  })

  const claimed = await fetchClaimHistory(token, cards, fresh)

  return {
    readyItems: wallet.items,
    inProgress,
    claimed,
  }
}
