<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'

import StaffCredentialsBanner from '@/components/team/StaffCredentialsBanner.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { useVenueTeam } from '@/composables/useVenueTeam'
import { useWorkspaceStore } from '@/stores/workspace'

type SettingsTab = 'venues' | 'staff'

const route = useRoute()
const router = useRouter()
const workspace = useWorkspaceStore()

const {
  venue,
  loading,
  saving,
  error,
  statusNote,
  credentialsReveal,
  staffMembers,
  needsVenuePick,
  loadTeam,
  resetStaffPassword,
  dismissCredentials,
  copyCredentialsBundle,
  copyInviteLink,
} = useVenueTeam()

const activeTab = ref<SettingsTab>(route.query.tab === 'staff' ? 'staff' : 'venues')

const ownerVenues = computed(() => workspace.activeVenues.filter((item) => item.membership_role === 'owner'))

const settingsTabs: Array<{ id: SettingsTab; label: string }> = [
  { id: 'venues', label: 'Venues' },
  { id: 'staff', label: 'Staff passwords' },
]

function selectTab(tab: SettingsTab) {
  activeTab.value = tab
  void router.replace({ query: tab === 'venues' ? {} : { tab } })
}

watch(
  () => route.query.tab,
  (tab) => {
    activeTab.value = tab === 'staff' ? 'staff' : 'venues'
  },
)

watch(
  () => [activeTab.value, workspace.filterVenueId],
  () => {
    if (activeTab.value === 'staff') {
      void loadTeam()
    }
  },
)

onMounted(async () => {
  await workspace.bootstrap()
  if (activeTab.value === 'staff') {
    await loadTeam()
  }
})
</script>

<template>
  <AppShell>
    <div class="mb-6">
      <AppBadge tone="blue">Workspace settings</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Settings</h1>
      <p class="mt-2 text-slate-500">Venue details and staff login access.</p>
    </div>

    <div class="mb-5 flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1.5 ring-1 ring-slate-200">
      <button
        v-for="tab in settingsTabs"
        :key="tab.id"
        type="button"
        class="rounded-xl px-4 py-2.5 text-sm font-black transition"
        :class="activeTab === tab.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'staff' && credentialsReveal" class="mb-5">
      <StaffCredentialsBanner
        :reveal="credentialsReveal"
        :status-note="statusNote"
        @dismiss="dismissCredentials"
        @copy="copyCredentialsBundle"
      />
    </div>

    <AppCard v-if="activeTab === 'venues'">
      <h2 class="text-xl font-black text-slate-950">Your venues</h2>
      <p class="mt-2 text-sm font-semibold text-slate-500">Logo, address, QR codes, and loyalty setup per venue.</p>
      <div class="mt-4 space-y-2">
        <div
          v-for="item in ownerVenues"
          :key="item.id"
          class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
        >
          <div>
            <p class="font-black text-slate-950">{{ item.name }}</p>
            <p class="text-sm font-semibold text-slate-500">/{{ item.slug }}</p>
          </div>
          <AppButton variant="secondary" size="sm" @click="router.push(`/my-venues/${item.id}/settings`)">
            Edit venue
          </AppButton>
        </div>
        <p v-if="!ownerVenues.length" class="text-sm font-semibold text-slate-500">No venues yet.</p>
      </div>
    </AppCard>

    <template v-else>
      <AppCard v-if="loading">
        <p class="text-sm font-bold text-slate-500">Loading staff...</p>
      </AppCard>

      <AppCard v-else-if="error">
        <p class="text-sm font-bold text-red-600">{{ error }}</p>
        <AppButton class="mt-4" variant="secondary" @click="loadTeam">Retry</AppButton>
      </AppCard>

      <AppCard v-else-if="needsVenuePick">
        <p class="text-sm font-bold text-slate-500">Select a venue in the sidebar filter to manage staff passwords.</p>
      </AppCard>

      <div v-else class="grid gap-5">
        <AppCard>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-xl font-black text-slate-950">Staff passwords</h2>
              <p class="mt-2 text-sm font-semibold text-slate-500">
                {{ venue ? `Reset login access for ${venue.name}.` : 'Reset staff login access.' }}
              </p>
            </div>
            <RouterLink to="/team">
              <AppButton variant="secondary" size="sm">Invite staff on Team page</AppButton>
            </RouterLink>
          </div>

          <p class="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
            Reset password generates a new one-time login password. Share it using the amber banner above.
          </p>
        </AppCard>

        <AppCard>
          <div class="space-y-2">
            <div
              v-for="member in staffMembers"
              :key="member.id"
              class="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
            >
              <div>
                <p class="font-black text-slate-950">{{ member.user.name }}</p>
                <p class="text-sm font-semibold text-slate-500">{{ member.user.email }}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <AppButton variant="secondary" size="sm" :disabled="saving" @click="resetStaffPassword(member)">
                  Reset password
                </AppButton>
                <AppButton variant="ghost" size="sm" :disabled="saving" @click="copyInviteLink(member)">
                  Copy login link
                </AppButton>
              </div>
            </div>

            <p v-if="!staffMembers.length" class="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
              No staff yet.
              <RouterLink to="/team" class="font-black text-slate-950 underline">Invite staff</RouterLink>
              to get started.
            </p>
          </div>
        </AppCard>
      </div>
    </template>
  </AppShell>
</template>
