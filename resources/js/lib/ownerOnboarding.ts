import type { VenueListingSnapshot } from '@/lib/venueListing'
import { hasOwnerMembership } from '@/lib/venueRoles'
import type { Venue } from '@/types'

export const OWNER_ONBOARDING_PATH = '/onboarding'

export const ONBOARDING_STEPS = ['welcome', 'profile', 'location', 'files', 'reward', 'review'] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export const ONBOARDING_STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: 'Welcome',
  profile: 'Venue profile',
  location: 'Location',
  files: 'Files',
  reward: 'First reward',
  review: 'Submit',
}

export interface OwnerOnboardingDraft {
  name: string
  category: string
  address: string
  latitude: number | null
  longitude: number | null
  google_place_id: string | null
  phone: string
  website: string
  reward: {
    title: string
    description: string
    required_stamps: number
  }
}

export interface OwnerOnboardingContext {
  active: boolean
  uses_draft?: boolean
  business_name: string | null
  venue: Venue | null
  draft: OwnerOnboardingDraft | null
  listing: VenueListingSnapshot | null
}

export function isOnboardingStep(value: string | undefined): value is OnboardingStep {
  return ONBOARDING_STEPS.includes(value as OnboardingStep)
}

export function onboardingStepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step)
}

export function onboardingStepPath(step: OnboardingStep): string {
  return step === 'welcome' ? OWNER_ONBOARDING_PATH : `${OWNER_ONBOARDING_PATH}/${step}`
}

export function venueNeedsOnboarding(venues: Venue[]): boolean {
  const ownerVenues = venues.filter((venue) => !venue.archived && venue.membership_role === 'owner')
  if (ownerVenues.length === 0) {
    return false
  }

  const hasLiveBrand = ownerVenues.some(
    (venue) => venue.status === 'published' || venue.status === 'pending_review',
  )

  if (hasLiveBrand) {
    return false
  }

  const status = ownerVenues[0]?.status ?? 'draft'
  return status === 'draft' || status === 'rejected'
}

export function shouldUseOwnerOnboarding(mayCreateVenue: boolean, venues: Venue[]): boolean {
  if (mayCreateVenue && !hasOwnerMembership(venues)) {
    return true
  }

  return venueNeedsOnboarding(venues)
}

function profileComplete(venue: Venue | null, draft: OwnerOnboardingDraft | null): boolean {
  const name = venue?.name?.trim() || draft?.name?.trim() || ''
  const category = venue?.category?.trim() || draft?.category?.trim() || ''

  return name.length > 0 && category.length > 0
}

export function resolveOnboardingStep(
  venue: Venue | null,
  listing: VenueListingSnapshot | null,
  draft: OwnerOnboardingDraft | null = null,
): OnboardingStep {
  if (!venue && !listing) {
    return 'welcome'
  }

  if (!profileComplete(venue, draft)) {
    return 'profile'
  }

  const items = listing?.items ?? []
  const complete = (key: string) => items.find((item) => item.key === key)?.complete === true

  if (!complete('address')) {
    return 'location'
  }

  if (!complete('setup_files')) {
    return 'files'
  }

  if (!complete('rewards')) {
    return 'reward'
  }

  return 'review'
}

/** Prevents skipping ahead of the first incomplete onboarding step. */
export function clampOnboardingStep(
  requested: OnboardingStep,
  venue: Venue | null,
  listing: VenueListingSnapshot | null,
  draft: OwnerOnboardingDraft | null = null,
): OnboardingStep {
  if (requested === 'welcome') {
    return 'welcome'
  }

  const furthest = resolveOnboardingStep(venue, listing, draft)
  const furthestStep = furthest === 'welcome' ? 'profile' : furthest
  const requestedIndex = onboardingStepIndex(requested)
  const furthestIndex = onboardingStepIndex(furthestStep)

  if (requestedIndex > furthestIndex) {
    return furthestStep
  }

  return requested
}

export function nextOnboardingStep(step: OnboardingStep): OnboardingStep | null {
  const index = onboardingStepIndex(step)
  return index < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[index + 1]! : null
}

export function previousOnboardingStep(step: OnboardingStep): OnboardingStep | null {
  const index = onboardingStepIndex(step)
  return index > 0 ? ONBOARDING_STEPS[index - 1]! : null
}
