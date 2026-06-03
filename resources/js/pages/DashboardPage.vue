<script setup lang="ts">
import { Gift, ScanLine, ShieldCheck, UsersRound } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'

import DashboardActiveCampaignsSection from '@/components/campaigns/DashboardActiveCampaignsSection.vue'
import AppShell from '@/layouts/AppShell.vue'
import StatCard from '@/components/loyalty/StatCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { buildVenueLandingUrl } from '@/lib/onboarding'
import { formatInvitationWhen } from '@/lib/team'
import { toast } from '@/lib/toast'
import { venueLogoThumbUrl } from '@/lib/venueMedia'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Campaign } from '@/lib/campaignTemplates'
import type { Customer, Venue } from '@/types'

interface DashboardInsight {
  text: string
  tone: 'positive' | 'warning' | 'neutral'
}

interface KpiTrend {
  previous: number
  change_pct: number | null
}

interface DashboardResponse {
  scope: 'all' | 'venue' | 'none'
  venue: Pick<Venue, 'id' | 'name' | 'slug'> | null
  venues_count: number
  has_loyalty_activity?: boolean
  kpi_trends?: {
    visits_this_month: KpiTrend
    returning_guests: KpiTrend
    rewards_unlocked: KpiTrend
    repeat_rate: KpiTrend
  }
  stats: {
    total_customers: number
    active_progressors: number
    returning_customers?: number
    total_visits: number
    visits_this_month?: number
    milestones_claimed: number
    milestones_unlocked: number
    rewards_claimed?: number
    cycles_completed: number
  }
  insights?: DashboardInsight[]
  active_campaigns?: Campaign[]
  active_campaign?: { id: number; name: string; template_id: string } | null
  most_loyal_customers: Customer[]
  monthly_activity: Array<{ month: string; label?: string; visits: number }>
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
  recent_activity?: Array<{
    type: string
    title: string
    occurred_at: string
    venue_name?: string
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

const stats = computed(() => {
  const trends = dashboard.value?.kpi_trends

  return [
    {
      label: 'Visits this month',
      value: dashboard.value?.stats.visits_this_month ?? 0,
      trend: trends?.visits_this_month?.change_pct ?? null,
      icon: ScanLine,
      tone: 'purple' as const,
    },
    {
      label: 'Returning guests',
      value: dashboard.value?.stats.returning_customers ?? dashboard.value?.stats.active_progressors ?? 0,
      trend: trends?.returning_guests?.change_pct ?? null,
      icon: UsersRound,
      tone: 'amber' as const,
    },
    {
      label: 'Rewards unlocked',
      value: dashboard.value?.stats.milestones_unlocked ?? 0,
      trend: trends?.rewards_unlocked?.change_pct ?? null,
      icon: Gift,
      tone: 'green' as const,
    },
    {
      label: 'Repeat rate',
      value: `${conversionOverview.value.rate}%`,
      trend: trends?.repeat_rate?.change_pct ?? null,
      icon: ShieldCheck,
      tone: 'blue' as const,
    },
  ]
})

const activityChart = computed(() => {
  const rows = dashboard.value?.monthly_activity ?? []
  const maxVisits = Math.max(...rows.map((row) => row.visits), 1)

  return rows.map((row) => ({
    ...row,
    label: row.label ?? row.month,
    heightPct: Math.max((row.visits / maxVisits) * 100, row.visits > 0 ? 12 : 4),
  }))
})

const hasActivity = computed(() => dashboard.value?.has_loyalty_activity ?? hasCustomers.value)
const activeCampaigns = computed(() => dashboard.value?.active_campaigns ?? [])
const showCampaignsSection = computed(() => Boolean(selectedVenue.value))

const conversionOverview = computed(() => {
  const rows = dashboard.value?.milestone_conversions ?? []
  const unlocked = rows.reduce((sum, row) => sum + row.unlocked_count, 0)
  const claimed = rows.reduce((sum, row) => sum + row.claimed_count, 0)
  const rate = unlocked > 0 ? Math.round((claimed / unlocked) * 1000) / 10 : 0
  return { unlocked, claimed, rate }
})

const hasCustomers = computed(() => (dashboard.value?.stats.total_customers ?? 0) > 0)
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

const activityFeed = computed(() => {
  const rows = dashboard.value?.recent_activity ?? []
  const showVenue = dashboard.value?.scope === 'all'

  return rows.map((row) => ({
    key: `${row.type}-${row.occurred_at}-${row.title}`,
    title: showVenue && row.venue_name ? `${row.title} · ${row.venue_name}` : row.title,
    time: formatInvitationWhen(row.occurred_at),
    icon: '🟢',
  }))
})

const canOpenActions = computed(() => Boolean(selectedVenue.value && landingUrl.value))

function downloadQrPng() {
  const canvas = document.querySelector<HTMLCanvasElement>('#dashboard-qr canvas')
  if (!canvas) {
    return
  }
  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = 512
  exportCanvas.height = 512
  const ctx = exportCanvas.getContext('2d')
  if (!ctx) return
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

async function updateCampaignStatus(campaign: Campaign, status: Campaign['status']) {
  const venueId = selectedVenue.value?.id
  if (!venueId) {
    return
  }

  try {
    await api(`/venues/${venueId}/campaigns/${campaign.id}`, {
      method: 'PATCH',
      body: { status },
    })
    toast.success(status === 'ended' ? 'Campaign ended' : 'Campaign paused')
    await loadDashboard()
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not update campaign.'))
  }
}

function editCampaign(campaign: Campaign) {
  void router.push({ path: '/campaigns', query: { edit: String(campaign.id) } })
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
    toast.success('Your venue is live! Share your QR to start collecting stamps.')
    void router.replace({ query: { ...route.query, onboarding: undefined } })
  }
})
</script>

<template>
  <AppShell>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <img :src="venueLogoThumbUrl(selectedVenue)" :alt="title" class="size-full object-cover">
        </div>
        <div>
          <AppBadge tone="green">Loyalty active</AppBadge>
          <h1 class="mt-2 text-4xl font-black tracking-tight text-slate-950">{{ title }}</h1>
          <p class="mt-2 text-slate-500">Your live venue workspace. Invite guests, track returns, and unlock rewards.</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <AppBadge v-if="workspace.activeVenues.length > 1" tone="blue">Switch venue from sidebar</AppBadge>
        <RouterLink :to="selectedVenue ? `/scanner?venue_id=${selectedVenue.id}` : '/scanner'">
          <AppButton class="top-scanner-btn bg-slate-950 text-white shadow-lg shadow-slate-950/25 hover:bg-slate-800">
            ◎ Open scanner
          </AppButton>
        </RouterLink>
      </div>
    </div>

