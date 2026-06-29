import { MOBILE_APP_PATH } from '@/lib/mobileApp'
import { isOwnerWorkspacePath, isSafeInternalRedirect } from '@/lib/redirect'
import type { Venue } from '@/types'

export const BOOK_DEMO_PATH = '/book-demo'

/** Invited owners create their first venue here after registration. */
export const OWNER_VENUE_SETUP_PATH = '/my-venues?create=1'

export function ownerVenueSetupLocation(): { path: string; query?: Record<string, string> } {
  return { path: '/my-venues', query: { create: '1' } }
}

export const ADMIN_HOME_PATH = '/admin/venues'

export type VenueMembershipRole = 'owner'

export function isVenueOwner(venue: Pick<Venue, 'membership_role'> | null | undefined): boolean {
  return venue?.membership_role === 'owner'
}

export function hasOwnerMembership(venues: Venue[]): boolean {
  return venues.some((venue) => !venue.archived && venue.membership_role === 'owner')
}

/** Platform super admin — system control only, never a venue operator. */
export function isPlatformAdmin(isAdmin: boolean | undefined): boolean {
  return isAdmin === true
}

/** Where to send the user right after login (owners → dashboard, everyone else → mobile app page). */
export function resolveAuthenticatedHomePath(
  isAdmin: boolean | undefined,
  activeVenues: Venue[],
  _effectiveVenueId: number | null,
  mayCreateVenue = false,
): string {
  if (isPlatformAdmin(isAdmin)) {
    return ADMIN_HOME_PATH
  }

  const active = activeVenues.filter((venue) => !venue.archived)

  if (active.some((venue) => venue.membership_role === 'owner')) {
    return '/dashboard'
  }

  if (mayCreateVenue) {
    return OWNER_VENUE_SETUP_PATH
  }

  if (active.length > 0) {
    return MOBILE_APP_PATH
  }

  return MOBILE_APP_PATH
}

/** New owners without a venue yet should not be sent to the mobile app page. */
export function ownerBootstrapPath(
  isAdmin: boolean | undefined,
  activeVenues: Venue[],
  effectiveVenueId: number | null,
  mayCreateVenue = false,
): string {
  return resolveAuthenticatedHomePath(isAdmin, activeVenues, effectiveVenueId, mayCreateVenue)
}

/** Honors an explicit redirect unless it would send a venue owner to the mobile app by mistake. */
export function resolvePostLoginDestination(
  redirect: string | null | undefined,
  isAdmin: boolean | undefined,
  activeVenues: Venue[],
  effectiveVenueId: number | null,
  mayCreateVenue = false,
): string {
  const home = resolveAuthenticatedHomePath(isAdmin, activeVenues, effectiveVenueId, mayCreateVenue)
  const hasOwner = hasOwnerMembership(activeVenues)

  if (!redirect) {
    return hasOwner ? home : ownerBootstrapPath(isAdmin, activeVenues, effectiveVenueId, mayCreateVenue)
  }

  const safe = isSafeInternalRedirect(redirect) ? redirect : home

  if (safe.startsWith('/onboarding')) {
    return mayCreateVenue ? OWNER_VENUE_SETUP_PATH : BOOK_DEMO_PATH
  }

  if (safe.includes('create=1')) {
    return mayCreateVenue ? OWNER_VENUE_SETUP_PATH : BOOK_DEMO_PATH
  }

  if (
    (safe === MOBILE_APP_PATH
      || safe.startsWith('/wallet')
      || safe.startsWith('/card')
      || safe === '/home'
      || safe.startsWith('/scanner'))
    && home !== MOBILE_APP_PATH
  ) {
    return home
  }

  if (isPlatformAdmin(isAdmin)) {
    return safe.startsWith('/admin/') ? safe : ADMIN_HOME_PATH
  }

  if (isOwnerWorkspacePath(safe) && !hasOwner) {
    return mayCreateVenue ? safe : BOOK_DEMO_PATH
  }

  return safe
}
