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

export type ScanLandingQuickFactIcon = 'stamps' | 'rewards' | 'join'

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

export function buildScanLandingQuickFacts(options: {
  firstRewardStamps?: number | null
  milestoneCount: number
}): ScanLandingQuickFact[] {
  const { firstRewardStamps, milestoneCount } = options
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
