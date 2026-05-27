<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import StatCard from '@/components/loyalty/StatCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api } from '@/lib/api'
import { useWorkspaceStore } from '@/stores/workspace'

interface DashboardResponse {
  stats: {
    total_customers: number
    active_progressors: number
    total_visits: number
    milestones_claimed: number
    milestones_unlocked: number
    cycles_completed: number
  }
  monthly_activity: Array<{ month: string; visits: number }>
}

const workspace = useWorkspaceStore()
const dashboard = ref<DashboardResponse | null>(null)
const loading = ref(true)
const error = ref('')

const stats = computed(() => {
  const data = dashboard.value?.stats
  if (!data) {
    return []
  }

  const progressionRate = data.total_customers > 0 ? Math.round((data.active_progressors / data.total_customers) * 100) : 0
  const avgVisits = data.total_customers > 0 ? (data.total_visits / data.total_customers).toFixed(1) : '0'

  return [
    { label: 'Progression rate', value: `${progressionRate}%`, hint: `${data.active_progressors} active progressors` },
    { label: 'Avg visits/customer', value: avgVisits, hint: 'across selected scope' },
    { label: 'Monthly visits', value: data.total_visits, hint: 'total recorded' },
    { label: 'Milestones claimed', value: data.milestones_claimed, hint: `${data.milestones_unlocked} unlocked` },
  ]
})

async function load() {
  loading.value = true
  error.value = ''

  try {
    await workspace.bootstrap()
    const query = workspace.filterVenueId ? `?venue_id=${workspace.filterVenueId}` : ''
    dashboard.value = await api<DashboardResponse>(`/dashboard${query}`)
  } catch {
    error.value = 'Could not load analytics.'
  } finally {
    loading.value = false
  }
}

watch(() => workspace.filterVenueId, load)

onMounted(load)
</script>

<template>
  <AppShell>
    <div class="mb-6">
      <AppBadge tone="green">Analytics</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Retention insights</h1>
      <p class="mt-2 text-slate-500">Numbers you can act on — filtered by venue when needed.</p>
    </div>

    <AppCard v-if="loading" wrapper-class="mb-4">
      <p class="text-sm font-bold text-slate-500">Loading analytics...</p>
    </AppCard>
    <AppCard v-else-if="error" wrapper-class="mb-4">
      <p class="text-sm font-bold text-red-600">{{ error }}</p>
    </AppCard>

    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard v-for="stat in stats" :key="stat.label" v-bind="stat" />
    </div>

    <AppCard wrapper-class="mt-6">
      <h2 class="text-xl font-black text-slate-950">Monthly activity</h2>
      <div class="mt-6 grid gap-3">
        <div v-for="activity in dashboard?.monthly_activity ?? []" :key="activity.month" class="flex items-center gap-4">
          <span class="w-14 text-sm font-bold text-slate-500">{{ activity.month }}</span>
          <div class="h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              class="h-full rounded-full bg-blue-600"
              :style="{ width: `${Math.min(100, Math.max(8, activity.visits * 4))}%` }"
            />
          </div>
          <span class="w-10 text-right text-sm font-bold text-slate-500">{{ activity.visits }}</span>
        </div>
        <p v-if="!dashboard?.monthly_activity?.length" class="text-sm font-semibold text-slate-500">No visits yet.</p>
      </div>
    </AppCard>
  </AppShell>
</template>
