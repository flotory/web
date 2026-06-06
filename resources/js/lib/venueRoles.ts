import { hasOwnerOnboardingIntent } from '@/lib/ownerIntent'
import { isOwnerWorkspacePath, isSafeInternalRedirect } from '@/lib/redirect'
import type { Venue } from '@/types'

export const OWNER_ONBOARDING_PATH = '/onboarding/create-venue'

export const ADMIN_HOME_PATH = '/admin/venues'

export type VenueMembershipRole = 'owner' | 'staff'

export function isVenueOwner(venue: Pick<Venue, 'membership_role'> | null | undefined): boolean {
  return venue?.membership_role === 'owner'
}

export function isVenueStaff(venue: Pick<Venue, 'membership_role'> | null | undefined): boolean {
  return venue?.membership_role === 'staff'
}

export function isStaffOnlyMember(venues: Venue[]): boolean {
  const active = venues.filter((venue) => !venue.archived)

  return active.length > 0 && active.every((venue) => venue.membership_role === 'staff')
}

export function staffScannerPath(venueId: number | null): string {
  return venueId ? `/scanner?venue_id=${venueId}` : '/scanner'
}

export function hasTeamMembership(venues: Venue[]): boolean {
  return venues.some((venue) => !venue.archived && (venue.membership_role === 'owner' || venue.membership_role === 'staff'))
}

export function hasOwnerMembership(venues: Venue[]): boolean {
  return venues.some((venue) => !venue.archived && venue.membership_role === 'owner')
}

/** Platform super admin — system control only, never a venue operator. */
export function isPlatformAdmin(isAdmin: boolean | undefined): boolean {
  return isAdmin === true
}

/** Where to send the user right after login (owners → dashboard, staff → scanner, guests → card). */
export function resolveAuthenticatedHomePath(
  isAdmin: boolean | undefined,
  activeVenues: Venue[],
  effectiveVenueId: number | null,
): string {
  if (isPlatformAdmin(isAdmin)) {
    return ADMIN_HOME_PATH
  }

  const active = activeVenues.filter((venue) => !venue.archived)

  if (active.some((venue) => venue.membership_role === 'owner')) {
    return '/dashboard'
  }

  if (isStaffOnlyMember(active) || active.some((venue) => venue.membership_role === 'staff')) {
    return staffScannerPath(effectiveVenueId)
  }

  if (active.length > 0) {
    return '/dashboard'
  }

  return '/wallet'
}

/** New owners without a venue yet should not be sent to the customer card. */
export function ownerBootstrapPath(
  isAdmin: boolean | undefined,
  activeVenues: Venue[],
  effectiveVenueId: number | null,
): string {
  const home = resolveAuthenticatedHomePath(isAdmin, activeVenues, effectiveVenueId)

  if (home === '/wallet' && hasOwnerOnboardingIntent()) {
    return OWNER_ONBOARDING_PATH
  }

  return home
}

/** Honors an explicit redirect unless it would send a venue owner/staff to the customer card by mistake. */
export function resolvePostLoginDestination(
  redirect: string | null | undefined,
  isAdmin: boolean | undefined,
  activeVenues: Venue[],
  effectiveVenueId: number | null,
): string {
  const home = resolveAuthenticatedHomePath(isAdmin, activeVenues, effectiveVenueId)
  const hasTeam = hasTeamMembership(activeVenues)

  if (!redirect) {
    return hasTeam ? home : ownerBootstrapPath(isAdmin, activeVenues, effectiveVenueId)
  }

  const safe = isSafeInternalRedirect(redirect) ? redirect : home

  if ((safe === '/card' || safe === '/wallet' || safe.startsWith('/card?') || safe.startsWith('/wallet?')) && home !== '/wallet') {
    return home
  }

  if (isPlatformAdmin(isAdmin)) {
    return safe.startsWith('/admin/') ? safe : ADMIN_HOME_PATH
  }

  if (isOwnerWorkspacePath(safe) && !hasTeam && hasOwnerOnboardingIntent()) {
    return OWNER_ONBOARDING_PATH
  }

  return safe
}
