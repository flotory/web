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

export function formatVisitsToUnlock(requiredStamps: number): string {
  if (requiredStamps <= 0) {
    return 'Start collecting on your first visit'
  }

  if (requiredStamps === 1) {
    return '1 visit to unlock'
  }

  return `${requiredStamps} visits to unlock`
}

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

export const VENUE_JOIN_STEPS = [
  { label: 'Join free in the app', detail: 'Takes under 30 seconds' },
  { label: 'Visit us', detail: 'Come back whenever you like' },
  { label: 'Tap NFC stand', detail: 'One tap per visit at the counter' },
] as const
