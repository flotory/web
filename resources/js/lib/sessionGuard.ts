import { isUnauthenticatedError } from '@/lib/api'
import type { useAuthStore } from '@/stores/auth'
import type { useWorkspaceStore } from '@/stores/workspace'

type AuthStore = ReturnType<typeof useAuthStore>
type WorkspaceStore = ReturnType<typeof useWorkspaceStore>

export async function bootstrapWorkspaceOrSignOut(
  auth: AuthStore,
  workspace: WorkspaceStore,
): Promise<boolean> {
  if (!auth.token || auth.loggingOut) {
    return true
  }

  try {
    await workspace.bootstrap()
    return true
  } catch (error) {
    if (!isUnauthenticatedError(error)) {
      throw error
    }

    auth.clearSession()
    workspace.$reset()
    return false
  }
}
