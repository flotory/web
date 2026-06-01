<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'

import AppShell from '@/layouts/AppShell.vue'
import StatCard from '@/components/loyalty/StatCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { buildVenueLandingUrl } from '@/lib/onboarding'
import { toast } from '@/lib/toast'
import { venueLogoThumbUrl } from '@/lib/venueMedia'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Customer, Venue } from '@/types'

interface DashboardInsight {
  text: string
  tone: 'positive' | 'warning' | 'neutral'
}

interface DashboardResponse {
  scope: 'all' | 'venue' | 'none'
  venue: Pick<Venue, 'id' | 'name' | 'slug'> | null
  venues_count: number
  has_loyalty_activity?: boolean
  stats: {
    total_customers: number
    active_progressors: number
    returning_customers: number
    total_visits: number
    visits_this_month: number
    milestones_claimed: number
    milestones_unlocked: number
    rewards_claimed: number
    cycles_completed: number
  }
  most_loyal_customers: Customer[]
  milestone_conversions: Array<{
    reward_id: number
    title: string
    required_stamps: number
    unlocked_count: number
    claimed_count: number
    claim_rate: number
    venue_name?: string
  }>
  insights: DashboardInsight[]
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

const selectedVenue = computed(() => {
  if (workspace.filterVenueId && workspace.filteredVenue) {
    return workspace.filteredVenue
  }

  if (workspace.activeVenues.length === 1) {
    return workspace.activeVenues[0]
  }

  return workspace.activeVenues[0] ?? null
})

const title = computed(() => selectedVenue.value?.name ?? dashboard.value?.venue?.name ?? 'Your venue')
const landingUrl = computed(() => (selectedVenue.value ? buildVenueLandingUrl(selectedVenue.value.slug) : ''))
const scannerPath = computed(() => (selectedVenue.value ? `/scanner?venue_id=${selectedVenue.value.id}` : '/scanner'))

const hasActivity = computed(() => dashboard.value?.has_loyalty_activity ?? (dashboard.value?.stats.total_visits ?? 0) > 0)
const setupComplete = computed(() => hasActivity.value)

const repeatRate = computed(() => {
  const total = dashboard.value?.stats.total_customers ?? 0
  const returning = dashboard.value?.stats.returning_customers ?? dashboard.value?.stats.active_progressors ?? 0
  if (!total) {
    return '—'
  }

  return `${Math.round((returning / total) * 100)}%`
})

const stats = computed(() => [
  {
    label: 'Visits this month',
    value: dashboard.value?.stats.visits_this_month ?? 0,
  },
  {
    label: 'Returning guests',
    value: dashboard.value?.stats.returning_customers ?? dashboard.value?.stats.active_progressors ?? 0,
  },
  {
    label: 'Rewards unlocked',
    value: dashboard.value?.stats.milestones_unlocked ?? 0,
  },
  {
    label: 'Repeat rate',
    value: repeatRate.value,
  },
])

const activityRows = computed(() => {
  if (!dashboard.value || !hasActivity.value) {
    return []
  }

  const rows: Array<{ label: string; detail: string }> = []

  for (const customer of dashboard.value.most_loyal_customers.slice(0, 3)) {
    const name = customer.user?.name ?? 'Guest'
    rows.push({
      label: name,
      detail: `${customer.stamps} stamps`,
    })
  }

  const conversions = [...(dashboard.value.milestone_conversions ?? [])]
    .filter((row) => row.claimed_count > 0 || row.unlocked_count > 0)
    .sort((a, b) => b.claimed_count - a.claimed_count || b.unlocked_count - a.unlocked_count)

  for (const row of conversions.slice(0, 3)) {
    if (rows.length >= 5) {
      break
    }

    const venuePrefix = row.venue_name && dashboard.value.scope === 'all' ? `${row.venue_name} · ` : ''
    rows.push({
      label: `${venuePrefix}${row.title}`,
      detail: row.claimed_count > 0
        ? `${row.claimed_count} redeemed`
        : `${row.unlocked_count} unlocked`,
    })
  }

  return rows.slice(0, 5)
})

const insights = computed(() => dashboard.value?.insights ?? [])

function insightToneClass(tone: DashboardInsight['tone']) {
  switch (tone) {
    case 'positive':
      return 'text-emerald-800'
    case 'warning':
      return 'text-amber-800'
    default:
      return 'text-slate-700'
  }
}

function downloadQrPng() {
  const canvas = document.querySelector<HTMLCanvasElement>('#dashboard-qr canvas')
  if (!canvas) {
    return
  }

  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = 512
  exportCanvas.height = 512
  const ctx = exportCanvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 512, 512)
  ctx.drawImage(canvas, 0, 0, 512, 512)
  const link = document.createElement('a')
  link.download = `${selectedVenue.value?.slug ?? 'venue'}-qr.png`
  link.href = exportCanvas.toDataURL('image/png')
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function loadDashboard() {
  loading.value = true
  error.value = ''

  try {
    await workspace.bootstrap()

    if (!workspace.hasMembership) {
      await router.push('/onboarding')
      return
    }

    if (!workspace.filterVenueId && workspace.activeVenues.length) {
      workspace.setFilter(workspace.activeVenues[0].id)
    }

    const venueId = selectedVenue.value?.id ?? workspace.filterVenueId
    const query = venueId ? `?venue_id=${venueId}` : ''
    dashboard.value = await api<DashboardResponse>(`/dashboard${query}`)
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load dashboard data.')
  } finally {
    loading.value = false
  }
}

watch(() => workspace.filterVenueId, loadDashboard)

onMounted(loadDashboard)

onMounted(() => {
  if (route.query.onboarding === 'completed') {
    toast.success('Your venue is live.')
    void router.replace({ query: { ...route.query, onboarding: undefined } })
  }
})
</script>

<template>
  <AppShell>
    <div class="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <img :src="venueLogoThumbUrl(selectedVenue)" :alt="title" class="size-full object-cover">
        </div>
        <div>
          <AppBadge v-if="setupComplete" tone="green">Venue active ✓</AppBadge>
          <AppBadge v-else tone="amber">Setup in progress</AppBadge>
          <h1 class="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{{ title }}</h1>
        </div>
      </div>

