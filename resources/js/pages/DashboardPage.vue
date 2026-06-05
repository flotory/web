<script setup lang="ts">
import { Check, Gift, Megaphone, ScanLine, ShieldCheck, Star, UserPlus, UsersRound } from '@lucide/vue'
import { computed, onMounted, ref, watch, type Component } from 'vue'
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
import { toast } from '@/lib/toast'
import { venueLogoThumbUrl } from '@/lib/venueMedia'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Customer, Venue } from '@/types'
import type { Campaign } from '@/lib/campaignTemplates'

interface DashboardInsight {
  text: string
  tone: 'positive' | 'warning' | 'neutral'
}

interface DashboardActivity {
  type: 'stamp' | 'reward_unlocked' | 'reward_redeemed' | 'customer_joined' | 'reward_created' | 'campaign_activated' | string
  title: string
  occurred_at: string
  venue_name?: string
}

interface DashboardResponse {
  scope: 'all' | 'venue' | 'none'
  venue: Pick<Venue, 'id' | 'name' | 'slug'> | null
  venues_count: number
  has_loyalty_activity?: boolean
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
  kpi_trends?: {
    visits_this_month?: { change_pct: number | null }
    returning_guests?: { change_pct: number | null }
    rewards_unlocked?: { change_pct: number | null }
    repeat_rate?: { change_pct: number | null }
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
  active_campaigns?: Campaign[]
  recent_activity?: DashboardActivity[]
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

const conversionOverview = computed(() => {
  const rows = dashboard.value?.milestone_conversions ?? []
  const unlocked = rows.reduce((sum, row) => sum + row.unlocked_count, 0)
  const claimed = rows.reduce((sum, row) => sum + row.claimed_count, 0)
  const rate = unlocked > 0 ? Math.round((claimed / unlocked) * 1000) / 10 : 0
  return { unlocked, claimed, rate }
})

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

const hasCustomers = computed(() => (dashboard.value?.stats.total_customers ?? 0) > 0)
const insights = computed(() => dashboard.value?.insights ?? [])
const activeCampaigns = computed(() => dashboard.value?.active_campaigns ?? [])
const recentActivity = computed(() => dashboard.value?.recent_activity ?? [])
const recentActivityRows = computed(() => recentActivity.value.slice(0, 3))
const monthlyActivityRows = computed(() => (dashboard.value?.monthly_activity ?? []).slice(-6))
const maxMonthlyVisits = computed(() => Math.max(1, ...monthlyActivityRows.value.map((row) => row.visits)))
const topConversionRows = computed(() =>
  [...(dashboard.value?.milestone_conversions ?? [])]
    .sort((a, b) => b.unlocked_count - a.unlocked_count)
    .slice(0, 3),
)

function insightToneClass(tone: DashboardInsight['tone']) {
  switch (tone) {
    case 'positive':
      return 'text-success-text'
    case 'warning':
      return 'text-accent-active'
    default:
      return 'text-ink-muted'
  }
}

function activityIconComponent(type: DashboardActivity['type']): Component {
  switch (type) {
    case 'stamp':
      return Check
    case 'reward_unlocked':
    case 'reward_redeemed':
      return Gift
    case 'customer_joined':
      return UserPlus
    case 'reward_created':
      return Star
    case 'campaign_activated':
      return Megaphone
    default:
      return ScanLine
  }
}

function activityIconClasses(type: DashboardActivity['type']) {
  switch (type) {
    case 'stamp':
      return 'bg-success-bg text-success ring-success-border'
    case 'reward_unlocked':
    case 'reward_redeemed':
      return 'bg-accent-soft text-accent-active ring-accent-border'
    case 'customer_joined':
      return 'bg-accent-soft text-primary ring-accent-border'
    case 'reward_created':
      return 'bg-accent-soft text-primary ring-accent-border'
    case 'campaign_activated':
      return 'bg-rose-50 text-rose-600 ring-rose-100'
    default:
      return 'bg-surface-muted text-ink-muted ring-border'
  }
}

function formatActivityTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 1) return 'now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

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

function openCampaignEditor(campaign: Campaign) {
  void router.push({ path: '/campaigns', query: { edit: campaign.id } })
}

async function updateCampaignStatus(campaign: Campaign, status: Campaign['status']) {
  const venueId = selectedVenue.value?.id ?? workspace.filterVenueId
  if (!venueId) return

  try {
    await api(`/venues/${venueId}/campaigns/${campaign.id}`, {
      method: 'PATCH',
      body: { status },
    })
    toast.success('Campaign updated')
    await loadDashboard()
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not update campaign.'))
  }
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
        <div class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-border">
          <img :src="venueLogoThumbUrl(selectedVenue)" :alt="title" class="size-full object-cover">
        </div>
        <div>
        <AppBadge tone="green">Loyalty active</AppBadge>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-ink">{{ title }}</h1>
        <p class="mt-2 text-ink-muted">Your live venue workspace. Invite guests, track returns, and unlock rewards.</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <AppBadge v-if="workspace.activeVenues.length > 1" tone="blue">Switch venue from sidebar</AppBadge>
        <RouterLink :to="selectedVenue ? `/scanner?venue_id=${selectedVenue.id}` : '/scanner'">
          <AppButton class="top-scanner-btn bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-soft">
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
        <h2 class="text-xl font-black text-ink">Venue QR</h2>
        <p class="mt-1 text-sm text-ink-muted">Scan to join and collect stamps</p>

        <div class="mt-4 flex flex-1 flex-col items-center justify-center">
          <div class="w-full max-w-[12.5rem] rounded-[1.4rem] bg-surface-muted p-3 ring-1 ring-border">
            <div id="dashboard-qr" class="mx-auto grid place-items-center rounded-2xl bg-surface p-2 ring-1 ring-border [&_canvas]:block">
              <QrcodeVue v-if="landingUrl" :value="landingUrl" :size="132" level="M" render-as="canvas" :margin="2" />
            </div>
            <p class="mt-3 text-center text-xs font-semibold text-ink-muted">Ready for tables</p>
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
        <div>
          <div class="flex items-center justify-between gap-3">
            <h2 class="inline-flex items-center gap-2 text-xl font-black text-ink">
              <span>Activity & insights</span>
              <span class="live-dot shrink-0" aria-hidden="true" />
            </h2>
            <RouterLink to="/analytics" class="shrink-0 text-xs font-bold uppercase tracking-wide text-ink-muted hover:text-ink-muted">
              View all
            </RouterLink>
          </div>
          <p class="mt-1 text-sm text-ink-muted">Real loyalty events plus signals worth acting on.</p>
        </div>

        <div v-if="recentActivityRows.length" class="mt-4 space-y-2">
          <div
            v-for="item in recentActivityRows"
            :key="`${item.type}-${item.title}-${item.occurred_at}`"
            class="group flex items-center justify-between rounded-2xl bg-surface-muted px-4 py-3 text-sm font-semibold text-ink-muted ring-1 ring-border transition hover:-translate-y-0.5 hover:bg-surface hover:shadow-md"
          >
            <p class="flex min-w-0 items-center gap-2">
              <span
                class="grid size-6 shrink-0 place-items-center rounded-full ring-1"
                :class="activityIconClasses(item.type)"
              >
                <component :is="activityIconComponent(item.type)" class="size-3.5" :stroke-width="2.5" aria-hidden="true" />
              </span>
              <span class="truncate">{{ item.title }}</span>
            </p>
            <span class="shrink-0 text-xs font-bold uppercase tracking-wide text-ink-soft">{{ formatActivityTime(item.occurred_at) }}</span>
          </div>
        </div>
        <div v-else class="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted px-4 py-6 text-center">
          <p class="text-sm font-semibold text-ink-muted">No activity yet.</p>
          <p class="mt-1 text-xs text-ink-muted">Open the scanner when your first guest arrives.</p>
        </div>

        <div class="mt-5 border-t border-border pt-4">
          <p class="text-xs font-black uppercase tracking-[0.14em] text-ink-soft">Insights</p>
          <ul v-if="insights.length" class="mt-3 space-y-2">
            <li
              v-for="(insight, index) in insights.slice(0, 3)"
              :key="`${insight.text}-${index}`"
              class="flex gap-2 rounded-2xl bg-surface px-3 py-2 text-sm font-medium leading-snug ring-1 ring-border/80"
              :class="insightToneClass(insight.tone)"
            >
              <span class="text-ink-soft" aria-hidden="true">•</span>
              <span>{{ insight.text }}</span>
            </li>
          </ul>
          <p v-else class="mt-3 text-sm text-ink-muted">
            Insights appear once guests start visiting.
          </p>
        </div>
      </AppCard>
    </div>

    <DashboardActiveCampaignsSection
      :campaigns="activeCampaigns"
      @pause="(campaign) => updateCampaignStatus(campaign, 'paused')"
      @edit="openCampaignEditor"
      @end="(campaign) => updateCampaignStatus(campaign, 'ended')"
    />

    <AppCard wrapper-class="mt-6 overflow-hidden bg-gradient-to-br from-primary/95 to-primary/90 text-white ring-1 ring-white/10">
      <div class="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 class="text-xl font-black">Analytics preview</h2>
          <p class="mt-1 text-sm text-white/70">Real monthly visits and reward performance from this venue.</p>
          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl bg-surface/5 p-3 ring-1 ring-white/10">
              <p class="text-xs font-bold uppercase tracking-wide text-white/50">Visits</p>
              <p class="mt-1 text-2xl font-black">{{ dashboard?.stats.visits_this_month ?? 0 }}</p>
              <p class="text-xs font-semibold text-white/55">this month</p>
            </div>
            <div class="rounded-2xl bg-surface/5 p-3 ring-1 ring-white/10">
              <p class="text-xs font-bold uppercase tracking-wide text-white/50">Claim rate</p>
              <p class="mt-1 text-2xl font-black">{{ conversionOverview.rate }}%</p>
              <p class="text-xs font-semibold text-white/55">{{ conversionOverview.claimed }} of {{ conversionOverview.unlocked }} claimed</p>
            </div>
            <div class="rounded-2xl bg-surface/5 p-3 ring-1 ring-white/10">
              <p class="text-xs font-bold uppercase tracking-wide text-white/50">Returning</p>
              <p class="mt-1 text-2xl font-black">{{ dashboard?.stats.returning_customers ?? dashboard?.stats.active_progressors ?? 0 }}</p>
              <p class="text-xs font-semibold text-white/55">repeat guests</p>
            </div>
          </div>
          <RouterLink to="/analytics" class="mt-4 inline-flex text-sm font-black text-white underline-offset-4 hover:underline">
            Open full analytics
          </RouterLink>
        </div>
        <div class="rounded-2xl bg-surface/5 p-4 ring-1 ring-white/10">
          <div class="mb-3 flex items-center justify-between gap-3">
            <p class="text-xs font-bold uppercase tracking-wide text-white/50">Last 6 months</p>
            <p class="text-xs font-semibold text-white/50">{{ maxMonthlyVisits }} peak visits</p>
          </div>
          <div class="flex h-28 items-end gap-2">
            <div
              v-for="row in monthlyActivityRows"
              :key="row.month"
              class="flex h-full flex-1 flex-col justify-end gap-2"
            >
              <div
                class="min-h-2 rounded-t-xl bg-accent/70"
                :style="{ height: `${Math.max(row.visits > 0 ? 10 : 4, (row.visits / maxMonthlyVisits) * 100)}%` }"
                :title="`${row.month}: ${row.visits} visits`"
              />
              <p class="truncate text-center text-[10px] font-bold uppercase text-white/45">
                {{ row.month.slice(5) }}
              </p>
            </div>
          </div>
          <div v-if="topConversionRows.length" class="mt-4 space-y-2 border-t border-white/10 pt-4">
            <div
              v-for="row in topConversionRows"
              :key="`${row.reward_id}-${row.venue_id ?? 'venue'}`"
              class="flex items-center justify-between gap-3 text-xs font-semibold text-white/70"
            >
              <span class="truncate">{{ row.title }}</span>
              <span class="shrink-0 text-white">{{ row.claim_rate }}%</span>
            </div>
          </div>
        </div>
      </div>
    </AppCard>

    <AppCard v-if="dashboard?.venue_summaries?.length && workspace.activeVenues.length > 1" wrapper-class="mt-6">
      <h2 class="text-xl font-black text-ink">Other venues</h2>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <div
          v-for="summary in dashboard.venue_summaries"
          :key="summary.venue_id"
          class="rounded-2xl bg-surface-muted p-4 ring-1 ring-border"
        >
          <p class="font-black text-ink">{{ summary.venue_name }}</p>
          <p class="mt-2 text-sm font-semibold text-ink-muted">
            {{ summary.stats.total_customers }} guests · {{ summary.stats.total_visits }} visits
          </p>
        </div>
      </div>
    </AppCard>
    </template>
  </AppShell>
</template>

<style scoped>
.live-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: #22c55e;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.42);
  animation: livePulse 2s ease-in-out infinite;
}

.top-scanner-btn {
  animation: scannerPulse 2.2s ease-in-out infinite;
}

@keyframes livePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.42); }
  50% { box-shadow: 0 0 0 7px rgba(34, 197, 94, 0); }
}

@keyframes scannerPulse {
  0%, 100% {
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.35), 0 0 0 0 rgba(15, 23, 42, 0.42);
  }
  50% {
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.35), 0 0 0 9px rgba(15, 23, 42, 0);
  }
}
</style>
