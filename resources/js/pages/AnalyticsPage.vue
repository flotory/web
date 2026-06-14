<script setup lang="ts">
import { Award, BarChart3, Lightbulb, TrendingUp, Users } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import AnalyticsKpiCard from '@/components/loyalty/AnalyticsKpiCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Customer, CustomerActivitySummary } from '@/types'

interface DashboardInsight {
  text: string
  tone: 'positive' | 'warning' | 'neutral'
}

interface MilestoneConversion {
  reward_id: number
  title: string
  required_stamps: number
  unlocked_count: number
  claimed_count: number
  claim_rate: number
  venue_id?: number
  venue_name?: string
}

interface DashboardResponse {
  scope: string
  venue?: { id: number; name: string; slug: string } | null
  stats: {
    active_customers: number
    visits_last_28_days: number
    rewards_claimed: number
    returning_customers: number
    total_customers: number
    total_visits: number
  }
  monthly_activity: Array<{ month: string; label: string; visits: number }>
  insights: DashboardInsight[]
  has_loyalty_activity: boolean
  kpi_trends?: {
    visits_last_28_days?: { change_pct: number | null }
    returning_guests?: { change_pct: number | null }
    rewards_unlocked?: { change_pct: number | null }
    repeat_rate?: { change_pct: number | null }
  }
  milestone_conversions?: MilestoneConversion[]
  most_loyal_customers?: Customer[]
  customer_health?: CustomerActivitySummary
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

const showVenueColumn = computed(() => dashboard.value?.scope === 'all')

const kpiCards = computed(() => {
  const stats = dashboard.value?.stats
  const trends = dashboard.value?.kpi_trends
  if (!stats) {
    return []
  }

  return [
    {
      label: 'Active customers',
      value: stats.active_customers,
      description: 'Visited in the last 14 days',
      trend: null,
    },
    {
      label: 'Visits (last 28 days)',
      value: stats.visits_last_28_days,
      description: 'Stamps recorded in the rolling 28-day window',
      trend: trends?.visits_last_28_days?.change_pct ?? null,
    },
    {
      label: 'Rewards claimed',
      value: stats.rewards_claimed,
      description: 'Successfully redeemed at your venue',
      trend: trends?.repeat_rate?.change_pct ?? null,
    },
    {
      label: 'Returning guests (last 28 days)',
      value: stats.returning_customers,
      description: 'Guests with at least two visits in the last 28 days',
      trend: trends?.returning_guests?.change_pct ?? null,
    },
  ]
})

const customerHealth = computed(() => dashboard.value?.customer_health ?? null)

const healthSegments = computed(() => {
  const health = customerHealth.value
  if (!health) {
    return []
  }

  return [
    { key: 'active', label: 'Active', value: health.active, color: 'text-success-text', bar: 'bg-success-bg0' },
    { key: 'new', label: 'New', value: health.new, color: 'text-primary', bar: 'bg-primary' },
    { key: 'cooling', label: 'At risk', value: health.cooling, color: 'text-accent-active', bar: 'bg-accent-soft0' },
    { key: 'inactive', label: 'Inactive', value: health.inactive, color: 'text-ink-muted', bar: 'bg-ink-soft' },
  ]
})

const maxHealthValue = computed(() => {
  const health = customerHealth.value
  if (!health) {
    return 1
  }

  return Math.max(1, health.active, health.new, health.cooling, health.inactive)
})

const rewardRows = computed(() => {
  return [...(dashboard.value?.milestone_conversions ?? [])]
    .sort((a, b) => b.unlocked_count - a.unlocked_count)
})

const loyalCustomers = computed(() => dashboard.value?.most_loyal_customers ?? [])

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
      return 'border-success-border/80 bg-success-bg/80 text-success-text'
    case 'warning':
      return 'border-accent-border/80 bg-accent-soft/80 text-accent-active'
    default:
      return 'border-border/80 bg-surface-muted/80 text-ink'
  }
}

