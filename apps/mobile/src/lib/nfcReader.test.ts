import { describe, expect, it } from 'vitest'

import { extractNfcTokenFromUri, normalizeNfcToken } from './nfcToken'

describe('normalizeNfcToken', () => {
  it('trims and lowercases tokens', () => {
    expect(normalizeNfcToken('  AbC123  ')).toBe('abc123')
  })
})

describe('extractNfcTokenFromUri', () => {
  it('parses production https tap urls', () => {
    expect(extractNfcTokenFromUri('https://flotory.com/t/abc123token')).toBe('abc123token')
  })

  it('parses custom scheme deep links', () => {
    expect(extractNfcTokenFromUri('flotory://t/demo-token')).toBe('demo-token')
  })

  it('parses local dev bridge urls', () => {
    expect(extractNfcTokenFromUri('http://localhost:8000/t/localdev')).toBe('localdev')
  })

  it('returns null for unrelated urls', () => {
    expect(extractNfcTokenFromUri('https://flotory.com/v/demo-cafe')).toBeNull()
    expect(extractNfcTokenFromUri('')).toBeNull()
  })
})
