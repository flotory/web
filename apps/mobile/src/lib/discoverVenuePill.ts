import type { WalletCard } from '../types/loyalty'

export type DiscoverVenuePillTone = 'ready' | 'progress' | 'catalog'

export interface DiscoverVenuePill {
  label: string
  tone: DiscoverVenuePillTone
}

function shortRewardTitle(title: string | null | undefined, maxLen = 22): string {
  const trimmed = title?.trim()
  if (!trimmed) return 'your reward'
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen - 1)}…`
}

/** Venue list status — avoids sounding like rewards are already earned. */
export function discoverVenuePill(
  joined: boolean,
  rewardsCount: number | undefined,
  card?: WalletCard | null,
): DiscoverVenuePill {
  const pending = card?.summary?.pending_rewards_count ?? 0
  if (joined && pending > 0) {
    return {
      label: pending === 1 ? '1 reward ready to claim' : `${pending} rewards ready to claim`,
      tone: 'ready',
    }
  }

  if (joined && card?.summary) {
    const stamps = card.summary.stamps
    const target = card.summary.next_reward_stamps ?? card.summary.max_stamps
    const toNext = card.summary.stamps_to_next ?? Math.max(target - stamps, 0)
    const nextTitle = card.summary.next_reward_title

    if (toNext <= 0 && nextTitle) {
      return { label: shortRewardTitle(nextTitle) + ' unlocked', tone: 'ready' }
    }

    if (toNext > 0 && nextTitle) {
      return {
        label: `${toNext} stamp${toNext === 1 ? '' : 's'} to ${shortRewardTitle(nextTitle)}`,
        tone: 'progress',
      }
    }

    return {
      label: `${Math.min(stamps, target)} of ${target} stamps`,
      tone: 'progress',
    }
  }

  if (joined) {
    return { label: 'Your loyalty card', tone: 'progress' }
  }

  const count = rewardsCount ?? 0
  if (count > 0) {
    return {
      label: count === 1 ? '1 reward to earn' : `${count} rewards to earn`,
      tone: 'catalog',
    }
  }

  return { label: 'Loyalty rewards', tone: 'catalog' }
}
