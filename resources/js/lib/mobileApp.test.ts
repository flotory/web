import { describe, expect, it } from 'vitest'

import {
  MOBILE_APP_PATH,
  MOBILE_APP_SCHEME,
  buildNfcTapUrl,
  mobileAppDeepLink,
  mobileNfcDeepLink,
  mobileVenueDeepLink,
} from './mobileApp'

describe('mobile deep links', () => {
  it('builds venue and nfc scheme urls', () => {
    expect(MOBILE_APP_SCHEME).toBe('flotory')
    expect(mobileVenueDeepLink('demo-cafe')).toBe('flotory://v/demo-cafe')
    expect(mobileNfcDeepLink('abc123')).toBe('flotory://t/abc123')
    expect(mobileAppDeepLink()).toBe('flotory://')
  })

  it('encodes unsafe characters in slugs and tokens', () => {
    expect(mobileVenueDeepLink('café & bar')).toBe('flotory://v/caf%C3%A9%20%26%20bar')
  })
})

describe('buildNfcTapUrl', () => {
  it('builds https tap bridge urls', () => {
    expect(buildNfcTapUrl('token-1', 'https://flotory.com')).toBe('https://flotory.com/t/token-1')
  })

  it('strips trailing slash from origin', () => {
    expect(buildNfcTapUrl('token-1', 'https://flotory.com/')).toBe('https://flotory.com/t/token-1')
  })
})

describe('MOBILE_APP_PATH', () => {
  it('points to the customer web bridge page', () => {
    expect(MOBILE_APP_PATH).toBe('/app')
  })
})
