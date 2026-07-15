import { describe, expect, it, vi } from 'vitest'

vi.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: vi.fn(),
}))

vi.mock('expo-linking', () => ({
  parse: vi.fn(),
}))

import { googleAuthResultFromQueryParams, googleOAuthStartUrl } from './googleBrowserAuth'

describe('googleOAuthStartUrl', () => {
  it('points at the mobile Google redirect endpoint', () => {
    expect(googleOAuthStartUrl()).toBe('https://flotory.com/auth/google/redirect?mobile=1')
  })
})

describe('googleAuthResultFromQueryParams', () => {
  it('returns success when oauth_token is present', () => {
    expect(googleAuthResultFromQueryParams({ oauth_token: 'abc123' })).toEqual({
      status: 'success',
      oauthToken: 'abc123',
    })
  })

  it('reads oauth_token from array params', () => {
    expect(googleAuthResultFromQueryParams({ oauth_token: ['token-from-array'] })).toEqual({
      status: 'success',
      oauthToken: 'token-from-array',
    })
  })

  it('maps google_auth_failed to friendly error', () => {
    expect(googleAuthResultFromQueryParams({ error: 'google_auth_failed' })).toEqual({
      status: 'error',
      message: 'Google sign-in could not be completed. Try again or use email and password.',
    })
  })

  it('returns generic error when token is missing', () => {
    expect(googleAuthResultFromQueryParams({})).toEqual({
      status: 'error',
      message: 'Google sign-in did not return a token.',
    })
  })
})
