<script setup lang="ts">
import { History, Mail, Store, Users } from '@lucide/vue'
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AppShell from '@/layouts/AppShell.vue'
import { useVenueTeam } from '@/composables/useVenueTeam'
import { api, ApiError } from '@/lib/api'
import {
  formatInvitationWhen,
  invitationStatusLabel,
  invitationStatusTone,
  type StaffInvitation,
  type TeamMember,
} from '@/lib/team'
import { useWorkspaceStore } from '@/stores/workspace'

const workspace = useWorkspaceStore()

const {
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
} = useVenueTeam()

const inviteEmail = ref('')
const inviteAction = useAsyncAction()

async function invite() {
  const venueId = venue.value?.id
  if (!venueId) return

  try {
    await inviteAction.run(async () => {
      error.value = ''
      statusNote.value = ''

      try {
        const response = await api<{ invitation: StaffInvitation }>(`/venues/${venueId}/team/invite`, {
          method: 'POST',
          body: {
            email: inviteEmail.value,
            role: 'staff',
          },
        })

        replaceInvitation(response.invitation)
        inviteEmail.value = ''
        statusNote.value = `Invitation sent to ${response.invitation.email}.`
      } catch (exception) {
        error.value = exception instanceof ApiError ? exception.message : 'Could not send invitation.'
        throw exception
      }
    })
  } catch {
    // Button shows Failed.
  }
}

async function resendInvitation(invitation: StaffInvitation) {
  const venueId = venue.value?.id
  if (!venueId) {
    throw new Error('Venue not selected')
  }

  error.value = ''

  try {
    const response = await api<{ invitation: StaffInvitation }>(
      `/venues/${venueId}/team/invitations/${invitation.id}/resend`,
      { method: 'POST' },
    )

    replaceInvitation(response.invitation)
    statusNote.value = `Invitation resent to ${response.invitation.email}.`
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not resend invitation.'
    throw exception
  }
}

async function cancelInvitation(invitation: StaffInvitation) {
  const venueId = venue.value?.id
  if (!venueId) return

  saving.value = true
  error.value = ''

  try {
    const response = await api<{ invitation: StaffInvitation }>(
      `/venues/${venueId}/team/invitations/${invitation.id}`,
      { method: 'DELETE' },
    )

    replaceInvitation(response.invitation)
    statusNote.value = `Invitation to ${response.invitation.email} cancelled.`
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not cancel invitation.'
  } finally {
    saving.value = false
  }
}

async function removeMember(member: TeamMember) {
  const venueId = venue.value?.id
  if (!venueId) return

  saving.value = true
  error.value = ''

  try {
    await api<void>(`/venues/${venueId}/team/${member.user_id}`, { method: 'DELETE' })
    members.value = members.value.filter((item) => item.user_id !== member.user_id)
    statusNote.value = `${member.user.name} removed from the team.`
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not remove team member.'
  } finally {
    saving.value = false
  }
}

watch(() => workspace.filterVenueId, loadTeam)

onMounted(loadTeam)
</script>

