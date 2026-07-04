<script setup lang="ts">
import { Check, Download, Gift, Megaphone, ScanLine, ShieldCheck, Star, UserPlus, UsersRound } from '@lucide/vue'
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'

import DashboardRevenueEstimateCard from '@/components/loyalty/DashboardRevenueEstimateCard.vue'
import DashboardPeriodPicker from '@/components/loyalty/DashboardPeriodPicker.vue'
import DashboardActiveCampaignsSection from '@/components/campaigns/DashboardActiveCampaignsSection.vue'
import VenueListingCard from '@/components/loyalty/VenueListingCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import StatCard from '@/components/loyalty/StatCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import PageSection from '@/components/ui/PageSection.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import { api, apiErrorMessage, isAbortedRequest, isUnauthenticatedError } from '@/lib/api'
import {
  dashboardApiQueryString,
  defaultDashboardPeriodSelection,
  parseDashboardPeriodFromQuery,
  previousPeriodComparisonLabel,
  type DashboardPeriodMeta,
  type DashboardPeriodSelection,
} from '@/lib/dashboardPeriod'
import { updateCampaignStatus } from '@/lib/campaignActions'
import { downloadVenueQrPng } from '@/lib/downloadVenueQrPng'
import { buildVenueLandingUrl } from '@/lib/onboarding'
import { listingStatusLabel, listingStatusTone } from '@/lib/venueListing'
import { venueLogoThumbUrl } from '@/lib/venueMedia'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Venue } from '@/types'
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
  period?: DashboardPeriodMeta
  stats: {
    total_customers: number
    active_progressors: number
    returning_customers?: number
    total_visits: number
    visits_last_28_days?: number
    rewards_unlocked_last_28_days?: number
    claim_rate_last_28_days?: number
    milestones_claimed: number
    milestones_unlocked: number
    rewards_claimed?: number
    cycles_completed: number
  }
  insights?: DashboardInsight[]
  kpi_trends?: {
    visits_last_28_days?: { change_pct: number | null }
    returning_guests?: { change_pct: number | null }
    rewards_unlocked?: { change_pct: number | null }
    repeat_rate?: { change_pct: number | null }
  }
  venue_summaries: Array<{
    venue_id: number
    venue_name: string
    stats: DashboardResponse['stats']
  }>
  active_campaigns?: Campaign[]
  recent_activity?: DashboardActivity[]
  revenue_estimate?: {
    average_check_amount: number | null
    visits_last_28_days: number
    total_visits: number
    estimated_revenue_last_28_days: number | null
    estimated_revenue_total: number | null
  }
}

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const workspace = useWorkspaceStore()
const dashboard = ref<DashboardResponse | null>(null)
const loading = ref(true)
const error = ref('')
const periodSelection = ref<DashboardPeriodSelection>(defaultDashboardPeriodSelection())

const periodLabel = computed(() => dashboard.value?.period?.label ?? 'Last 28 days')
const trendComparisonLabel = computed(() => previousPeriodComparisonLabel(dashboard.value?.period))

/** Temporary: venue QR is printed on physical stands; re-enable when dashboard download is needed again. */
const showVenueQr = false

const selectedVenue = computed(() => {
  if (dashboard.value?.scope === 'all') {
    return null
  }

  if (workspace.filterVenueId && workspace.filteredVenue) {
    return workspace.filteredVenue
  }

  if (workspace.activeVenues.length === 1) {
    return workspace.activeVenues[0]
  }

  return null
})

const isAggregateView = computed(() => dashboard.value?.scope === 'all')

const revenueEstimateVenue = computed(() => {
  if (selectedVenue.value) {
    return selectedVenue.value
  }

  if (dashboard.value?.venue) {
    return dashboard.value.venue
  }

  return null
})

const canEditRevenueEstimate = computed(() => !isAggregateView.value && Boolean(revenueEstimateVenue.value))

const title = computed(() => {
  if (isAggregateView.value) {
    return `All venues (${dashboard.value?.venues_count ?? 0})`
  }

  return selectedVenue.value?.name ?? dashboard.value?.venue?.name ?? 'Your venue'
})

const landingUrl = computed(() => (selectedVenue.value ? buildVenueLandingUrl(selectedVenue.value.slug) : ''))

const listingBadge = computed(() => {
  const status = selectedVenue.value?.status ?? 'draft'
  if (status === 'published') {
    return { label: 'Live for customers', tone: 'green' as const }
  }

  return {
    label: listingStatusLabel(status),
    tone: listingStatusTone(status),
  }
})

const stats = computed(() => {
  const trends = dashboard.value?.kpi_trends

  return [
    {
      label: `Visits (${periodLabel.value})`,
      value: dashboard.value?.stats.visits_last_28_days ?? 0,
      trend: trends?.visits_last_28_days?.change_pct ?? null,
      icon: ScanLine,
      tone: 'purple' as const,
    },
    {
      label: `Returning guests (${periodLabel.value})`,
      value: dashboard.value?.stats.returning_customers ?? 0,
      trend: trends?.returning_guests?.change_pct ?? null,
      icon: UsersRound,
      tone: 'amber' as const,
    },
    {
      label: 'Rewards unlocked',
      value: dashboard.value?.stats.rewards_unlocked_last_28_days ?? 0,
      trend: trends?.rewards_unlocked?.change_pct ?? null,
      icon: Gift,
      tone: 'green' as const,
    },
    {
      label: 'Repeat rate',
      value: `${dashboard.value?.stats.claim_rate_last_28_days ?? 0}%`,
      trend: trends?.repeat_rate?.change_pct ?? null,
      icon: ShieldCheck,
      tone: 'blue' as const,
    },
  ]
})

