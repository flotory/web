import type { CustomerRewardWalletItem } from '@/stores/customerRewards'
import type { Customer, HomeCampaign } from '@/types'

export interface HomeActivityRow {
  id: string
  label: string
  time: string
}

export function sortHomeCampaigns(campaigns: HomeCampaign[]): HomeCampaign[] {
  return [...campaigns].sort((a, b) => {
    if (a.applies_now !== b.applies_now) {
      return a.applies_now ? -1 : 1
    }

    if (a.multiplier !== b.multiplier) {
      return b.multiplier - a.multiplier
    }

    const daysA = a.days_left ?? 9999
    const daysB = b.days_left ?? 9999

    return daysA - daysB
  })
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString()
}

export function buildHomeActivity(
  cards: Customer[],
  readyItems: CustomerRewardWalletItem[],
): HomeActivityRow[] {
  const rows: HomeActivityRow[] = []

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

  const unique = new Map<string, HomeActivityRow>()
  for (const row of rows) {
    if (!unique.has(row.id)) unique.set(row.id, row)
  }

  return [...unique.values()].slice(0, 3)
}
