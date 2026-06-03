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
import { venueCoverUrl, venueLogoThumbUrl } from '@/lib/venueMedia'
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
    returning_customers?: number
    total_visits: number
    visits_this_month?: number
    milestones_claimed: number
    milestones_unlocked: number
    rewards_claimed?: number
    cycles_completed: number
  }
  insights?: DashboardInsight[]
  active_campaign?: { id: number; name: string; template_id: string } | null
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

const stats = computed(() => [
  { label: 'Visits this month', value: dashboard.value?.stats.visits_this_month ?? 0 },
  { label: 'Returning guests', value: dashboard.value?.stats.returning_customers ?? dashboard.value?.stats.active_progressors ?? 0 },
  { label: 'Rewards unlocked', value: dashboard.value?.stats.milestones_unlocked ?? 0 },
  { label: 'Repeat rate', value: `${conversionOverview.value.rate}%` },
])

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
  if (!hasCustomers.value) {
    return [
      { icon: '🟢', title: 'QR downloaded', time: 'just now' },
      { icon: '🟢', title: 'Rewards published', time: '2 min ago' },
      { icon: '🟢', title: 'Scanner ready', time: '5 min ago' },
      { icon: '🟢', title: 'Venue activated', time: '8 min ago' },
    ]
  }

  return [
    { icon: '🟢', title: `${dashboard.value?.stats.visits_this_month ?? 0} visits this month`, time: 'month' },
    { icon: '🟢', title: `${dashboard.value?.stats.total_customers ?? 0} guests on loyalty`, time: 'all time' },
    { icon: '🟢', title: `${dashboard.value?.stats.milestones_unlocked ?? 0} rewards unlocked`, time: 'all time' },
    { icon: '🟢', title: 'Scanner and QR ready', time: 'live' },
  ]
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
        <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">{{ title }}</h1>
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

    <div class="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <AppCard wrapper-class="hero-shell overflow-hidden !border-slate-700/60 !bg-slate-950 p-0 text-white shadow-2xl shadow-slate-900/40">
        <div class="relative h-36 overflow-hidden">
          <img :src="venueCoverUrl(selectedVenue)" alt="" class="h-full w-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/30" />
        </div>
        <div class="hero-ambient pointer-events-none absolute inset-0 opacity-50" />
        <div class="relative grid gap-4 bg-slate-950 p-4 pt-2 -mt-10">
          <div class="rounded-3xl bg-slate-900/70 p-4 ring-1 ring-white/10 backdrop-blur">
            <div class="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-100">
              <span class="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 ring-1 ring-emerald-300/30"><span class="live-dot" /> QR active</span>
              <span class="inline-flex items-center gap-1 rounded-full bg-blue-400/15 px-2.5 py-1 ring-1 ring-blue-300/30"><span class="live-dot" /> Rewards live</span>
              <span class="inline-flex items-center gap-1 rounded-full bg-indigo-400/15 px-2.5 py-1 ring-1 ring-indigo-300/30"><span class="live-dot" /> Scanner ready</span>
            </div>
            <h2 class="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Your loyalty program is live</h2>
            <p class="mt-2 text-sm leading-relaxed text-white/80">Guests can now scan your QR, collect stamps, and unlock rewards.</p>
          </div>

          <div class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div class="rounded-3xl bg-slate-900/70 p-4 ring-1 ring-white/10 backdrop-blur">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">Primary actions</p>
              <div class="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                <AppButton size="lg" class="hero-btn-primary w-full" :disabled="!canOpenActions" @click="downloadQrPng">
                  ↓ Download QR
                </AppButton>
                <RouterLink :to="landingUrl || '/my-venues'" class="inline-flex w-full">
                  <AppButton size="lg" variant="secondary" class="hero-btn-secondary w-full" :disabled="!canOpenActions">◍ Preview customer experience</AppButton>
                </RouterLink>
              </div>
              <div class="mt-3 grid gap-2 sm:grid-cols-2">
                <div class="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                  <p class="text-sm font-semibold text-white">Ready for first scan</p>
                  <p class="mt-1 text-xs text-white/70">Print your QR and place it near tables.</p>
                </div>
                <div class="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                  <p class="text-sm font-semibold text-white">Guests unlock rewards</p>
                  <p class="mt-1 text-xs text-white/70">Progress updates automatically after each stamp.</p>
                </div>
              </div>
              <p class="mt-3 text-xs font-medium text-white/65">Operational status: waiting for first guests.</p>
            </div>

            <div class="rounded-3xl bg-slate-900/70 p-4 ring-1 ring-white/10 backdrop-blur">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">Venue QR asset</p>
              <div class="mt-3 rounded-[1.4rem] bg-white p-3 shadow-xl shadow-black/30">
                <div id="dashboard-qr" class="qr-pulse mx-auto rounded-2xl bg-white p-2 ring-1 ring-slate-200">
                  <QrcodeVue v-if="landingUrl" :value="landingUrl" :size="145" level="M" render-as="canvas" :margin="2" />
                </div>
                <p class="mt-3 text-center text-xs font-semibold text-slate-600">Ready for tables</p>
              </div>
              <p class="mt-3 text-xs leading-relaxed text-slate-300">
                Print and place on tables. Guests scan to join and collect stamps instantly.
              </p>
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard>
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
    </div>

    <AppCard wrapper-class="mt-6">
      <h2 class="text-xl font-black text-slate-950">Recent activity</h2>
      <p class="mt-1 text-sm text-slate-500">This month and all-time snapshot of your loyalty program.</p>
      <div class="mt-4 space-y-2">
        <div v-for="item in activityFeed" :key="item.title" class="group flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
          <p class="flex items-center gap-2">
            <span class="text-base">{{ item.icon }}</span>
            <span>{{ item.title }}</span>
          </p>
          <span class="text-xs font-bold uppercase tracking-wide text-slate-400">{{ item.time }}</span>
        </div>
      </div>
    </AppCard>

    <AppCard wrapper-class="mt-6 overflow-hidden bg-gradient-to-br from-slate-950/95 to-slate-900/90 text-white ring-1 ring-white/10">
      <div class="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 class="text-xl font-black">Analytics preview</h2>
          <p class="mt-1 text-sm text-white/70">Analytics will appear after your first guest stamps.</p>
          <ul class="mt-4 space-y-2 text-sm font-semibold text-white/80">
            <li>• Track repeat stamps</li>
            <li>• See busiest hours</li>
            <li>• Measure reward performance</li>
          </ul>
        </div>
        <div class="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
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
.hero-shell {
  position: relative;
}

.hero-ambient {
  background:
    radial-gradient(circle at 16% 18%, rgba(56, 189, 248, 0.22), transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(99, 102, 241, 0.22), transparent 45%);
}

.live-dot {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 9999px;
  background: #34d399;
  box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.5);
  animation: livePulse 2s ease-in-out infinite;
}

.hero-btn-primary {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.35);
}

.hero-btn-secondary {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hero-btn-secondary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.22);
}

.top-scanner-btn {
  animation: scannerPulse 2.2s ease-in-out infinite;
}

.qr-pulse {
  animation: qrGlow 3s ease-in-out infinite;
}

@keyframes livePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.45); }
  50% { box-shadow: 0 0 0 7px rgba(52, 211, 153, 0); }
}

@keyframes qrGlow {
  0%, 100% { box-shadow: 0 0 0 rgba(99, 102, 241, 0); }
  50% { box-shadow: 0 0 22px rgba(99, 102, 241, 0.25); }
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