      <RouterLink :to="scannerPath" class="shrink-0">
        <AppButton size="lg" class="w-full bg-slate-950 text-white shadow-lg shadow-slate-950/20 hover:bg-slate-800 sm:w-auto">
          Open scanner
        </AppButton>
      </RouterLink>
    </div>

    <AppCard v-if="loading" wrapper-class="mb-6">
      <EmptyState compact title="Loading dashboard…" />
    </AppCard>
    <ErrorState
      v-else-if="error"
      class="mb-6"
      :message="error"
      @retry="loadDashboard"
    />

    <template v-else>
      <div
        v-if="landingUrl"
        id="dashboard-qr"
        class="pointer-events-none fixed -left-[9999px] opacity-0"
        aria-hidden="true"
      >
        <QrcodeVue :value="landingUrl" :size="145" level="M" render-as="canvas" :margin="2" />
      </div>

      <AppCard
        v-if="!setupComplete"
        wrapper-class="mb-6 border-amber-200/80 bg-amber-50/50"
      >
        <p class="text-sm font-semibold text-amber-950">
          Launch your program: configure rewards, download your QR, and scan your first guest.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <RouterLink to="/rewards">
            <AppButton size="sm" variant="secondary">Manage rewards</AppButton>
          </RouterLink>
          <AppButton size="sm" variant="secondary" :disabled="!landingUrl" @click="downloadQrPng">
            Download QR
          </AppButton>
          <RouterLink :to="scannerPath">
            <AppButton size="sm">Open scanner</AppButton>
          </RouterLink>
        </div>
      </AppCard>

      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" size="sm" :disabled="!landingUrl" @click="downloadQrPng">
          Download QR
        </AppButton>
        <RouterLink to="/rewards">
          <AppButton variant="secondary" size="sm">Manage rewards</AppButton>
        </RouterLink>
        <RouterLink to="/customers">
          <AppButton variant="secondary" size="sm">View customers</AppButton>
        </RouterLink>
      </div>

      <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard v-for="stat in stats" :key="stat.label" v-bind="stat" />
      </div>

      <div class="mt-8 grid gap-6 lg:grid-cols-2">
        <AppCard>
          <h2 class="text-lg font-black text-slate-950">Recent activity</h2>
          <ul v-if="activityRows.length" class="mt-4 space-y-2">
            <li
              v-for="row in activityRows"
              :key="`${row.label}-${row.detail}`"
              class="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/80"
            >
              <span class="truncate text-sm font-semibold text-slate-800">{{ row.label }}</span>
              <span class="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">{{ row.detail }}</span>
            </li>
          </ul>
          <EmptyState
            v-else
            bare
            compact
            class="mt-4"
            title="No activity yet"
            description="Open the scanner when a guest is ready to collect a stamp."
          >
            <RouterLink :to="scannerPath">
              <AppButton size="sm">Open scanner</AppButton>
            </RouterLink>
          </EmptyState>
        </AppCard>

        <AppCard>
          <h2 class="text-lg font-black text-slate-950">Insights</h2>
          <ul v-if="insights.length" class="mt-4 space-y-2">
            <li
              v-for="(insight, index) in insights"
              :key="`${insight.text}-${index}`"
              class="flex gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium leading-snug ring-1 ring-slate-200/80"
              :class="insightToneClass(insight.tone)"
            >
              <span class="text-slate-400" aria-hidden="true">•</span>
              <span>{{ insight.text }}</span>
            </li>
          </ul>
          <p v-else class="mt-4 text-sm text-slate-500">
            Insights appear once guests start visiting.
            <RouterLink to="/analytics" class="font-semibold text-slate-700 underline-offset-2 hover:underline">
              View analytics
            </RouterLink>
          </p>
        </AppCard>
      </div>

      <AppCard
        v-if="dashboard?.venue_summaries?.length && workspace.activeVenues.length > 1"
        wrapper-class="mt-6"
      >
        <h2 class="text-lg font-black text-slate-950">Other venues</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            v-for="summary in dashboard.venue_summaries"
            :key="summary.venue_id"
            type="button"
            class="rounded-2xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:bg-white hover:shadow-sm"
            @click="workspace.setFilter(summary.venue_id)"
          >
            <p class="font-bold text-slate-950">{{ summary.venue_name }}</p>
            <p class="mt-1 text-sm font-medium text-slate-500">
              {{ summary.stats.visits_this_month ?? 0 }} visits this month ·
              {{ summary.stats.total_customers }} guests
            </p>
          </button>
        </div>
      </AppCard>
    </template>
  </AppShell>
</template>
