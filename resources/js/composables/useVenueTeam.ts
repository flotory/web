import { computed, ref } from 'vue'

import { api, ApiError } from '@/lib/api'
import {
  teamInviteLoginUrl,
  teamInviteMessage,
  type CredentialsReveal,
  type TeamMember,
} from '@/lib/team'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Venue } from '@/types'

export function useVenueTeam() {
  const workspace = useWorkspaceStore()

  const venue = ref<Venue | null>(null)
  const members = ref<TeamMember[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const statusNote = ref('')
  const credentialsReveal = ref<CredentialsReveal | null>(null)

  const owners = computed(() => members.value.filter((member) => member.role === 'owner'))
  const staffMembers = computed(() => members.value.filter((member) => member.role === 'staff'))
  const needsVenuePick = computed(
    () => workspace.activeVenues.length > 1 && workspace.effectiveVenueId === null,
  )

  function showCredentials(member: TeamMember, temporaryPassword: string) {
    credentialsReveal.value = {
      member,
      temporaryPassword,
      loginUrl: teamInviteLoginUrl(member),
    }
    statusNote.value = ''
  }

  function dismissCredentials() {
    credentialsReveal.value = null
  }

  async function copyCredentialsBundle() {
    if (!credentialsReveal.value) return

    const { member, temporaryPassword } = credentialsReveal.value

    try {
      await navigator.clipboard.writeText(teamInviteMessage(member, venue.value, temporaryPassword))
      statusNote.value = 'Copied to clipboard. Send it to your staff member now.'
    } catch {
      statusNote.value = 'Could not copy automatically. Select and copy the password below.'
    }
  }

  async function shareStaffCredentials(member: TeamMember, temporaryPassword: string) {
    showCredentials(member, temporaryPassword)
    await navigator.clipboard.writeText(teamInviteMessage(member, venue.value, temporaryPassword)).catch(() => undefined)
  }

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
        return
      }

      venue.value = workspace.activeVenues.find((item) => item.id === venueId) ?? null
      members.value = (await api<{ members: TeamMember[] }>(`/venues/${venueId}/team`)).members
    } catch (exception) {
      error.value = exception instanceof ApiError ? exception.message : 'Could not load team.'
    } finally {
      loading.value = false
    }
  }

  async function resetStaffPassword(member: TeamMember) {
    const venueId = workspace.effectiveVenueId
    if (!venueId) return

    saving.value = true
    error.value = ''
    statusNote.value = ''

    try {
      const response = await api<{ member: TeamMember; temporary_password: string }>(
        `/venues/${venueId}/team/${member.user_id}/reset-password`,
        { method: 'POST' },
      )

      await shareStaffCredentials(response.member, response.temporary_password)
    } catch (exception) {
      error.value = exception instanceof ApiError ? exception.message : 'Could not reset password.'
    } finally {
      saving.value = false
    }
  }

  async function copyInviteLink(member: TeamMember) {
    try {
      await navigator.clipboard.writeText(teamInviteLoginUrl(member))
      statusNote.value = `Login link copied for ${member.user.name}.`
    } catch {
      statusNote.value = 'Could not copy link.'
    }
  }

  return {
    venue,
    members,
    loading,
    saving,
    error,
    statusNote,
    credentialsReveal,
    owners,
    staffMembers,
    needsVenuePick,
    loadTeam,
    resetStaffPassword,
    shareStaffCredentials,
    dismissCredentials,
    copyCredentialsBundle,
    copyInviteLink,
  }
}
