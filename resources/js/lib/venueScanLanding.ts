import type { VenueLandingPayload } from '@/lib/onboarding'

export type VenueScanLandingPayload = VenueLandingPayload

export type ScanLandingQuickFactIcon = 'stamps' | 'rewards' | 'join'

export interface ScanLandingQuickFact {
  icon: ScanLandingQuickFactIcon
  text: string
}

/** Example progress for first-time visitors (never misleadingly "almost done"). */
export function exampleFilledStamps(requiredStamps: number): number {
  if (requiredStamps <= 1) {
    return 0
  }

  return Math.min(Math.max(1, Math.floor(requiredStamps / 2)), requiredStamps - 1)
}

export function formatHeroRewardLine(
  hero: VenueLandingPayload['hero_reward'],
  venueName: string,
): string {
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
    const stampWord = firstRewardStamps === 1 ? 'stamp' : 'stamps'
    facts.push({
      icon: 'stamps',
      text: `${firstRewardStamps} ${stampWord} to unlock your first reward`,
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
  const icon = '●'
  const empty = '○'

  return Array.from({ length: total }, (_, index) => (index < filled ? icon : empty)).join(' ')
}

export function formatSocialCount(count: number, singular: string, plural: string): string | null {
  if (count <= 0) {
    return null
  }

  return count === 1 ? `1 ${singular}` : `${count.toLocaleString()} ${plural}`
}

const VENUE_CATEGORY_LABELS: Record<string, string> = {
  cafe: 'Cafe',
  bar: 'Bar',
  restaurant: 'Restaurant',
  bakery: 'Bakery',
}

export function formatVenueCategoryLabel(category?: string | null): string | null {
  const key = (category ?? '').toLowerCase()
  return VENUE_CATEGORY_LABELS[key] ?? null
}

export function categoryEmoji(category?: string | null): string {
  const value = (category ?? '').toLowerCase()
  if (value === 'cafe' || value === 'coffee') return '☕'
  if (value === 'bar') return '🍸'
  if (value === 'bakery') return '🥐'
  if (value === 'restaurant') return '🍽️'
  return '🎁'
}
