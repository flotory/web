import { createI18n } from 'vue-i18n'

import en from './locales/en'
import hy from './locales/hy'

export const SUPPORTED_LOCALES = ['en', 'hy'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_STORAGE_KEY = 'flotory_locale'

export const localeOptions: Array<{ value: AppLocale; label: string; nativeLabel: string }> = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'hy', label: 'Armenian', nativeLabel: 'Հայերեն' },
]

function isSupportedLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as AppLocale)
}

function normalizeLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null
  const base = value.toLowerCase().split('-')[0]
  return isSupportedLocale(base) ? base : null
}

function detectInitialLocale(): AppLocale {
  if (typeof window === 'undefined') return 'en'

  return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY))
    ?? normalizeLocale(window.navigator.language)
    ?? 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectInitialLocale(),
  fallbackLocale: 'en',
  messages: { en, hy },
})

export function getActiveLocale(): AppLocale {
  const locale = i18n.global.locale.value
  return isSupportedLocale(locale) ? locale : 'en'
}

export function setActiveLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale

  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

export function resolveLocale(value: unknown): AppLocale {
  return normalizeLocale(typeof value === 'string' ? value : null) ?? 'en'
}
