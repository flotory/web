import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { activityLabel, activityTone, formatRelativeDays, formatShortDate } from './formatDate'

describe('formatShortDate', () => {
  it('returns em dash for empty values', () => {
    expect(formatShortDate(null)).toBe('—')
    expect(formatShortDate(undefined)).toBe('—')
  })

  it('formats ISO dates', () => {
    expect(formatShortDate('2026-06-01T10:00:00Z')).toMatch(/2026/)
  })
})

describe('formatRelativeDays', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-10T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('labels today, yesterday, and recent days', () => {
    expect(formatRelativeDays('2026-06-10T08:00:00Z')).toBe('Today')
    expect(formatRelativeDays('2026-06-09T08:00:00Z')).toBe('Yesterday')
    expect(formatRelativeDays('2026-06-07T08:00:00Z')).toBe('3 days ago')
  })

  it('falls back to short date for older values', () => {
    expect(formatRelativeDays('2026-05-01T08:00:00Z')).toMatch(/May/)
  })
})

describe('activity helpers', () => {
  it('maps CRM activity status to labels and tones', () => {
    expect(activityLabel('active')).toBe('Active')
    expect(activityLabel('cooling')).toBe('At risk')
    expect(activityTone('active')).toBe('green')
    expect(activityTone('cooling')).toBe('amber')
    expect(activityTone('unknown')).toBe('slate')
  })
})
