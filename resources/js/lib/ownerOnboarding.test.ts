import { describe, expect, it } from 'vitest'

import type { VenueListingSnapshot } from '@/lib/venueListing'
import {
  clampOnboardingStep,
  ONBOARDING_STEP_LABELS,
  onboardingStepPath,
  resolveOnboardingStep,
  shouldUseOwnerOnboarding,
  venueNeedsOnboarding,
} from '@/lib/ownerOnboarding'
import type { Venue } from '@/types'

function venue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: 1,
    name: 'Harbor Coffee',
    slug: 'harbor-coffee',
    membership_role: 'owner',
    category: 'cafe',
    status: 'draft',
    ...overrides,
  }
}

function listing(items: VenueListingSnapshot['items']): VenueListingSnapshot {
  return {
    status: 'draft',
    ready_to_submit: false,
    can_submit: false,
    is_public: false,
    items,
  }
}

describe('owner onboarding helpers', () => {
  it('routes invited owners into the wizard', () => {
    expect(shouldUseOwnerOnboarding(true, [])).toBe(true)
    expect(shouldUseOwnerOnboarding(false, [venue()])).toBe(true)
    expect(shouldUseOwnerOnboarding(false, [venue({ status: 'pending_review' })])).toBe(false)
    expect(shouldUseOwnerOnboarding(false, [venue({ status: 'rejected' })])).toBe(true)
  })

  it('detects draft and rejected venues that still need onboarding', () => {
    expect(venueNeedsOnboarding([venue({ status: 'draft' })])).toBe(true)
    expect(venueNeedsOnboarding([venue({ status: 'rejected' })])).toBe(true)
    expect(venueNeedsOnboarding([venue({ status: 'published' })])).toBe(false)
    expect(venueNeedsOnboarding([])).toBe(false)
  })

  it('builds onboarding paths', () => {
    expect(onboardingStepPath('welcome')).toBe('/onboarding')
    expect(onboardingStepPath('profile')).toBe('/onboarding/profile')
    expect(onboardingStepPath('files')).toBe('/onboarding/files')
  })

  it('labels the logo and cover step', () => {
    expect(ONBOARDING_STEP_LABELS.files).toBe('Logo & cover')
  })

  it('resolves the next incomplete onboarding step from listing items', () => {
    expect(resolveOnboardingStep(null, null)).toBe('welcome')

    const draftVenue = venue()
    expect(resolveOnboardingStep(draftVenue, listing([
      { key: 'address', label: 'Google address', complete: false, hint: '' },
      { key: 'category', label: 'Venue category', complete: true, hint: '' },
      { key: 'setup_files', label: 'Logo & cover', complete: false, hint: '' },
      { key: 'rewards', label: 'At least one active reward', complete: false, hint: '' },
    ]))).toBe('location')

    expect(resolveOnboardingStep(draftVenue, listing([
      { key: 'address', label: 'Google address', complete: true, hint: '' },
      { key: 'category', label: 'Venue category', complete: true, hint: '' },
      { key: 'setup_files', label: 'Logo & cover', complete: false, hint: '' },
      { key: 'rewards', label: 'At least one active reward', complete: false, hint: '' },
    ]))).toBe('files')

    expect(resolveOnboardingStep(draftVenue, listing([
      { key: 'address', label: 'Google address', complete: true, hint: '' },
      { key: 'category', label: 'Venue category', complete: true, hint: '' },
      { key: 'setup_files', label: 'Logo & cover', complete: true, hint: '' },
      { key: 'rewards', label: 'At least one active reward', complete: true, hint: '' },
    ]))).toBe('review')
  })

  it('clamps skip-ahead navigation to the first incomplete step', () => {
    const draftVenue = venue()
    const partial = listing([
      { key: 'address', label: 'Google address', complete: true, hint: '' },
      { key: 'category', label: 'Venue category', complete: true, hint: '' },
      { key: 'setup_files', label: 'Logo & cover', complete: false, hint: '' },
      { key: 'rewards', label: 'At least one active reward', complete: false, hint: '' },
    ])

    expect(clampOnboardingStep('review', draftVenue, partial)).toBe('files')
    expect(clampOnboardingStep('location', draftVenue, partial)).toBe('location')
    expect(clampOnboardingStep('profile', null, null)).toBe('profile')
    expect(clampOnboardingStep('files', null, null)).toBe('profile')
    expect(clampOnboardingStep('welcome', draftVenue, partial)).toBe('welcome')
  })
})
