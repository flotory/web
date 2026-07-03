import type { AppLocale } from '@/i18n'

export const CURRENCY_STORAGE_KEY = 'flotory_currency'

export type AppCurrency = 'USD' | 'AMD'

export const currencyOptions: Array<{ value: AppCurrency; label: string; nativeLabel: string }> = [
  { value: 'AMD', label: 'Armenian dram (AMD)', nativeLabel: 'Հայկական դրամ (AMD)' },
  { value: 'USD', label: 'US dollar (USD)', nativeLabel: 'Ամն դոլար (USD)' },
]

const supportedCurrencies = new Set<AppCurrency>(['USD', 'AMD'])

export function isSupportedCurrency(value: unknown): value is AppCurrency {
  return typeof value === 'string' && supportedCurrencies.has(value as AppCurrency)
}

export function resolveCurrency(value: unknown, fallback: AppCurrency = 'AMD'): AppCurrency {
  return isSupportedCurrency(value) ? value : fallback
}

export function currencySymbol(currency: AppCurrency): string {
  return currency === 'AMD' ? '֏' : '$'
}

export function formatCurrency(amount: number, currency: AppCurrency, locale: AppLocale = 'en'): string {
  const intlLocale = locale === 'hy' ? 'hy-AM' : 'en-US'

  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'AMD' ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(amount)
}
