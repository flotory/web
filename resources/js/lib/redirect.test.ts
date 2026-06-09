import { describe, expect, it } from 'vitest'

import { isSafeInternalRedirect, sanitizeRedirect } from './redirect'

describe('isSafeInternalRedirect', () => {
  it('allows owner and admin workspace paths', () => {
    expect(isSafeInternalRedirect('/dashboard')).toBe(true)
    expect(isSafeInternalRedirect('/my-venues/12/settings')).toBe(true)
    expect(isSafeInternalRedirect('/admin/venues')).toBe(true)
    expect(isSafeInternalRedirect('/admin/activity')).toBe(true)
  })

  it('allows invite and venue landing paths', () => {
    expect(isSafeInternalRedirect('/invite/abc123')).toBe(true)
    expect(isSafeInternalRedirect('/v/demo-cafe')).toBe(true)
  })

  it('rejects external and protocol-relative URLs', () => {
    expect(isSafeInternalRedirect('https://evil.test')).toBe(false)
    expect(isSafeInternalRedirect('//evil.test')).toBe(false)
  })
})

describe('sanitizeRedirect', () => {
  it('returns the path when it is internal', () => {
    expect(sanitizeRedirect('/admin/activity')).toBe('/admin/activity')
  })

  it('falls back when the path is unsafe', () => {
    expect(sanitizeRedirect('https://evil.test', '/app')).toBe('/app')
  })
})
