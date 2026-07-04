import type { Router } from 'vue-router'

import {
  BOOK_DEMO_PATH,
  hasOwnerMembership,
  OWNER_VENUE_SETUP_PATH,
  resolvePostLoginDestination,
} from '@/lib/venueRoles'
import type { useAuthStore } from '@/stores/auth'
import type { useWorkspaceStore } from '@/stores/workspace'

type AuthStore = ReturnType<typeof useAuthStore>
type WorkspaceStore = ReturnType<typeof useWorkspaceStore>

export function isLoginCancelledError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Login cancelled'
}

export function resolveOwnerPostAuthDestination(auth: AuthStore, workspace: WorkspaceStore): string {
  if (hasOwnerMembership(workspace.activeVenues)) {
    return '/dashboard'
  }

  if (auth.mayCreateVenue) {
    return OWNER_VENUE_SETUP_PATH
  }

  return BOOK_DEMO_PATH
}

export async function completeSignInNavigation(options: {
  auth: AuthStore
  workspace: WorkspaceStore
  router: Router
  sessionEpoch: number
  intent?: 'owner' | null
  redirect?: string | null
}): Promise<boolean> {
  const { auth, workspace, router, sessionEpoch, intent = null, redirect = null } = options

  if (!auth.isSessionCurrent(sessionEpoch)) {
    return false
  }

  await workspace.bootstrap(true)

  if (!auth.isSessionCurrent(sessionEpoch)) {
    return false
  }

  const destination = intent === 'owner'
    ? resolveOwnerPostAuthDestination(auth, workspace)
    : resolvePostLoginDestination(
      redirect,
      auth.user?.is_admin,
      workspace.activeVenues,
      workspace.effectiveVenueId,
      auth.mayCreateVenue,
    )

  if (!auth.isSessionCurrent(sessionEpoch)) {
    return false
  }

  await router.replace(destination)
  return true
}
