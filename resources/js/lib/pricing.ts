import type { AppLocale } from '@/i18n'

import { formatCurrency } from '@/lib/currency'

/** Monthly price for the first venue location (AMD). */
export const VENUE_FIRST_MONTHLY_PRICE_AMD = 9900

/** Monthly price for each additional venue on the same account (AMD). */
export const VENUE_ADDITIONAL_MONTHLY_PRICE_AMD = 4900

/** @deprecated Use VENUE_FIRST_MONTHLY_PRICE_AMD */
export const VENUE_MONTHLY_PRICE_AMD = VENUE_FIRST_MONTHLY_PRICE_AMD

/** Free trial length for new owner accounts (months). Applies once per account, not per venue. */
export const ACCOUNT_FREE_TRIAL_MONTHS = 1

/** @deprecated Use ACCOUNT_FREE_TRIAL_MONTHS */
export const VENUE_FREE_TRIAL_MONTHS = ACCOUNT_FREE_TRIAL_MONTHS

export const pricingIncludedFeatures = [
  'Guest mobile app — free for your customers',
  'NFC stamp stands at the counter',
  'Owner dashboard with visits and rewards',
  'Campaigns and milestone rewards',
  'Multi-location from one owner account',
  'Hands-on onboarding and launch support',
] as const

export function formatVenueFirstMonthlyPrice(locale: AppLocale = 'en'): string {
  return formatCurrency(VENUE_FIRST_MONTHLY_PRICE_AMD, 'AMD', locale)
}

export function formatVenueAdditionalMonthlyPrice(locale: AppLocale = 'en'): string {
  return formatCurrency(VENUE_ADDITIONAL_MONTHLY_PRICE_AMD, 'AMD', locale)
}

/** @deprecated Use formatVenueFirstMonthlyPrice */
export function formatVenueMonthlyPrice(locale: AppLocale = 'en'): string {
  return formatVenueFirstMonthlyPrice(locale)
}

export function accountFreeTrialLabel(months: number = ACCOUNT_FREE_TRIAL_MONTHS): string {
  return months === 1 ? '1 month free' : `${months} months free`
}

/** @deprecated Use accountFreeTrialLabel */
export function venueFreeTrialLabel(months: number = ACCOUNT_FREE_TRIAL_MONTHS): string {
  return accountFreeTrialLabel(months)
}

/** @deprecated Use accountFreeTrialLabel */
export function venueFreeTrialHeadline(months: number = ACCOUNT_FREE_TRIAL_MONTHS): string {
  return accountFreeTrialLabel(months)
}
