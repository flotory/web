<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError } from '@/lib/api'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Venue } from '@/types'

type TeamMember = {
  id: number
  venue_id: number
  user_id: number
  role: 'owner' | 'manager' | 'staff'
  user: { id: number; name: string; email: string }
}

const workspace = useWorkspaceStore()
const venue = ref<Venue | null>(null)
const members = ref<TeamMember[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const inviteEmail = ref('')
const inviteName = ref('')
const inviteRole = ref<'manager' | 'staff'>('staff')

const owners = computed(() => members.value.filter((member) => member.role === 'owner'))
const others = computed(() => members.value.filter((member) => member.role !== 'owner'))

const needsVenuePick = computed(
  () => workspace.activeVenues.length > 1 && workspace.effectiveVenueId === null,
)

async function load() {
  loading.value = true
  error.value = ''

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

async function invite() {
  const venueId = workspace.effectiveVenueId
  if (!venueId) return

  saving.value = true
  error.value = ''

  try {
    const response = await api<{ member: TeamMember }>(`/venues/${venueId}/team/invite`, {
      method: 'POST',
      body: {
        email: inviteEmail.value,
        name: inviteName.value || undefined,
        role: inviteRole.value,
      },
    })

    members.value = [...members.value.filter((item) => item.user_id !== response.member.user_id), response.member].sort((a, b) => a.role.localeCompare(b.role))
    inviteEmail.value = ''
    inviteName.value = ''
    inviteRole.value = 'staff'
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not invite team member.'
  } finally {
    saving.value = false
  }
}

async function removeMember(member: TeamMember) {
  const venueId = workspace.effectiveVenueId
  if (!venueId) return

  saving.value = true
  error.value = ''

  try {
    await api<void>(`/venues/${venueId}/team/${member.user_id}`, { method: 'DELETE' })
    members.value = members.value.filter((item) => item.user_id !== member.user_id)
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not remove team member.'
  } finally {
    saving.value = false
  }
}

watch(() => workspace.filterVenueId, load)

onMounted(load)
</script>

<template>
  <AppShell>
    <div class="mb-6">
      <AppBadge tone="blue">Team access</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Team</h1>
      <p class="mt-2 text-slate-500">
        {{ venue ? `Managing team for ${venue.name}.` : 'Pick a venue in the sidebar filter to manage its team.' }}
      </p>
    </div>

    <AppCard v-if="loading">
      <p class="text-sm font-bold text-slate-500">Loading team...</p>
    </AppCard>

    <AppCard v-else-if="error">
      <p class="text-sm font-bold text-red-600">{{ error }}</p>
      <AppButton class="mt-4" variant="secondary" @click="load">Retry</AppButton>
    </AppCard>

    <AppCard v-else-if="needsVenuePick">
      <p class="text-sm font-bold text-slate-500">Select a specific venue in the filter above to manage its team.</p>
    </AppCard>

    <div v-else class="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <AppCard>
        <h2 class="text-xl font-black text-slate-950">Invite staff</h2>
        <p class="mt-2 text-sm font-semibold text-slate-500">Creates or attaches a user account to this venue.</p>

        <form class="mt-5 grid gap-3" @submit.prevent="invite">
          <div>
            <label class="text-sm font-bold text-slate-600" for="invite-email">Email</label>
            <input
              id="invite-email"
              v-model="inviteEmail"
              required
              type="email"
              class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white"
              placeholder="staff@venue.com"
            >
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="invite-name">Name optional</label>
            <input
              id="invite-name"
              v-model="inviteName"
              class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white"
              placeholder="Alex"
            >
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="invite-role">Role</label>
            <select
              id="invite-role"
              v-model="inviteRole"
              class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white"
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <AppButton type="submit" :disabled="saving">{{ saving ? 'Inviting...' : 'Invite' }}</AppButton>
        </form>
      </AppCard>

      <AppCard>
        <h2 class="text-xl font-black text-slate-950">Members</h2>
        <div class="mt-5 space-y-2">
          <div v-for="member in owners" :key="member.id" class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div>
              <p class="font-black text-slate-950">{{ member.user.name }}</p>
              <p class="text-sm font-semibold text-slate-500">{{ member.user.email }}</p>
            </div>
            <AppBadge tone="green">Owner</AppBadge>
          </div>

          <div v-for="member in others" :key="member.id" class="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div>
              <p class="font-black text-slate-950">{{ member.user.name }}</p>
              <p class="text-sm font-semibold text-slate-500">{{ member.user.email }}</p>
            </div>
            <div class="flex items-center gap-2">
              <AppBadge :tone="member.role === 'manager' ? 'blue' : 'slate'">{{ member.role }}</AppBadge>
              <AppButton variant="ghost" size="sm" :disabled="saving" @click="removeMember(member)">Remove</AppButton>
            </div>
          </div>

          <p v-if="!members.length" class="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
            No team members yet.
          </p>
        </div>
      </AppCard>
    </div>
  </AppShell>
</template>
