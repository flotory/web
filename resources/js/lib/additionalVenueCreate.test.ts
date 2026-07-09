import { describe, expect, it } from 'vitest'

import {
  additionalVenueCreateFreshPath,
  additionalVenueCreateStepPath,
  ADDITIONAL_VENUE_CREATE_STEPS,
  isAdditionalVenueCreateStep,
} from '@/lib/additionalVenueCreate'

describe('additional venue create helpers', () => {
  it('builds wizard step paths', () => {
    expect(additionalVenueCreateStepPath('details')).toBe('/my-venues/create/details')
    expect(additionalVenueCreateStepPath('files')).toBe('/my-venues/create/files')
    expect(additionalVenueCreateStepPath('review')).toBe('/my-venues/create/review')
    expect(additionalVenueCreateFreshPath()).toBe('/my-venues/create/details?fresh=1')
  })

  it('validates step names', () => {
    expect(ADDITIONAL_VENUE_CREATE_STEPS).toEqual(['details', 'files', 'reward', 'review'])
    expect(isAdditionalVenueCreateStep('details')).toBe(true)
    expect(isAdditionalVenueCreateStep('profile')).toBe(false)
    expect(isAdditionalVenueCreateStep(undefined)).toBe(false)
  })
})
