/** Web routes and deep links for the Flotory customer mobile app. */

export const MOBILE_APP_PATH = '/app'

export const MOBILE_APP_SCHEME = 'flotory'

export function mobileVenueDeepLink(slug: string): string {
  return `${MOBILE_APP_SCHEME}://v/${encodeURIComponent(slug)}`
}

export function mobileNfcDeepLink(token: string): string {
  return `${MOBILE_APP_SCHEME}://t/${encodeURIComponent(token)}`
}

export function buildNfcTapUrl(token: string, origin?: string): string {
  const base = (origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://flotory.com')).replace(/\/$/, '')
  return `${base}/t/${encodeURIComponent(token)}`
}

export function mobileAppDeepLink(): string {
  return `${MOBILE_APP_SCHEME}://`
}
