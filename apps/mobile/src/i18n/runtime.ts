import { resolveLocale, type AppLocale } from './localeConfig'

let activeLocale: AppLocale = 'en'

export function setRuntimeLocale(locale: AppLocale): void {
  activeLocale = locale
}

export function currentLocale(): AppLocale {
  return activeLocale
}

export function applyRuntimeLocale(value: string | null | undefined): AppLocale {
  const locale = resolveLocale(value) ?? 'en'
  setRuntimeLocale(locale)
  return locale
}
