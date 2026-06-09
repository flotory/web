import { MOBILE_APP_PATH } from '@/lib/mobileApp'

export interface VenueLandingPayload {
  venue: {
    id: number
    name: string
    slug: string
    category?: string | null
    logo: string | null
    logo_thumb?: string | null
    cover_image?: string | null
    address: string | null
  }
  milestones: Array<{
    id: number
    title: string
    description: string | null
    image: string | null
    image_thumb?: string | null
    required_stamps: number
  }>
  hero_reward: {
    id: number
    title: string
    description: string | null
    image: string | null
    image_thumb?: string | null
    required_stamps: number
  } | null
  social_proof: {
    members_count: number
    rewards_claimed_count: number
  }
}

export function buildVenueLandingPath(slug: string): string {
  return `/v/${encodeURIComponent(slug)}`
}

export function buildVenueLandingUrl(slug: string, origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
  return `${origin}${buildVenueLandingPath(slug)}`
}

export function buildGoogleAuthUrl(venueSlug: string | null, nextPath = MOBILE_APP_PATH): string {
  const params = new URLSearchParams({
    redirect: nextPath,
  })

  if (venueSlug) {
    params.set('venue_slug', venueSlug)
  }

  return `/auth/google/redirect?${params.toString()}`
}

export function buildGoogleAuthUrlWithIntent(
  venueSlug: string | null,
  nextPath = MOBILE_APP_PATH,
  intent: 'owner' | null = null,
): string {
  const params = new URLSearchParams({
    redirect: nextPath,
  })

  if (venueSlug) {
    params.set('venue_slug', venueSlug)
  }

  if (intent) {
    params.set('intent', intent)
  }

  return `/auth/google/redirect?${params.toString()}`
}
