import type { TFunction } from 'i18next'

import type { WalletCard } from '../types/loyalty'

export type DiscoverVenuePillTone = 'ready' | 'progress' | 'catalog'

export interface DiscoverVenuePill {
  label: string
  tone: DiscoverVenuePillTone
}

function shortRewardTitle(title: string | null | undefined, t: TFunction, maxLen = 22): string {
  const trimmed = title?.trim()
  if (!trimmed) return t('venuePill.yourReward')
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen - 1)}…`
}

/** Venue list status — avoids sounding like rewards are already earned. */
export function discoverVenuePill(
  joined: boolean,
  rewardsCount: number | undefined,
  card: WalletCard | null | undefined,
  t: TFunction,
): DiscoverVenuePill {
  const pending = card?.summary?.pending_rewards_count ?? 0
  if (joined && pending > 0) {
    return {
      label: t('venuePill.readyToClaim', { count: pending }),
      tone: 'ready',
    }
  }

  if (joined && card?.summary) {
    const stamps = card.summary.stamps
    const target = card.summary.next_reward_stamps ?? card.summary.max_stamps
    const toNext = card.summary.stamps_to_next ?? Math.max(target - stamps, 0)
    const nextTitle = card.summary.next_reward_title

    if (toNext <= 0 && nextTitle) {
      return { label: t('venuePill.unlocked', { reward: shortRewardTitle(nextTitle, t) }), tone: 'ready' }
    }

    if (toNext > 0 && nextTitle) {
      return {
        label: t('venuePill.stampsTo', { count: toNext, reward: shortRewardTitle(nextTitle, t) }),
        tone: 'progress',
      }
    }

    return {
      label: t('venuePill.ofStamps', { current: Math.min(stamps, target), target }),
      tone: 'progress',
    }
  }

  if (joined) {
    return { label: t('venuePill.yourLoyaltyCard'), tone: 'progress' }
  }

  const count = rewardsCount ?? 0
  if (count > 0) {
    return {
      label: t('venuePill.toEarn', { count }),
      tone: 'catalog',
    }
  }

  return { label: t('venuePill.loyaltyRewards'), tone: 'catalog' }
}