const insights = computed(() => dashboard.value?.insights ?? [])
const activeCampaigns = computed(() => dashboard.value?.active_campaigns ?? [])
const recentActivity = computed(() => dashboard.value?.recent_activity ?? [])
const recentActivityRows = computed(() => recentActivity.value.slice(0, 3))

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
      return 'bg-success-bg text-success-text'
    case 'reward_unlocked':
    case 'reward_redeemed':
      return 'bg-accent-soft text-accent-active'
    case 'customer_joined':
      return 'bg-accent-soft text-primary'
    case 'reward_created':
      return 'bg-accent-soft text-primary'
    case 'campaign_activated':
      return 'bg-rose-50 text-rose-600'
    default:
      return 'bg-surface-muted text-ink-muted'
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
  if (!selectedVenue.value) return
  downloadVenueQrPng('#dashboard-qr', selectedVenue.value.slug)
}

function openCampaignEditor(campaign: Campaign) {
  void router.push({ path: '/campaigns', query: { edit: campaign.id } })
}

async function pauseCampaign(campaign: Campaign) {
  const venueId = selectedVenue.value?.id ?? workspace.filterVenueId
  if (!venueId) return
  await updateCampaignStatus(venueId, campaign, 'paused', loadDashboard)
}

async function endCampaign(campaign: Campaign) {
  const venueId = selectedVenue.value?.id ?? workspace.filterVenueId
  if (!venueId) return
  await updateCampaignStatus(venueId, campaign, 'ended', loadDashboard)
}

async function loadDashboard() {
  if (!auth.token || auth.loggingOut) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    await workspace.bootstrap()

    if (!auth.token || auth.loggingOut) {
      return
    }

    if (!workspace.hasMembership) {
      await router.push({ path: '/my-venues', query: { create: '1' } })
      return
    }

    const ownerVenues = workspace.activeVenues.filter((venue) => venue.membership_role === 'owner')
    const shouldAutoSelectVenue = !auth.isAdmin && ownerVenues.length > 0

    if (!workspace.filterVenueId && shouldAutoSelectVenue) {
      workspace.setFilter(ownerVenues[0].id)
    }

    const venueId = workspace.filterVenueId ?? undefined
    const query = dashboardApiQueryString(periodSelection.value, venueId)
    dashboard.value = await api<DashboardResponse>(`/dashboard${query}`)
  } catch (exception) {
    if (isAbortedRequest(exception) || auth.loggingOut) {
      return
    }

    if (isUnauthenticatedError(exception)) {
      auth.clearSession()
      await router.replace({ name: 'login' })
      return
    }

    error.value = apiErrorMessage(exception, 'Could not load dashboard data.')
  } finally {
    loading.value = false
  }
}

function syncPeriodToRoute() {
  const venueId = workspace.filterVenueId ?? undefined
  const query = dashboardApiQueryString(periodSelection.value, venueId)
  const nextQuery = new URLSearchParams(query.replace(/^\?/, ''))

  void router.replace({
    path: route.path,
    query: Object.fromEntries(nextQuery.entries()),
  })
}

function onPeriodChange(next: DashboardPeriodSelection) {
  periodSelection.value = next
  syncPeriodToRoute()
  void loadDashboard()
}

watch(() => workspace.filterVenueId, () => {
  if (auth.loggingOut || !auth.token) {
    return
  }

  syncPeriodToRoute()
  void loadDashboard()
})

onMounted(() => {
  periodSelection.value = parseDashboardPeriodFromQuery(route.query as Record<string, unknown>)
  void loadDashboard()
})
</script>

