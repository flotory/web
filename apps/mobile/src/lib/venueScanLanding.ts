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

export function formatUnlockRequirement(requiredStamps: number): string {
  if (requiredStamps <= 0) {
    return 'Join to start collecting stamps'
  }

  if (requiredStamps === 1) {
    return 'Unlocks after 1 stamp'
  }

  return `Unlocks after ${requiredStamps} stamps`
}

export function formatHeroRewardLine(hero: VenueHeroReward | null | undefined, venueName: string): string {
  if (!hero) {
    return `Collect stamps at ${venueName} and unlock rewards.`
  }

  if (hero.title.trim() !== '') {
    return hero.title
  }

  return `Collect ${hero.required_stamps} stamps for a reward`
}

export function formatHeroSubtitle(venueName: string): string {
  return `Collect stamps every visit and unlock rewards from ${venueName}.`
}

export function formatMemberStampCaption(membership: ScanLandingMembership): string {
  if (membership.pendingRewardsCount > 0) {
    return membership.pendingRewardsCount === 1
      ? 'You have a reward ready in Wallet'
      : `${membership.pendingRewardsCount} rewards ready in Wallet`
  }

  if (membership.stampsToNext <= 0) {
    return 'You are on your loyalty card'
  }

  if (membership.stampsToNext === 1) {
    return '1 stamp to your next reward'
  }

  return `${membership.stampsToNext} stamps to your next reward`
}

export function buildScanLandingQuickFacts(options: {
  firstRewardStamps?: number | null
  milestoneCount: number
  membership?: ScanLandingMembership | null
}): ScanLandingQuickFact[] {
  const { firstRewardStamps, milestoneCount, membership } = options

  if (membership) {
    const facts: ScanLandingQuickFact[] = [
      {
        icon: 'stamps',
        text: `${membership.stamps} / ${membership.target} stamps on your card`,
      },
    ]

    if (membership.pendingRewardsCount > 0) {
      facts.push({
        icon: 'rewards',
        text:
          membership.pendingRewardsCount === 1
            ? 'Reward ready — open your card to redeem'
            : `${membership.pendingRewardsCount} rewards ready — open your card`,
      })
    } else if (membership.stampsToNext > 0) {
      facts.push({
        icon: 'stamps',
        text: membership.stampsToNext === 1 ? '1 stamp to next reward' : `${membership.stampsToNext} stamps to next reward`,
      })
    }

    facts.push({
      icon: 'nfc',
      text: 'Tap the NFC stand at the counter for each visit',
    })

    return facts
  }

  const facts: ScanLandingQuickFact[] = []

  if (firstRewardStamps && firstRewardStamps > 0) {
    facts.push({
      icon: 'stamps',
      text: formatUnlockRequirement(firstRewardStamps).replace(/^Unlocks/, 'First reward unlocks'),
    })
  }

  if (milestoneCount > 0) {
    facts.push({
      icon: 'rewards',
      text: milestoneCount === 1 ? '1 reward available' : `${milestoneCount} rewards available`,
    })
  }

  facts.push({
    icon: 'join',
    text: 'Takes less than 30 seconds to join',
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

export function categoryEmoji(category?: string | null): string {
  const value = (category ?? '').toLowerCase()
  if (value === 'cafe' || value === 'coffee') return '☕'
  if (value === 'bar') return '🍸'
  if (value === 'bakery') return '🥐'
  if (value === 'restaurant') return '🍽️'
  return '🎁'
}