    <AppCard v-if="loading" wrapper-class="mb-4">
      <EmptyState compact title="Loading dashboard…" />
    </AppCard>
    <ErrorState
      v-else-if="error"
      class="mb-4"
      :message="error"
      @retry="loadDashboard"
    />

    <template v-else>
    <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard v-for="stat in stats" :key="stat.label" v-bind="stat" />
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-[minmax(15rem,1fr)_2fr] lg:items-stretch">
      <AppCard wrapper-class="flex h-full flex-col">
        <h2 class="text-xl font-black text-slate-950">Venue QR</h2>
        <p class="mt-1 text-sm text-slate-500">Scan to join and collect stamps</p>

        <div class="mt-4 flex flex-1 flex-col items-center justify-center">
          <div class="w-full max-w-[12.5rem] rounded-[1.4rem] bg-slate-50 p-3 ring-1 ring-slate-200">
            <div id="dashboard-qr" class="qr-pulse mx-auto rounded-2xl bg-white p-2 ring-1 ring-slate-200">
              <QrcodeVue v-if="landingUrl" :value="landingUrl" :size="132" level="M" render-as="canvas" :margin="2" />
            </div>
            <p class="mt-3 text-center text-xs font-semibold text-slate-600">Ready for tables</p>
          </div>
        </div>

        <div class="mt-5 grid gap-2">
          <AppButton size="lg" class="w-full" :disabled="!canOpenActions" @click="downloadQrPng">
            ↓ Download QR
          </AppButton>
          <RouterLink :to="landingUrl || '/my-venues'" class="inline-flex w-full">
            <AppButton size="lg" variant="secondary" class="w-full" :disabled="!canOpenActions">
              ◍ Preview customer experience
            </AppButton>
          </RouterLink>
        </div>
      </AppCard>

      <AppCard wrapper-class="flex h-full flex-col">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-black text-slate-950">Recent activity</h2>
            <p class="mt-1 text-sm text-slate-500">Latest stamps, joins, and reward events at your venue.</p>
          </div>
          <RouterLink to="/analytics" class="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-slate-700">
            View all
          </RouterLink>
        </div>

        <div v-if="activityFeed.length" class="mt-4 space-y-2">
          <div
            v-for="item in activityFeed"
            :key="item.key"
            class="group flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
          >
            <p class="flex min-w-0 items-center gap-2">
              <span class="text-base">{{ item.icon }}</span>
              <span class="truncate">{{ item.title }}</span>
            </p>
            <span class="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">{{ item.time }}</span>
          </div>
        </div>
        <p
          v-else
          class="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm font-semibold text-slate-500"
        >
          No activity yet. Share your QR or open the scanner when your first guest arrives.
        </p>
      </AppCard>
    </div>

