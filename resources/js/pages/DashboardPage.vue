<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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
    active_progressors: number
    total_visits: number
    milestones_claimed: number
    milestones_unlocked: number
    cycles_completed: number
  }
  most_loyal_customers: Customer[]
  monthly_activity: Array<{ month: string; visits: number }>
  milestone_conversions: Array<{
    reward_id: number
    title: string
    required_stamps: number
    unlocked_count: number
    claimed_count: number
    claim_rate: number
    venue_id?: number
    venue_name?: string
  }>
  venue_summaries: Array<{
    venue_id: number
    venue_name: string
    stats: DashboardResponse['stats']
  }>
}

const router = useRouter()
const route = useRoute()
const workspace = useWorkspaceStore()
const dashboard = ref<DashboardResponse | null>(null)
const loading = ref(true)
const error = ref('')
const success = ref('')

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
  { label: 'Active progressors', value: dashboard.value?.stats.active_progressors ?? 0 },
  { label: 'Total visits', value: dashboard.value?.stats.total_visits ?? 0 },
  { label: 'Milestones claimed', value: dashboard.value?.stats.milestones_claimed ?? 0 },
])

const conversionOverview = computed(() => {
  const rows = dashboard.value?.milestone_conversions ?? []
  const unlocked = rows.reduce((sum, row) => sum + row.unlocked_count, 0)
  const claimed = rows.reduce((sum, row) => sum + row.claimed_count, 0)
  const rate = unlocked > 0 ? Math.round((claimed / unlocked) * 1000) / 10 : 0
  return { unlocked, claimed, rate }
})

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

onMounted(() => {
  if (route.query.onboarding === 'completed') {
    success.value = 'Your loyalty system is live.'
    void router.replace({ query: { ...route.query, onboarding: undefined } })
  }
})
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
    <AppCard v-else-if="success" wrapper-class="mb-4 border-emerald-200 bg-emerald-50">
      <p class="text-sm font-bold text-emerald-700">{{ success }}</p>
    </AppCard>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard v-for="stat in stats" :key="stat.label" v-bind="stat" />
    </div>

    <div class="mt-4 grid gap-4 sm:grid-cols-3">
      <StatCard label="Milestones unlocked" :value="conversionOverview.unlocked" />
      <StatCard label="Milestones claimed" :value="conversionOverview.claimed" />
      <StatCard label="Claim rate" :value="`${conversionOverview.rate}%`" />
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
            <p class="text-sm text-slate-500">Count of recorded visits (stamp events) by month for the selected venue scope.</p>
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

    <AppCard wrapper-class="mt-6">
      <h2 class="text-xl font-black text-slate-950">Milestone conversion</h2>
      <p class="mt-1 text-sm text-slate-500">Unlock-to-claim performance for each milestone.</p>
      <div class="mt-4 overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th class="px-2 py-2">Milestone</th>
              <th class="px-2 py-2">Visits</th>
              <th class="px-2 py-2">Unlocked</th>
              <th class="px-2 py-2">Claimed</th>
              <th class="px-2 py-2">Claim rate</th>
              <th v-if="dashboard?.scope === 'all'" class="px-2 py-2">Venue</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in dashboard?.milestone_conversions ?? []"
              :key="`${row.venue_id ?? 'single'}-${row.reward_id}`"
              class="border-b border-slate-100"
            >
              <td class="px-2 py-2 font-semibold text-slate-800">{{ row.title }}</td>
              <td class="px-2 py-2 text-slate-600">{{ row.required_stamps }}</td>
              <td class="px-2 py-2 text-slate-600">{{ row.unlocked_count }}</td>
              <td class="px-2 py-2 text-slate-600">{{ row.claimed_count }}</td>
              <td class="px-2 py-2 font-bold text-slate-900">{{ row.claim_rate }}%</td>
              <td v-if="dashboard?.scope === 'all'" class="px-2 py-2 text-slate-500">{{ row.venue_name }}</td>
            </tr>
            <tr v-if="!(dashboard?.milestone_conversions?.length)">
              <td class="px-2 py-3 text-sm font-semibold text-slate-500" :colspan="dashboard?.scope === 'all' ? 6 : 5">
                No milestone conversion data yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>
  </AppShell>
</template>
