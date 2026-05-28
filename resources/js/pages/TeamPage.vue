<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import StaffCredentialsBanner from '@/components/team/StaffCredentialsBanner.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { useVenueTeam } from '@/composables/useVenueTeam'
import { api, ApiError } from '@/lib/api'
import type { TeamMember } from '@/lib/team'
import { useWorkspaceStore } from '@/stores/workspace'

const workspace = useWorkspaceStore()

const {
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
} = useVenueTeam()

const inviteEmail = ref('')
const inviteName = ref('')

async function invite() {
  const venueId = venue.value?.id
  if (!venueId) return

  saving.value = true
  error.value = ''
  statusNote.value = ''

  try {
    const response = await api<{ member: TeamMember; temporary_password: string }>(`/venues/${venueId}/team/invite`, {
      method: 'POST',
      body: {
        email: inviteEmail.value,
        name: inviteName.value || undefined,
        role: 'staff',
      },
    })

    members.value = [...members.value.filter((item) => item.user_id !== response.member.user_id), response.member].sort((a, b) => a.role.localeCompare(b.role))
    inviteEmail.value = ''
    inviteName.value = ''
    await shareStaffCredentials(response.member, response.temporary_password)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not invite team member.'
  } finally {
    saving.value = false
  }
}

async function removeMember(member: TeamMember) {
  const venueId = venue.value?.id
  if (!venueId) return

  saving.value = true
  error.value = ''
  dismissCredentials()

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

async function resendInvite(member: TeamMember) {
  await resetStaffPassword(member)
}

watch(() => workspace.filterVenueId, loadTeam)

onMounted(loadTeam)
</script>

<template>
  <AppShell>
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <AppBadge tone="blue">Team access</AppBadge>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Team</h1>
        <p class="mt-2 text-slate-500">
          {{ venue ? `Managing team for ${venue.name}.` : 'Pick a venue in the sidebar filter to manage its team.' }}
        </p>
      </div>
      <RouterLink to="/settings?tab=staff">
        <AppButton variant="secondary" size="sm">Staff passwords in Settings</AppButton>
      </RouterLink>
    </div>

    <AppCard v-if="loading">
      <p class="text-sm font-bold text-slate-500">Loading team...</p>
    </AppCard>

    <AppCard v-else-if="error">
      <p class="text-sm font-bold text-red-600">{{ error }}</p>
      <AppButton class="mt-4" variant="secondary" @click="loadTeam">Retry</AppButton>
    </AppCard>

    <AppCard v-else-if="needsVenuePick">
      <p class="text-sm font-bold text-slate-500">Select a specific venue in the filter above to manage its team.</p>
    </AppCard>

    <template v-else>
      <StaffCredentialsBanner
        v-if="credentialsReveal"
        class="mb-5"
        :reveal="credentialsReveal"
        :status-note="statusNote"
        @dismiss="dismissCredentials"
        @copy="copyCredentialsBundle"
      />

      <div class="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <AppCard>
          <h2 class="text-xl font-black text-slate-950">Invite staff</h2>
          <p class="mt-2 text-sm font-semibold text-slate-500">
            Invite staff members who will scan customer visits during service.
          </p>
          <p class="mt-2 text-xs font-semibold text-slate-400">
            A new temporary password is generated every invite. Share it once — they log in, they do not register.
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
            <div>
              <label class="text-sm font-bold text-slate-600" for="invite-name">Name optional</label>
              <input
                id="invite-name"
                v-model="inviteName"
                class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-950 outline-none focus:border-slate-400 focus:bg-white"
                placeholder="Alex"
              >
            </div>
            <div class="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <p class="text-sm font-bold text-slate-700">Role: Staff</p>
              <p class="mt-1 text-xs font-semibold text-slate-500">Staff accounts have limited operational access.</p>
            </div>
            <AppButton type="submit" :disabled="saving">{{ saving ? 'Inviting...' : 'Invite staff' }}</AppButton>
          </form>
        </AppCard>

        <AppCard>
          <h2 class="text-xl font-black text-slate-950">Members</h2>
          <p v-if="statusNote && !credentialsReveal" class="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
            {{ statusNote }}
          </p>
          <div class="mt-5 space-y-2">
            <div v-for="member in owners" :key="member.id" class="flex items-center justify-between gap-4 rounded-2xl bg-emerald-50/80 p-4 ring-1 ring-emerald-100">
              <div>
                <p class="font-black text-slate-950">{{ member.user.name }}</p>
                <p class="text-sm font-semibold text-slate-500">{{ member.user.email }}</p>
              </div>
              <AppBadge tone="green">Owner</AppBadge>
            </div>

            <div v-for="member in staffMembers" :key="member.id" class="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="font-black text-slate-950">{{ member.user.name }}</p>
                  <p class="text-sm font-semibold text-slate-500">{{ member.user.email }}</p>
                </div>
                <AppBadge tone="slate">Staff</AppBadge>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <AppButton variant="secondary" size="sm" :disabled="saving" @click="copyInviteLink(member)">
                  Copy invite link
                </AppButton>
                <AppButton variant="secondary" size="sm" :disabled="saving" @click="resetStaffPassword(member)">
                  Reset password
                </AppButton>
                <AppButton variant="ghost" size="sm" :disabled="saving" @click="resendInvite(member)">
                  Resend invite
                </AppButton>
                <AppButton variant="ghost" size="sm" :disabled="saving" @click="removeMember(member)">
                  Remove
                </AppButton>
              </div>
            </div>

            <p v-if="!members.length" class="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
              No team members yet.
            </p>
          </div>
        </AppCard>
      </div>
    </template>
  </AppShell>
</template>
