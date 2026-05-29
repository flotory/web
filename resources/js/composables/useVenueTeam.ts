import { computed, ref } from 'vue'

import { api, ApiError } from '@/lib/api'
import type { StaffInvitation, TeamMember } from '@/lib/team'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Venue } from '@/types'

export function useVenueTeam() {
  const workspace = useWorkspaceStore()

  const venue = ref<Venue | null>(null)
  const members = ref<TeamMember[]>([])
  const pendingInvitations = ref<StaffInvitation[]>([])
  const invitationHistory = ref<StaffInvitation[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const statusNote = ref('')

  const owners = computed(() => members.value.filter((member) => member.role === 'owner'))
  const staffMembers = computed(() => members.value.filter((member) => member.role === 'staff'))
  const needsVenuePick = computed(
    () => workspace.activeVenues.length > 1 && workspace.effectiveVenueId === null,
  )

  async function loadTeam() {
    loading.value = true
    error.value = ''
    statusNote.value = ''

    try {
      await workspace.bootstrap()
      const venueId = workspace.effectiveVenueId

      if (!venueId) {
        venue.value = null
        members.value = []
        pendingInvitations.value = []
        invitationHistory.value = []
        return
      }

      venue.value = workspace.activeVenues.find((item) => item.id === venueId) ?? null

      const response = await api<{
        members: TeamMember[]
        pending_invitations: StaffInvitation[]
        invitation_history: StaffInvitation[]
      }>(`/venues/${venueId}/team`)

      members.value = response.members
      pendingInvitations.value = response.pending_invitations
      invitationHistory.value = response.invitation_history
    } catch (exception) {
      error.value = exception instanceof ApiError ? exception.message : 'Could not load team.'
    } finally {
      loading.value = false
    }
  }

  function replaceInvitation(updated: StaffInvitation) {
    const lists = [pendingInvitations, invitationHistory] as const

    for (const list of lists) {
      const index = list.value.findIndex((item) => item.id === updated.id)
      if (index >= 0) {
        list.value.splice(index, 1)
      }
    }

    if (updated.status === 'pending') {
      pendingInvitations.value = [updated, ...pendingInvitations.value]
      return
    }

    invitationHistory.value = [updated, ...invitationHistory.value]
  }

  return {
    venue,
    members,
    pendingInvitations,
    invitationHistory,
    loading,
    saving,
    error,
    statusNote,
    owners,
    staffMembers,
    needsVenuePick,
    loadTeam,
    replaceInvitation,
  }
}
