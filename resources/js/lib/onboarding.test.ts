import { describe, expect, it } from 'vitest'

import {
  buildGoogleAuthUrl,
  buildGoogleAuthUrlWithIntent,
  buildVenueLandingPath,
  buildVenueLandingUrl,
} from './onboarding'

describe('buildVenueLandingPath', () => {
  it('encodes slug in the public join path', () => {
    expect(buildVenueLandingPath('demo-cafe')).toBe('/v/demo-cafe')
    expect(buildVenueLandingPath('café & bar')).toBe('/v/caf%C3%A9%20%26%20bar')
  })
})

describe('buildVenueLandingUrl', () => {
  it('prefixes origin when provided', () => {
    expect(buildVenueLandingUrl('demo-cafe', 'http://localhost:8000')).toBe(
      'http://localhost:8000/v/demo-cafe',
    )
  })
})

describe('buildGoogleAuthUrl', () => {
  it('includes redirect and optional venue slug', () => {
    expect(buildGoogleAuthUrl(null, '/dashboard')).toBe('/auth/google/redirect?redirect=%2Fdashboard')
    expect(buildGoogleAuthUrl('demo-cafe', '/app')).toBe(
      '/auth/google/redirect?redirect=%2Fapp&venue_slug=demo-cafe',
    )
  })
})

describe('buildGoogleAuthUrlWithIntent', () => {
  it('adds owner intent when requested', () => {
    expect(buildGoogleAuthUrlWithIntent('demo-cafe', '/dashboard', 'owner')).toBe(
      '/auth/google/redirect?redirect=%2Fdashboard&venue_slug=demo-cafe&intent=owner',
    )
  })
})
