import type { TFunction } from 'i18next'

export function campaignEndsLabel(daysLeft: number | null | undefined, t: TFunction): string | null {
  if (daysLeft == null || daysLeft < 0) return null
  if (daysLeft === 0) return t('home.endsToday')
  return t('home.endsInDays', { count: daysLeft })
}
