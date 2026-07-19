import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'

import { formatRelativeTime, formatVenueCategoryLabel, greetingForHour } from './format'

const t = ((key: string) =>
  ({ 'activity.today': 'Today', 'activity.yesterday': 'Yesterday', 'activity.lastWeek': 'Last week' })[key] ??
  key) as unknown as TFunction

describe('format helpers', () => {
  it('greets based on the hour', () => {
    expect(greetingForHour(new Date('2026-06-08T08:00:00'))).toBe('Good morning')
    expect(greetingForHour(new Date('2026-06-08T14:00:00'))).toBe('Good afternoon')
    expect(greetingForHour(new Date('2026-06-08T20:00:00'))).toBe('Good evening')
  })

  it('formats relative and category labels', () => {
    const now = Date.now()
    const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString()

    expect(formatRelativeTime(yesterday, t)).toBe('Yesterday')
    expect(formatRelativeTime(null, t)).toBe('')
    expect(formatVenueCategoryLabel('cafe', t)).toBe('venues.cat_cafe')
    expect(formatVenueCategoryLabel('salon', t)).toBe('venues.cat_salon')
    expect(formatVenueCategoryLabel('other', t)).toBe('venues.cat_other')
    expect(formatVenueCategoryLabel('tea house', t)).toBe('venues.cat_cafe')
  })
})
