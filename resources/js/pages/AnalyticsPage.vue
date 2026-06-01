<script setup lang="ts">
import { BarChart3, Lightbulb, TrendingUp } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import AnalyticsKpiCard from '@/components/loyalty/AnalyticsKpiCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { useWorkspaceStore } from '@/stores/workspace'

interface DashboardInsight {
  text: string
  tone: 'positive' | 'warning' | 'neutral'
}

interface DashboardResponse {
  scope: string
  venue?: { id: number; name: string; slug: string } | null
  stats: {
    active_customers: number
    visits_this_month: number
    rewards_claimed: number
    returning_customers: number
    total_customers: number
    total_visits: number
  }
  monthly_activity: Array<{ month: string; label: string; visits: number }>
  insights: DashboardInsight[]
  has_loyalty_activity: boolean
}

const workspace = useWorkspaceStore()
const dashboard = ref<DashboardResponse | null>(null)
const loading = ref(true)
const error = ref('')

const hasActivity = computed(() => dashboard.value?.has_loyalty_activity ?? false)

const scopeLabel = computed(() => {
  if (dashboard.value?.venue?.name) {
    return dashboard.value.venue.name
  }
  if (dashboard.value?.scope === 'all') {
    return 'All your venues'
  }
  return 'Select a venue'
})

const kpiCards = computed(() => {
  const stats = dashboard.value?.stats
  if (!stats) {
    return []
  }

  return [
    {
      label: 'Active customers',
      value: stats.active_customers,
      description: 'Visited in the last 14 days',
    },
    {
      label: 'Visits this month',
      value: stats.visits_this_month,
      description: 'Stamps recorded this calendar month',
    },
    {
      label: 'Rewards claimed',
      value: stats.rewards_claimed,
      description: 'Successfully redeemed at your venue',
    },
    {
      label: 'Returning customers',
      value: stats.returning_customers,
      description: 'Came back more than once',
    },
  ]
})

const maxMonthlyVisits = computed(() => {
  const rows = dashboard.value?.monthly_activity ?? []
  return Math.max(1, ...rows.map((row) => row.visits))
})

const trendHasData = computed(() => {
  const rows = dashboard.value?.monthly_activity ?? []
  return rows.some((row) => row.visits > 0)
})

const insightToneClass = (tone: DashboardInsight['tone']) => {
  switch (tone) {
    case 'positive':
      return 'border-emerald-200/80 bg-emerald-50/80 text-emerald-900'
    case 'warning':
      return 'border-amber-200/80 bg-amber-50/80 text-amber-900'
    default:
      return 'border-slate-200/80 bg-slate-50/80 text-slate-800'
  }
}

async function load() {
  loading.value = true
  error.value = ''

  try {
    await workspace.bootstrap()
    const query = workspace.filterVenueId ? `?venue_id=${workspace.filterVenueId}` : ''
    dashboard.value = await api<DashboardResponse>(`/dashboard${query}`)
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load analytics.')
  } finally {
    loading.value = false
  }
}

watch(() => workspace.filterVenueId, load)

onMounted(load)
</script>

<template>
  <AppShell>
    <div class="mb-8">
      <AppBadge tone="blue">Retention</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Analytics</h1>
      <p class="mt-2 max-w-2xl text-slate-500">
        See whether guests are joining, returning, and redeeming rewards — {{ scopeLabel }}.
      </p>
    </div>

    <AppCard v-if="loading" wrapper-class="mb-6">
      <EmptyState compact title="Loading analytics…" />
    </AppCard>

    <ErrorState
      v-else-if="error"
      class="mb-6"
      :message="error"
      @retry="load"
    />

    <template v-else-if="dashboard">
      <AppCard
        v-if="!hasActivity"
        wrapper-class="mb-6 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-8 sm:p-10"
      >
        <EmptyState
          bare
          :icon="BarChart3"
          title="No loyalty activity yet"
          description="When guests scan your QR and collect stamps, you'll see engagement here."
        />
        <ol class="mx-auto mt-8 max-w-md space-y-4 text-sm text-slate-600">
          <li class="flex gap-3">
            <span class="grid size-7 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">1</span>
            <span><strong class="text-slate-900">Invite customers</strong> — display your venue QR at the counter.</span>
          </li>
          <li class="flex gap-3">
            <span class="grid size-7 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">2</span>
            <span><strong class="text-slate-900">Scan visits</strong> — staff award stamps from the scanner.</span>
          </li>
          <li class="flex gap-3">
            <span class="grid size-7 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">3</span>
            <span><strong class="text-slate-900">Unlock rewards</strong> — guests claim milestones when they earn them.</span>
          </li>
        </ol>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <RouterLink to="/scanner">
            <AppButton>Open scanner</AppButton>
          </RouterLink>
          <RouterLink to="/rewards">
            <AppButton variant="secondary">Set up rewards</AppButton>
          </RouterLink>
        </div>
      </AppCard>

      <template v-else>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AnalyticsKpiCard
            v-for="card in kpiCards"
            :key="card.label"
            v-bind="card"
          />
        </div>

        <div class="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <AppCard wrapper-class="p-6 sm:p-7">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-2 text-slate-500">
                  <TrendingUp class="size-4" :stroke-width="2.2" />
                  <span class="text-xs font-semibold uppercase tracking-wide">Activity trend</span>
                </div>
                <h2 class="mt-2 text-xl font-black text-slate-950">Monthly visits</h2>
                <p class="mt-1 text-sm text-slate-500">Is usage growing over time?</p>
              </div>
            </div>

            <div v-if="trendHasData" class="mt-8 space-y-5">
              <div
                v-for="row in dashboard.monthly_activity"
                :key="row.month"
                class="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-3"
              >
                <span class="text-sm font-semibold text-slate-500">{{ row.label }}</span>
                <div class="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                    :style="{ width: `${Math.max(row.visits > 0 ? 8 : 0, (row.visits / maxMonthlyVisits) * 100)}%` }"
                  />
                </div>
                <span class="text-right text-sm font-bold tabular-nums text-slate-700">{{ row.visits }}</span>
              </div>
            </div>
            <p v-else class="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Not enough activity yet. Visits will appear here as guests return.
            </p>
          </AppCard>

          <AppCard wrapper-class="flex h-full flex-col p-6 sm:p-7">
            <div class="flex items-center gap-2 text-slate-500">
              <Lightbulb class="size-4" :stroke-width="2.2" />
              <span class="text-xs font-semibold uppercase tracking-wide">Insights</span>
            </div>
            <h2 class="mt-2 text-xl font-black text-slate-950">What to know</h2>
            <p class="mt-1 text-sm text-slate-500">Plain-language signals you can act on today.</p>

            <ul v-if="dashboard.insights.length" class="mt-6 flex flex-1 flex-col gap-3">
              <li
                v-for="(insight, index) in dashboard.insights"
                :key="`${insight.text}-${index}`"
                class="rounded-xl border px-4 py-3.5 text-sm font-medium leading-snug"
                :class="insightToneClass(insight.tone)"
              >
                {{ insight.text }}
              </li>
            </ul>
            <p v-else class="mt-6 flex-1 text-sm text-slate-500">
              Insights will appear once you have more visits and redemptions.
            </p>

            <RouterLink
              v-if="dashboard.stats.total_customers > 0"
              to="/customers"
              class="mt-6 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View customer list →
            </RouterLink>
          </AppCard>
        </div>
      </template>
    </template>
  </AppShell>
</template>