<template>
  <AppShell>
    <PageHeader
      :title="title"
      :badge="listingBadge.label"
      :badge-tone="listingBadge.tone"
      description="Run loyalty from your dashboard. Submit your listing when you are ready for customers to discover you."
    >
      <template #leading>
        <div class="grid size-14 place-items-center overflow-hidden rounded-2xl bg-surface shadow-sm border border-border">
          <img :src="venueLogoThumbUrl(selectedVenue)" :alt="title" class="size-full object-cover">
        </div>
      </template>
    </PageHeader>

    <DashboardPeriodPicker
      class="mb-4"
      :model-value="periodSelection"
      :period-label="periodLabel"
      @update:model-value="onPeriodChange"
    />

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
    <VenueListingCard
      v-if="selectedVenue"
      :venue-id="selectedVenue.id"
      @updated="loadDashboard"
    />

    <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard v-for="stat in stats" :key="stat.label" v-bind="stat" :trend-comparison-label="trendComparisonLabel" />
    </div>

    <DashboardRevenueEstimateCard
      class="mt-4"
      :venue="revenueEstimateVenue"
      :estimate="dashboard?.revenue_estimate"
      :editable="canEditRevenueEstimate"
      :period-label="periodLabel"
      @saved="loadDashboard"
    />

    <div v-if="showVenueQr" class="mt-6">
      <AppCard wrapper-class="flex h-full max-w-sm flex-col">
        <PageSection title="Venue QR" description="Scan to join and collect stamps" />

        <div class="mt-4 flex flex-1 flex-col items-center justify-center">
          <div class="w-full max-w-[12.5rem] rounded-[1.4rem] bg-surface-muted p-3 border border-border">
            <div id="dashboard-qr" class="mx-auto grid place-items-center rounded-2xl bg-surface p-2 border border-border [&_canvas]:block">
              <QrcodeVue v-if="landingUrl" :value="landingUrl" :size="132" level="M" render-as="canvas" :margin="2" />
            </div>
            <p class="mt-3 text-center text-xs font-semibold text-ink-muted">Ready for tables</p>
          </div>
        </div>

        <div class="mt-5">
          <AppButton size="lg" class="w-full" :disabled="!canOpenActions" @click="downloadQrPng">
            <Download class="size-4" />
            Download QR
          </AppButton>
        </div>
      </AppCard>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-2 lg:items-stretch">
      <AppCard wrapper-class="flex h-full flex-col">
        <div>
          <div class="flex items-center justify-between gap-3">
            <h2 class="inline-flex items-center gap-2 text-lg font-bold text-ink md:text-xl">
              <span>Activity</span>
              <span class="live-dot shrink-0" aria-hidden="true" />
            </h2>
            <RouterLink to="/analytics" class="shrink-0 text-xs font-bold uppercase tracking-wide text-ink-muted hover:text-ink-muted">
              View all
            </RouterLink>
          </div>
          <p class="mt-1 text-sm text-ink-muted">Recent loyalty events from your venue.</p>
        </div>

        <div v-if="recentActivityRows.length" class="mt-4 flex-1 space-y-2">
          <div
            v-for="item in recentActivityRows"
            :key="`${item.type}-${item.title}-${item.occurred_at}`"
            class="group flex items-center justify-between rounded-2xl bg-surface-muted px-4 py-3 text-sm font-semibold text-ink-muted border border-border transition hover:-translate-y-0.5 hover:bg-surface hover:shadow-md"
          >
            <p class="flex min-w-0 items-center gap-2">
              <span
                class="grid size-6 shrink-0 place-items-center rounded-full"
                :class="activityIconClasses(item.type)"
              >
                <component :is="activityIconComponent(item.type)" class="size-3.5" :stroke-width="2.5" aria-hidden="true" />
              </span>
              <span class="truncate">{{ item.title }}</span>
            </p>
            <span class="shrink-0 text-xs font-bold uppercase tracking-wide text-ink-soft">{{ formatActivityTime(item.occurred_at) }}</span>
          </div>
        </div>
        <div v-else class="mt-4 flex-1 rounded-2xl border border-dashed border-border bg-surface-muted px-4 py-6 text-center">
          <p class="text-sm font-semibold text-ink-muted">No activity yet.</p>
          <p class="mt-1 text-xs text-ink-muted">Guests tap the NFC stand on return visits to collect stamps.</p>
        </div>
      </AppCard>

      <AppCard wrapper-class="flex h-full flex-col">
        <div>
          <h2 class="text-lg font-bold text-ink md:text-xl">Insights</h2>
          <p class="mt-1 text-sm text-ink-muted">Signals worth acting on from your loyalty program.</p>
        </div>

        <ul v-if="insights.length" class="mt-4 flex-1 space-y-2">
          <li
            v-for="(insight, index) in insights.slice(0, 3)"
            :key="`${insight.text}-${index}`"
            class="flex gap-2 rounded-2xl bg-surface-muted px-3 py-2 text-sm font-medium leading-snug border border-border/80"
            :class="insightToneClass(insight.tone)"
          >
            <span class="text-ink-soft" aria-hidden="true">•</span>
            <span>{{ insight.text }}</span>
          </li>
        </ul>
        <div v-else class="mt-4 flex-1 rounded-2xl border border-dashed border-border bg-surface-muted px-4 py-6 text-center">
          <p class="text-sm font-semibold text-ink-muted">No insights yet.</p>
          <p class="mt-1 text-xs text-ink-muted">Insights appear once guests start visiting.</p>
        </div>
      </AppCard>
    </div>

    <DashboardActiveCampaignsSection
      :campaigns="activeCampaigns"
      @pause="pauseCampaign"
      @edit="openCampaignEditor"
      @end="endCampaign"
    />

    <AppCard v-if="dashboard?.venue_summaries?.length && workspace.activeVenues.length > 1" wrapper-class="mt-6">
      <h2 class="text-xl font-black text-ink">Other venues</h2>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <div
          v-for="summary in dashboard.venue_summaries"
          :key="summary.venue_id"
          class="rounded-2xl bg-surface-muted p-4 border border-border"
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
  background: var(--flotory-success);
}
</style>