<template>
  <AppShell>
    <div class="mb-6">
      <AppBadge tone="blue">Team access</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Team</h1>
      <p class="mt-2 text-slate-500">
        {{ venue ? `Invite and manage staff for ${venue.name}.` : 'Pick a venue in the sidebar filter to manage its team.' }}
      </p>
    </div>

    <AppCard v-if="loading">
      <EmptyState compact title="Loading team…" />
    </AppCard>

    <ErrorState
      v-else-if="error && !members.length && !pendingInvitations.length"
      :message="error"
      @retry="loadTeam"
    />

    <EmptyState
      v-else-if="needsVenuePick"
      :icon="Store"
      title="Select a venue"
      description="Pick a specific venue in the sidebar filter to manage its team."
    />

    <template v-else>
      <p v-if="statusNote" class="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100">
        {{ statusNote }}
      </p>
      <p v-if="error" class="mb-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
        {{ error }}
      </p>

      <div class="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <AppCard>
          <h2 class="text-xl font-black text-slate-950">Invite staff member</h2>
          <p class="mt-2 text-sm font-semibold text-slate-500">
            We email a secure link. They create an account or sign in, then join your venue.
          </p>

          <form class="mt-5 grid gap-3" @submit.prevent="invite">
            <div>
              <label class="text-sm font-bold text-slate-600" for="invite-email">Email</label>
              <input
                id="invite-email"
                v-model="inviteEmail"
                required
                type="email"
                class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-950 outline-none focus:border-slate-400 focus:bg-white"
                placeholder="staff@venue.com"
              >
            </div>
            <div class="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <p class="text-sm font-bold text-slate-700">Role: Staff</p>
              <p class="mt-1 text-xs font-semibold text-slate-500">Scanner and customer tools only.</p>
            </div>
            <AsyncActionButton
              type="submit"
              idle-label="Invite staff member"
              loading-label="Sending…"
              success-label="Sent ✓"
              :loading="inviteAction.loading"
              :success="inviteAction.success"
              :error="inviteAction.error"
            />
          </form>
        </AppCard>

        <div class="space-y-5">
          <AppCard>
            <h2 class="text-xl font-black text-slate-950">Active team members</h2>
            <div class="mt-5 space-y-2">
              <div v-for="member in owners" :key="member.id" class="flex items-center justify-between gap-4 rounded-2xl bg-emerald-50/80 p-4 ring-1 ring-emerald-100">
                <div>
                  <p class="font-black text-slate-950">{{ member.user.name }}</p>
                  <p class="text-sm font-semibold text-slate-500">{{ member.user.email }}</p>
                </div>
                <AppBadge tone="green">Owner</AppBadge>
              </div>

              <div v-for="member in staffMembers" :key="member.id" class="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <div>
                  <p class="font-black text-slate-950">{{ member.user.name }}</p>
                  <p class="text-sm font-semibold text-slate-500">{{ member.user.email }}</p>
                  <p v-if="member.created_at" class="mt-1 text-xs font-semibold text-slate-400">
                    Joined {{ formatInvitationWhen(member.created_at) }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <AppBadge tone="slate">Staff</AppBadge>
                  <AppButton variant="ghost" size="sm" :disabled="saving" @click="removeMember(member)">
                    Remove
                  </AppButton>
                </div>
              </div>

              <EmptyState
                v-if="!staffMembers.length && !owners.length"
                bare
                compact
                bordered
                :icon="Users"
                title="No team members yet"
                description="Invite staff below — they'll get scanner and customer tools."
              />
            </div>
          </AppCard>

          <AppCard>
            <h2 class="text-xl font-black text-slate-950">Pending invitations</h2>
            <div class="mt-5 space-y-2">
              <div
                v-for="invitation in pendingInvitations"
                :key="invitation.id"
                class="rounded-2xl bg-amber-50/60 p-4 ring-1 ring-amber-100"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="font-black text-slate-950">{{ invitation.email }}</p>
                    <p class="text-sm font-semibold text-slate-500">
                      Invited by {{ invitation.inviter?.name ?? 'Owner' }}
                    </p>
                    <p class="mt-1 text-xs font-semibold text-slate-400">
                      Sent {{ formatInvitationWhen(invitation.created_at) }}
                    </p>
                  </div>
                  <AppBadge :tone="invitationStatusTone(invitation.status)">
                    {{ invitationStatusLabel(invitation.status) }}
                  </AppBadge>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <AsyncActionButton
                    variant="secondary"
                    size="sm"
                    idle-label="Resend invitation"
                    loading-label="Sending…"
                    success-label="Sent ✓"
                    :action="() => resendInvitation(invitation)"
                  />
                  <AppButton variant="ghost" size="sm" :disabled="saving" @click="cancelInvitation(invitation)">
                    Cancel
                  </AppButton>
                </div>
              </div>

              <EmptyState
                v-if="!pendingInvitations.length"
                bare
                compact
                bordered
                :icon="Mail"
                title="No pending invitations"
                description="Invitations you send will appear here until accepted."
              />
            </div>
          </AppCard>

          <AppCard>
            <h2 class="text-xl font-black text-slate-950">Invitation history</h2>
            <div class="mt-5 space-y-2">
              <div
                v-for="invitation in invitationHistory"
                :key="invitation.id"
                class="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="font-black text-slate-950">{{ invitation.email }}</p>
                    <p class="text-sm font-semibold text-slate-500">
                      Invited by {{ invitation.inviter?.name ?? 'Owner' }}
                    </p>
                    <p class="mt-1 text-xs font-semibold text-slate-400">
                      Sent {{ formatInvitationWhen(invitation.created_at) }}
                      <span v-if="invitation.accepted_at"> · Accepted {{ formatInvitationWhen(invitation.accepted_at) }}</span>
                    </p>
                  </div>
                  <AppBadge :tone="invitationStatusTone(invitation.status)">
                    {{ invitationStatusLabel(invitation.status) }}
                  </AppBadge>
                </div>
                <AsyncActionButton
                  v-if="invitation.status === 'expired'"
                  class="mt-3"
                  variant="secondary"
                  size="sm"
                  idle-label="Resend invitation"
                  loading-label="Sending…"
                  success-label="Sent ✓"
                  :action="() => resendInvitation(invitation)"
                />
              </div>

              <EmptyState
                v-if="!invitationHistory.length"
                bare
                compact
                bordered
                :icon="History"
                title="No invitation history"
                description="Past invitations will appear here once you start inviting staff."
              />
            </div>
          </AppCard>
        </div>
      </div>
    </template>
  </AppShell>
</template>
