import { api } from '@/lib/api'
import type { Customer } from '@/types'

export interface VenueLandingPayload {
  venue: {
    id: number
    name: string
    slug: string
    logo: string | null
    address: string | null
  }
  milestones: Array<{
    id: number
    title: string
    description: string | null
    image: string | null
    required_stamps: number
  }>
}

export const QR_MESSAGE_PRESETS = [
  { id: 'collect', headline: 'Scan to collect rewards', sub: 'Join our loyalty program in seconds.' },
  { id: 'regular', headline: 'Become a regular', sub: 'Unlock rewards every time you visit.' },
  { id: 'unlock', headline: 'Unlock free drinks', sub: 'Your next reward is closer than you think.' },
] as const

export type QrMessagePresetId = (typeof QR_MESSAGE_PRESETS)[number]['id']

export function buildVenueLandingPath(slug: string): string {
  return `/v/${encodeURIComponent(slug)}`
}

export function buildVenueLandingUrl(slug: string, origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
  return `${origin}${buildVenueLandingPath(slug)}`
}

export function buildAuthRedirectWithVenue(slug: string, nextPath = '/card'): string {
  const params = new URLSearchParams({
    venue_slug: slug,
    redirect: nextPath,
  })

  return `/login?${params.toString()}`
}

export function buildRegisterRedirectWithVenue(slug: string, nextPath = '/card'): string {
  const params = new URLSearchParams({
    venue_slug: slug,
    redirect: nextPath,
  })

  return `/register?${params.toString()}`
}

export function buildGoogleAuthUrl(venueSlug: string | null, nextPath = '/card'): string {
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
  nextPath = '/card',
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

export async function fetchVenueLanding(slug: string): Promise<VenueLandingPayload> {
  return api<VenueLandingPayload>(`/public/venues/${encodeURIComponent(slug)}/landing`)
}

export async function joinVenueBySlug(slug: string): Promise<{ customer: Customer }> {
  return api<{ customer: Customer }>(`/venues/${encodeURIComponent(slug)}/join`, {
    method: 'POST',
  })
}

export async function completeVenueOnboarding(slug: string): Promise<{ venueId: number; customerId: number }> {
  const joined = await joinVenueBySlug(slug)
  return {
    venueId: joined.customer.venue_id,
    customerId: joined.customer.id,
  }
}
