export interface VenueJoinHeroReward {
  title: string
  required_stamps: number
  image?: string | null
  image_thumb?: string | null
}

export interface VenueJoinSocialProof {
  members_count: number
  rewards_claimed_count: number
}

export function formatVenueJoinRewardHeadline(hero: VenueJoinHeroReward | null | undefined): string {
  if (!hero?.title?.trim()) {
    return 'Collect stamps and unlock rewards'
  }

  return hero.title.trim()
}

export function formatStampsToUnlock(requiredStamps: number): string {
  if (requiredStamps <= 0) {
    return 'Start collecting stamps'
  }

  if (requiredStamps === 1) {
    return '1 stamp to unlock'
  }

  return `${requiredStamps} stamps to unlock`
}

/** @deprecated Use formatStampsToUnlock */
export const formatVisitsToUnlock = formatStampsToUnlock

export function formatJoinSocialProof(social: VenueJoinSocialProof | null | undefined): string | null {
  if (!social) {
    return null
  }

  if (social.members_count >= 12) {
    return `${social.members_count.toLocaleString()} people already collect stamps here`
  }

  if (social.members_count >= 4) {
    return 'Join others collecting rewards here'
  }

  if (social.rewards_claimed_count >= 8) {
    return `${social.rewards_claimed_count.toLocaleString()} rewards claimed here`
  }

  return null
}

export const NFC_RETURN_STAMP_HEADLINE = 'Next time, tap the NFC stand'

/** @deprecated Use NFC_RETURN_STAMP_HEADLINE */
export const NFC_RETURN_VISIT_HEADLINE = NFC_RETURN_STAMP_HEADLINE

export const VENUE_JOIN_NFC_EDUCATION = {
  title: 'After you join',
  headline: NFC_RETURN_STAMP_HEADLINE,
  detail: 'Hold your phone near the Flotory stand at the counter to collect stamps.',
} as const

export const VENUE_JOIN_STEPS = [
  { label: 'Join free in the app', detail: 'Takes under 30 seconds' },
  { label: 'Come to the cafe', detail: 'Whenever you like' },
  { label: 'Tap NFC stand', detail: 'Collect stamps at the counter' },
] as const
