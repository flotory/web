/** Web routes and deep links for the Flotory mobile app (customers + staff). */

export const MOBILE_APP_PATH = '/app'

export const MOBILE_APP_SCHEME = 'flotory'

export function mobileVenueDeepLink(slug: string): string {
  return `${MOBILE_APP_SCHEME}://v/${encodeURIComponent(slug)}`
}

export function mobileAppDeepLink(): string {
  return `${MOBILE_APP_SCHEME}://`
}
