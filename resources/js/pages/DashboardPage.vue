<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import AppShell from '@/layouts/AppShell.vue'
import StatCard from '@/components/loyalty/StatCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { api } from '@/lib/api'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Customer, Venue } from '@/types'

interface DashboardResponse {
  scope: 'all' | 'venue' | 'none'
  venue: Pick<Venue, 'id' | 'name' | 'slug'> | null
  venues_count: number
  stats: {
    total_customers: number
    repeat_customers: number
    total_visits: number
    rewards_redeemed: number
  }
  most_loyal_customers: Customer[]
  monthly_activity: Array<{ month: string; visits: number }>
  venue_summaries: Array<{
    venue_id: number
    venue_name: string
    stats: DashboardResponse['stats']
  }>
}

const router = useRouter()
const workspace = useWorkspaceStore()
const dashboard = ref<DashboardResponse | null>(null)
const loading = ref(true)
const error = ref('')

const title = computed(() => {
  if (dashboard.value?.scope === 'venue' && dashboard.value.venue) {
    return dashboard.value.venue.name
  }

  if (workspace.filterVenueId && workspace.filteredVenue) {
    return workspace.filteredVenue.name
  }

  return 'All venues'
})

const stats = computed(() => [
  { label: 'Total customers', value: dashboard.value?.stats.total_customers ?? 0 },
  { label: 'Repeat customers', value: dashboard.value?.stats.repeat_customers ?? 0 },
  { label: 'Total visits', value: dashboard.value?.stats.total_visits ?? 0 },
  { label: 'Rewards redeemed', value: dashboard.value?.stats.rewards_redeemed ?? 0 },
])

async function loadDashboard() {
  loading.value = true
  error.value = ''

  try {
    await workspace.bootstrap()

    if (!workspace.hasMembership) {
      await router.push('/onboarding')
      return
    }

    const query = workspace.filterVenueId ? `?venue_id=${workspace.filterVenueId}` : ''
    dashboard.value = await api<DashboardResponse>(`/dashboard${query}`)
  } catch {
    error.value = 'Could not load dashboard data.'
  } finally {
    loading.value = false
  }
}

watch(() => workspace.filterVenueId, loadDashboard)

onMounted(loadDashboard)
</script>

<template>
  <AppShell>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <AppBadge tone="blue">{{ dashboard?.scope === 'all' ? 'All venues' : 'Venue dashboard' }}</AppBadge>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">{{ title }}</h1>
        <p class="mt-2 text-slate-500">
          {{ dashboard?.scope === 'all' ? 'Combined loyalty metrics across your venues.' : 'A fast snapshot of retention and loyalty activity.' }}
        </p>
      </div>
      <RouterLink to="/scanner" class="rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white shadow-lg shadow-slate-950/15">
        Open scanner
      </RouterLink>
    </div>

    <AppCard v-if="loading" wrapper-class="mb-4">
      <p class="text-sm font-bold text-slate-500">Loading dashboard...</p>
    </AppCard>
    <AppCard v-else-if="error" wrapper-class="mb-4">
      <p class="text-sm font-bold text-red-600">{{ error }}</p>
    </AppCard>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard v-for="stat in stats" :key="stat.label" v-bind="stat" />
    </div>

    <AppCard v-if="dashboard?.venue_summaries?.length" wrapper-class="mt-6">
      <h2 class="text-xl font-black text-slate-950">By venue</h2>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <div
          v-for="summary in dashboard.venue_summaries"
          :key="summary.venue_id"
          class="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
        >
          <p class="font-black text-slate-950">{{ summary.venue_name }}</p>
          <p class="mt-2 text-sm font-semibold text-slate-500">
            {{ summary.stats.total_customers }} customers · {{ summary.stats.total_visits }} visits
          </p>
        </div>
      </div>
    </AppCard>

    <div class="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <AppCard>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-black text-slate-950">Monthly activity</h2>
            <p class="text-sm text-slate-500">Visits trend for the last 12 months.</p>
          </div>
        </div>
        <div class="mt-6 flex h-56 items-end gap-3">
          <div v-for="activity in dashboard?.monthly_activity ?? []" :key="activity.month" class="flex flex-1 flex-col items-center gap-3">
            <div class="w-full rounded-t-2xl bg-gradient-to-t from-blue-600 to-blue-300" :style="{ height: `${Math.max(activity.visits * 18, 12)}%` }" />
            <span class="text-xs font-bold text-slate-400">{{ activity.month.slice(5) }}</span>
          </div>
          <p v-if="!dashboard?.monthly_activity?.length" class="text-sm font-semibold text-slate-500">No visits yet.</p>
        </div>
      </AppCard>

      <AppCard>
        <h2 class="text-xl font-black text-slate-950">Most loyal customers</h2>
        <div class="mt-5 space-y-3">
          <div v-for="customer in dashboard?.most_loyal_customers ?? []" :key="customer.id" class="flex items-center justify-between rounded-2xl bg-slate-100 p-4">
            <div>
              <p class="font-bold text-slate-950">{{ customer.user?.name ?? 'Customer' }}</p>
              <p class="text-sm text-slate-500">{{ customer.user?.email }}</p>
              <p v-if="customer.venue?.name && dashboard?.scope === 'all'" class="mt-1 text-xs font-bold text-slate-400">{{ customer.venue.name }}</p>
            </div>
            <AppBadge tone="amber">{{ customer.stamps }} stamps</AppBadge>
          </div>
          <p v-if="!dashboard?.most_loyal_customers?.length" class="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-500">
            No customers yet.
          </p>
        </div>
      </AppCard>
    </div>
  </AppShell>
</template>
