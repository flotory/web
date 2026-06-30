export const SUPPORTED_LOCALES = ['en', 'hy'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const localeOptions: Array<{ value: AppLocale; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'hy', label: 'Հայերեն' },
]

export function resolveLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null
  const base = value.toLowerCase().split('-')[0]
  return SUPPORTED_LOCALES.includes(base as AppLocale) ? (base as AppLocale) : null
}