    <DashboardActiveCampaignsSection
      v-if="showCampaignsSection"
      :campaigns="activeCampaigns"
      @pause="updateCampaignStatus($event, 'paused')"
      @edit="editCampaign"
      @end="updateCampaignStatus($event, 'ended')"
    />

    <AppCard wrapper-class="mt-6">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-xl font-black text-slate-950">Insights</h2>
          <RouterLink to="/analytics" class="text-xs font-bold uppercase tracking-wide text-slate-500">View analytics</RouterLink>
        </div>
        <p class="mt-1 text-sm text-slate-500">Actionable signals from your loyalty data.</p>
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
          <RouterLink to="/rewards" class="font-semibold text-slate-700 underline-offset-2 hover:underline">
            Set up rewards
          </RouterLink>
          or open the scanner when your first guest arrives.
        </p>
      </AppCard>

    <AppCard wrapper-class="mt-6 overflow-hidden bg-gradient-to-br from-slate-950/95 to-slate-900/90 text-white ring-1 ring-white/10">
      <div class="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-xl font-black">{{ hasActivity ? 'Visit trend' : 'Analytics preview' }}</h2>
            <RouterLink
              v-if="hasActivity"
              to="/analytics"
              class="text-xs font-bold uppercase tracking-wide text-white/60 hover:text-white"
            >
              View analytics
            </RouterLink>
          </div>
          <p class="mt-1 text-sm text-white/70">
            {{
              hasActivity
                ? 'Monthly stamps recorded across your loyalty program.'
                : 'Analytics will appear after your first guest stamps.'
            }}
          </p>
          <ul v-if="!hasActivity" class="mt-4 space-y-2 text-sm font-semibold text-white/80">
            <li>• Track repeat stamps</li>
            <li>• See busiest hours</li>
            <li>• Measure reward performance</li>
          </ul>
          <div v-else class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div
              v-for="stat in stats.slice(0, 4)"
              :key="stat.label"
              class="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10"
            >
              <p class="text-xs font-semibold text-white/60">{{ stat.label }}</p>
              <p class="mt-1 text-2xl font-black tabular-nums">{{ stat.value }}</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <template v-if="hasActivity">
            <p class="mb-3 text-xs font-bold uppercase tracking-wide text-white/50">Last 6 months</p>
            <div class="flex h-32 items-end gap-2">
              <div
                v-for="row in activityChart"
                :key="row.month"
                class="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <span class="text-[10px] font-bold tabular-nums text-white/70">{{ row.visits }}</span>
                <div
                  class="w-full rounded-t-xl bg-blue-300/55 transition-all"
                  :style="{ height: `${row.heightPct}%` }"
                />
                <span class="truncate text-[10px] font-semibold text-white/45">{{ row.label }}</span>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="mb-3 grid grid-cols-3 gap-2">
              <div class="h-10 rounded-xl bg-white/10" />
              <div class="h-10 rounded-xl bg-white/10" />
              <div class="h-10 rounded-xl bg-white/10" />
            </div>
            <div class="flex h-28 items-end gap-2">
              <div class="h-9 w-1/6 rounded-t-xl bg-blue-300/40" />
              <div class="h-14 w-1/6 rounded-t-xl bg-blue-300/50" />
              <div class="h-11 w-1/6 rounded-t-xl bg-blue-300/45" />
              <div class="h-20 w-1/6 rounded-t-xl bg-blue-300/60" />
              <div class="h-13 w-1/6 rounded-t-xl bg-blue-300/45" />
              <div class="h-16 w-1/6 rounded-t-xl bg-blue-300/55" />
            </div>
          </template>
        </div>
      </div>
    </AppCard>

    <AppCard v-if="dashboard?.venue_summaries?.length && workspace.activeVenues.length > 1" wrapper-class="mt-6">
      <h2 class="text-xl font-black text-slate-950">Other venues</h2>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <div
          v-for="summary in dashboard.venue_summaries"
          :key="summary.venue_id"
          class="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
        >
          <p class="font-black text-slate-950">{{ summary.venue_name }}</p>
          <p class="mt-2 text-sm font-semibold text-slate-500">
            {{ summary.stats.total_customers }} guests · {{ summary.stats.total_visits }} visits
          </p>
        </div>
      </div>
    </AppCard>
    </template>
  </AppShell>
</template>

<style scoped>
.top-scanner-btn {
  animation: scannerPulse 2.2s ease-in-out infinite;
}

.qr-pulse {
  animation: qrPulse 2.4s ease-in-out infinite;
}

@keyframes scannerPulse {
  0%, 100% {
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.35), 0 0 0 0 rgba(15, 23, 42, 0.42);
  }
  50% {
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.35), 0 0 0 9px rgba(15, 23, 42, 0);
  }
}

@keyframes qrPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(15, 23, 42, 0.08);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(15, 23, 42, 0);
  }
}
</style>
