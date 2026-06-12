import { describe, expect, it } from 'vitest'

import { formatRelativeTime, formatVenueCategoryLabel, greetingForHour } from './format'

describe('format helpers', () => {
  it('greets based on the hour', () => {
    expect(greetingForHour(new Date('2026-06-08T08:00:00'))).toBe('Good morning')
    expect(greetingForHour(new Date('2026-06-08T14:00:00'))).toBe('Good afternoon')
    expect(greetingForHour(new Date('2026-06-08T20:00:00'))).toBe('Good evening')
  })

  it('formats relative and category labels', () => {
    const now = Date.now()
    const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString()

    expect(formatRelativeTime(yesterday)).toBe('Yesterday')
    expect(formatRelativeTime(null)).toBe('')
    expect(formatVenueCategoryLabel('cafe')).toBe('Coffee & Bakery')
    expect(formatVenueCategoryLabel('tea house')).toBe('Tea house')
  })
})