function customerName(customer: Customer) {
  return customer.user?.name ?? 'Guest'
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
    <PageHeader
      title="Analytics"
      badge="Insights"
      description="See whether guests are joining, returning, and redeeming rewards."
    >
      <template #meta>
        <span class="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-ink-muted border border-border">
          {{ scopeLabel }}
        </span>
      </template>
    </PageHeader>

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
        wrapper-class="mb-6 border-dashed border-border bg-gradient-to-br from-surface-muted via-surface to-accent-soft/40 p-8 sm:p-10"
      >
        <EmptyState
          bare
          :icon="BarChart3"
          title="No loyalty activity yet"
          description="When guests join via your QR and tap your NFC stand, you'll see engagement here."
        />
        <ol class="mx-auto mt-8 max-w-md space-y-4 text-sm text-ink-muted">
          <li class="flex gap-3">
            <span class="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">1</span>
            <span><strong class="text-ink">Invite customers</strong> — display your venue QR at the counter.</span>
          </li>
          <li class="flex gap-3">
            <span class="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">2</span>
            <span><strong class="text-ink">Stamp return visits</strong> — guests tap your NFC stand with the Flotory app.</span>
          </li>
          <li class="flex gap-3">
            <span class="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">3</span>
            <span><strong class="text-ink">Redeem rewards</strong> — guests slide to redeem in the app when a milestone unlocks.</span>
          </li>
        </ol>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <RouterLink to="/app">
            <AppButton>Mobile app</AppButton>
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

        <div
          v-if="customerHealth"
          class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5"
        >
          <AppCard wrapper-class="p-4 text-center">
            <p class="text-2xl font-black text-ink">{{ customerHealth.total }}</p>
            <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Total guests</p>
          </AppCard>
          <AppCard
            v-for="segment in healthSegments"
            :key="segment.key"
            wrapper-class="p-4"
          >
            <div class="flex items-end justify-between gap-2">
              <div>
                <p class="text-2xl font-black tabular-nums" :class="segment.color">{{ segment.value }}</p>
                <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{{ segment.label }}</p>
              </div>
            </div>
            <div class="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="segment.bar"
                :style="{ width: `${Math.max(segment.value > 0 ? 8 : 0, (segment.value / maxHealthValue) * 100)}%` }"
              />
            </div>
          </AppCard>
        </div>

        <div class="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <AppCard wrapper-class="p-6 sm:p-7">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-2 text-ink-muted">
                  <TrendingUp class="size-4" :stroke-width="2.2" />
                  <span class="text-xs font-semibold uppercase tracking-wide">Activity trend</span>
                </div>
                <h2 class="mt-2 text-xl font-black text-ink">Monthly visits</h2>
                <p class="mt-1 text-sm text-ink-muted">Is usage growing over time?</p>
              </div>
            </div>

            <div v-if="trendHasData" class="mt-8 space-y-5">
              <div
                v-for="row in dashboard.monthly_activity"
                :key="row.month"
                class="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-3"
              >
                <span class="text-sm font-semibold text-ink-muted">{{ row.label }}</span>
                <div class="h-3 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-primary to-primary-soft transition-all duration-500"
                    :style="{ width: `${Math.max(row.visits > 0 ? 8 : 0, (row.visits / maxMonthlyVisits) * 100)}%` }"
                  />
                </div>
                <span class="text-right text-sm font-bold tabular-nums text-ink-muted">{{ row.visits }}</span>
              </div>
            </div>
            <p v-else class="mt-8 rounded-xl border border-dashed border-border bg-surface-muted px-4 py-8 text-center text-sm text-ink-muted">
              Not enough activity yet. Visits will appear here as guests return.
            </p>
          </AppCard>

          <AppCard wrapper-class="flex h-full flex-col p-6 sm:p-7">
            <div class="flex items-center gap-2 text-ink-muted">
              <Lightbulb class="size-4" :stroke-width="2.2" />
              <span class="text-xs font-semibold uppercase tracking-wide">Insights</span>
            </div>
            <h2 class="mt-2 text-xl font-black text-ink">What to know</h2>
            <p class="mt-1 text-sm text-ink-muted">Plain-language signals you can act on today.</p>

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
            <p v-else class="mt-6 flex-1 text-sm text-ink-muted">
              Insights will appear once you have more visits and redemptions.
            </p>

            <RouterLink
              v-if="dashboard.stats.total_customers > 0"
              to="/customers"
              class="mt-6 inline-flex text-sm font-semibold text-primary hover:text-primary"
            >
              View customer list →
            </RouterLink>
          </AppCard>
        </div>

        <div class="mt-6 grid gap-6 lg:grid-cols-2">
          <AppCard wrapper-class="p-6 sm:p-7">
            <div class="flex items-center gap-2 text-ink-muted">
              <Award class="size-4" :stroke-width="2.2" />
              <span class="text-xs font-semibold uppercase tracking-wide">Reward performance</span>
            </div>
            <h2 class="mt-2 text-xl font-black text-ink">Unlock to claim</h2>
            <p class="mt-1 text-sm text-ink-muted">Which rewards guests earn and actually redeem.</p>

            <div v-if="rewardRows.length" class="mt-6 overflow-x-auto">
              <table class="w-full min-w-[20rem] text-left text-sm">
                <thead>
                  <tr class="border-b border-border text-xs font-bold uppercase tracking-wide text-ink-soft">
                    <th class="pb-3 pr-3 font-bold">Reward</th>
                    <th v-if="showVenueColumn" class="pb-3 pr-3 font-bold">Venue</th>
                    <th class="pb-3 pr-3 text-right font-bold">Unlocked</th>
                    <th class="pb-3 pr-3 text-right font-bold">Claimed</th>
                    <th class="pb-3 text-right font-bold">Rate</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr
                    v-for="row in rewardRows"
                    :key="`${row.reward_id}-${row.venue_id ?? 'venue'}`"
                    class="text-ink-muted"
                  >
                    <td class="py-3 pr-3 font-semibold text-ink">{{ row.title }}</td>
                    <td v-if="showVenueColumn" class="py-3 pr-3 text-ink-muted">{{ row.venue_name }}</td>
                    <td class="py-3 pr-3 text-right tabular-nums">{{ row.unlocked_count }}</td>
                    <td class="py-3 pr-3 text-right tabular-nums">{{ row.claimed_count }}</td>
                    <td class="py-3 text-right font-bold tabular-nums text-primary">{{ row.claim_rate }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="mt-6 rounded-xl border border-dashed border-border bg-surface-muted px-4 py-8 text-center text-sm text-ink-muted">
              Reward conversions appear once guests unlock milestones.
            </p>
          </AppCard>

          <AppCard wrapper-class="p-6 sm:p-7">
            <div class="flex items-center gap-2 text-ink-muted">
              <Users class="size-4" :stroke-width="2.2" />
              <span class="text-xs font-semibold uppercase tracking-wide">Top guests</span>
            </div>
            <h2 class="mt-2 text-xl font-black text-ink">Most loyal customers</h2>
            <p class="mt-1 text-sm text-ink-muted">Guests with the highest stamp counts right now.</p>

            <ul v-if="loyalCustomers.length" class="mt-6 divide-y divide-border">
              <li
                v-for="(customer, index) in loyalCustomers"
                :key="customer.id"
                class="flex items-center justify-between gap-3 py-3"
              >
                <div class="min-w-0">
                  <p class="truncate font-semibold text-ink">
                    <span class="mr-2 text-xs font-black uppercase tracking-wide text-ink-soft">#{{ index + 1 }}</span>
                    <RouterLink
                      :to="`/customers/${customer.id}`"
                      class="hover:text-primary hover:underline"
                    >
                      {{ customerName(customer) }}
                    </RouterLink>
                  </p>
                  <p v-if="showVenueColumn && customer.venue?.name" class="mt-0.5 truncate text-xs text-ink-muted">
                    {{ customer.venue.name }}
                  </p>
                </div>
                <span class="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-sm font-bold tabular-nums text-primary border border-accent-border">
                  {{ customer.stamps }} stamps
                </span>
              </li>
            </ul>
            <p v-else class="mt-6 rounded-xl border border-dashed border-border bg-surface-muted px-4 py-8 text-center text-sm text-ink-muted">
              Loyalty leaders appear once guests start collecting stamps.
            </p>

            <RouterLink
              v-if="loyalCustomers.length"
              to="/customers"
              class="mt-4 inline-flex text-sm font-semibold text-primary hover:text-primary"
            >
              View all customers →
            </RouterLink>
          </AppCard>
        </div>
      </template>
    </template>
  </AppShell>
</template>
