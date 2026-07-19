import type { TFunction } from 'i18next'

export interface VenueHeroReward {
  id: number
  title: string
  description?: string | null
  image?: string | null
  image_thumb?: string | null
  required_stamps: number
}

export interface VenueSocialProof {
  members_count: number
  rewards_claimed_count: number
}

export type ScanLandingQuickFactIcon = 'stamps' | 'rewards' | 'join' | 'nfc'

export interface ScanLandingMembership {
  stamps: number
  target: number
  stampsToNext: number
  pendingRewardsCount: number
}

export interface ScanLandingQuickFact {
  icon: ScanLandingQuickFactIcon
  text: string
}

export function formatUnlockRequirement(requiredStamps: number, t: TFunction): string {
  if (requiredStamps <= 0) {
    return t('scanLanding.joinToStart')
  }

  return t('scanLanding.unlocksAfter', { count: requiredStamps })
}

export function formatHeroRewardLine(
  hero: VenueHeroReward | null | undefined,
  venueName: string,
  t: TFunction,
): string {
  if (!hero) {
    return t('scanLanding.heroNoReward', { venue: venueName })
  }

  if (hero.title.trim() !== '') {
    return hero.title
  }

  return t('scanLanding.heroRewardStamps', { count: hero.required_stamps })
}

export function formatHeroSubtitle(venueName: string, t: TFunction): string {
  return t('scanLanding.heroSubtitle', { venue: venueName })
}

export function formatMemberStampCaption(membership: ScanLandingMembership, t: TFunction): string {
  if (membership.pendingRewardsCount > 0) {
    return t('scanLanding.rewardReadyInWallet', { count: membership.pendingRewardsCount })
  }

  if (membership.stampsToNext <= 0) {
    return t('scanLanding.onYourCard')
  }

  return t('scanLanding.stampsToNext', { count: membership.stampsToNext })
}

export function buildScanLandingQuickFacts(
  options: {
    firstRewardStamps?: number | null
    milestoneCount: number
    membership?: ScanLandingMembership | null
  },
  t: TFunction,
): ScanLandingQuickFact[] {
  const { firstRewardStamps, milestoneCount, membership } = options

  if (membership) {
    const facts: ScanLandingQuickFact[] = [
      {
        icon: 'stamps',
        text: t('scanLanding.stampsOnCard', { stamps: membership.stamps, target: membership.target }),
      },
    ]

    if (membership.pendingRewardsCount > 0) {
      facts.push({
        icon: 'rewards',
        text: t('scanLanding.rewardReadyOpen', { count: membership.pendingRewardsCount }),
      })
    } else if (membership.stampsToNext > 0) {
      facts.push({
        icon: 'stamps',
        text: t('scanLanding.stampsToNextShort', { count: membership.stampsToNext }),
      })
    }

    facts.push({
      icon: 'nfc',
      text: t('scanLanding.tapNfcToCollect'),
    })

    return facts
  }

  const facts: ScanLandingQuickFact[] = []

  if (firstRewardStamps && firstRewardStamps > 0) {
    facts.push({
      icon: 'stamps',
      text: t('scanLanding.firstRewardUnlocks', { count: firstRewardStamps }),
    })
  }

  if (milestoneCount > 0) {
    facts.push({
      icon: 'rewards',
      text: t('scanLanding.rewardsAvailable', { count: milestoneCount }),
    })
  }

  facts.push({
    icon: 'join',
    text: t('scanLanding.quickJoin'),
  })

  return facts
}

export function membershipFromWalletCard(
  card: { stamps: number; summary?: { stamps?: number; next_reward_stamps?: number | null; max_stamps?: number; stamps_to_next?: number | null; pending_rewards_count?: number } | null },
): ScanLandingMembership {
  const stamps = card.summary?.stamps ?? card.stamps
  const target = Math.max(card.summary?.next_reward_stamps ?? card.summary?.max_stamps ?? 1, 1)
  const stampsToNext =
    card.summary?.stamps_to_next != null
      ? Math.max(card.summary.stamps_to_next, 0)
      : Math.max(target - stamps, 0)

  return {
    stamps: Math.min(Math.max(stamps, 0), target),
    target,
    stampsToNext,
    pendingRewardsCount: Math.max(card.summary?.pending_rewards_count ?? 0, 0),
  }
}

export function progressDotSymbols(requiredStamps: number, filledStamps: number): string {
  const total = Math.min(Math.max(requiredStamps, 1), 12)
  const filled = Math.min(Math.max(filledStamps, 0), total)

  return Array.from({ length: total }, (_, index) => (index < filled ? '●' : '○')).join(' ')
}

export function formatSocialCount(count: number, singular: string, plural: string): string | null {
  if (count <= 0) {
    return null
  }

  return count === 1 ? `1 ${singular}` : `${count.toLocaleString()} ${plural}`
}

export { categoryEmoji } from './venueCategories'
