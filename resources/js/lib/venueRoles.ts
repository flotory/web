import { MOBILE_APP_PATH } from '@/lib/mobileApp'
import { isOwnerWorkspacePath, isSafeInternalRedirect } from '@/lib/redirect'
import type { Venue } from '@/types'

/** Where new owners land to create their first venue. */
export const OWNER_VENUE_SETUP_PATH = '/my-venues'

export function ownerVenueSetupLocation(): { path: string; query: { create: string } } {
  return { path: OWNER_VENUE_SETUP_PATH, query: { create: '1' } }
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
): string {
  if (isPlatformAdmin(isAdmin)) {
    return ADMIN_HOME_PATH
  }

  const active = activeVenues.filter((venue) => !venue.archived)

  if (active.some((venue) => venue.membership_role === 'owner')) {
    return '/dashboard'
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
): string {
  return resolveAuthenticatedHomePath(isAdmin, activeVenues, effectiveVenueId)
}

/** Honors an explicit redirect unless it would send a venue owner to the mobile app by mistake. */
export function resolvePostLoginDestination(
  redirect: string | null | undefined,
  isAdmin: boolean | undefined,
  activeVenues: Venue[],
  effectiveVenueId: number | null,
): string {
  const home = resolveAuthenticatedHomePath(isAdmin, activeVenues, effectiveVenueId)
  const hasOwner = hasOwnerMembership(activeVenues)

  if (!redirect) {
    return hasOwner ? home : ownerBootstrapPath(isAdmin, activeVenues, effectiveVenueId)
  }

  const safe = isSafeInternalRedirect(redirect) ? redirect : home

  if (safe.startsWith('/onboarding')) {
    return `${OWNER_VENUE_SETUP_PATH}?create=1`
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
    return `${OWNER_VENUE_SETUP_PATH}?create=1`
  }

  return safe
}
