import type { TFunction } from 'i18next'

import { currentLocale } from '../i18n'

export { formatVenueCategoryLabel } from './venueCategories'

export function greetingForHour(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatRelativeTime(iso: string | null | undefined, t: TFunction): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = now - then
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return t('activity.today')
  if (diffDays === 1) return t('activity.yesterday')
  if (diffDays < 7) return t('activity.lastWeek')
  return new Date(iso).toLocaleDateString(currentLocale(), { month: 'short', day: 'numeric' })
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
