<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'

import AppShell from '@/layouts/AppShell.vue'
import StatCard from '@/components/loyalty/StatCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { api } from '@/lib/api'
import { buildVenueLandingUrl } from '@/lib/onboarding'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Customer, Reward, Venue } from '@/types'

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
const rewards = ref<Reward[]>([])
const loading = ref(true)
const error = ref('')
const success = ref('')

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
  { label: 'Visits today', value: dashboard.value?.stats.total_visits ?? 0 },
  { label: 'Returning guests', value: dashboard.value?.stats.active_progressors ?? 0 },
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
const activityItems = computed(() => {
  if (!dashboard.value) {
    return []
  }

  if (!hasCustomers.value) {
    return [
      'Waiting for first guest scan',
      'Print your QR and place it on tables',
      'Invite staff to open scanner flow',
      'Your rewards are ready to unlock',
    ]
  }

  const visits = dashboard.value.stats.total_visits
  const guests = dashboard.value.stats.total_customers
  const unlocked = dashboard.value.stats.milestones_unlocked
  return [
    `${guests} guests joined loyalty`,
    `${visits} visits recorded`,
    `${unlocked} rewards unlocked`,
    'Scanner and QR flow are active',
  ]
})

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
    { icon: '🟢', title: `${dashboard.value?.stats.total_customers ?? 0} guests joined loyalty`, time: 'today' },
    { icon: '🟢', title: `${dashboard.value?.stats.total_visits ?? 0} visits recorded`, time: 'today' },
    { icon: '🟢', title: `${dashboard.value?.stats.milestones_unlocked ?? 0} rewards unlocked`, time: 'today' },
    { icon: '🟢', title: 'Scanner and QR flow active', time: 'live' },
  ]
})

const heroCopy = computed(() => {
  if (!hasCustomers.value) {
    return 'QR ready • Rewards active • Waiting for first guests'
  }

  return 'Loyalty active • Guests returning • Rewards unlocking'
})

const previewRewards = computed(() => rewards.value.slice(0, 3))
const canOpenActions = computed(() => Boolean(selectedVenue.value && landingUrl.value))
const primaryActionText = computed(() => (hasCustomers.value ? 'Keep scanner ready' : 'Invite your first guest'))

const setupChecklist = computed(() => {
  const rewardsReady = rewards.value.length > 0
  const venueReady = Boolean(selectedVenue.value)
  const qrReady = Boolean(landingUrl.value)
  const hasVisits = (dashboard.value?.stats.total_visits ?? 0) > 0
  const items = [
    { label: 'Venue created', done: venueReady },
    { label: 'Rewards configured', done: rewardsReady },
    { label: 'Print QR stand', done: qrReady && hasVisits },
    { label: 'Invite first guest', done: hasCustomers.value },
    { label: 'Open scanner', done: hasVisits },
  ]
  const completed = items.filter((item) => item.done).length
  return {
    items,
    completed,
    total: items.length,
    percent: Math.round((completed / items.length) * 100),
  }
})

function rewardKindFromTitle(title: string): 'free_item' | 'discount' | 'special_reward' {
  const normalized = title.toLowerCase()
  if (normalized.includes('%') || normalized.includes('off') || normalized.includes('discount')) {
    return 'discount'
  }
  if (normalized.includes('vip') || normalized.includes('gift') || normalized.includes('special')) {
    return 'special_reward'
  }
  return 'free_item'
}

function rewardFallbackStyle(title: string): string {
  const kind = rewardKindFromTitle(title)
  if (kind === 'discount') {
    return 'bg-gradient-to-br from-indigo-600 to-blue-500'
  }
  if (kind === 'special_reward') {
    return 'bg-gradient-to-br from-amber-500 to-rose-500'
  }
  return 'bg-gradient-to-br from-emerald-500 to-cyan-500'
}

function rewardIcon(title: string): string {
  const normalized = title.toLowerCase()
  if (normalized.includes('coffee')) return '☕'
  if (normalized.includes('dessert')) return '🍰'
  if (normalized.includes('cocktail')) return '🍸'
  if (normalized.includes('burger')) return '🍔'
  if (normalized.includes('%') || normalized.includes('off')) return '🏷'
  if (normalized.includes('vip')) return '✨'
  return '★'
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

function copyInviteLink() {
  if (!landingUrl.value) return
  void navigator.clipboard.writeText(landingUrl.value)
  success.value = 'Invite link copied.'
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
    rewards.value = venueId ? (await api<{ rewards: Reward[] }>(`/venues/${venueId}/rewards`)).rewards : []
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
      <div class="flex items-center gap-3">
        <div class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-xl font-black text-slate-400 shadow-sm ring-1 ring-slate-200">
          <img v-if="selectedVenue?.logo" :src="selectedVenue.logo" alt="" class="size-full object-cover">
          <span v-else>{{ title.slice(0, 1) }}</span>
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
      <p class="text-sm font-bold text-slate-500">Loading dashboard...</p>
    </AppCard>
    <AppCard v-else-if="error" wrapper-class="mb-4">
      <p class="text-sm font-bold text-red-600">{{ error }}</p>
    </AppCard>
    <AppCard v-else-if="success" wrapper-class="mb-4 border-emerald-200 bg-emerald-50">
      <p class="text-sm font-bold text-emerald-700">{{ success }}</p>
    </AppCard>

    <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard v-for="stat in stats" :key="stat.label" v-bind="stat" />
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <AppCard wrapper-class="hero-shell overflow-hidden border-slate-700/40 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-2xl shadow-slate-900/40">
        <div class="hero-ambient pointer-events-none absolute inset-0 opacity-80" />
        <div class="relative grid gap-4 p-2">
          <div class="rounded-3xl bg-white/[0.03] p-4 ring-1 ring-white/10 backdrop-blur">
            <div class="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-100">
              <span class="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 ring-1 ring-emerald-300/30"><span class="live-dot" /> QR active</span>
              <span class="inline-flex items-center gap-1 rounded-full bg-blue-400/15 px-2.5 py-1 ring-1 ring-blue-300/30"><span class="live-dot" /> Rewards live</span>
              <span class="inline-flex items-center gap-1 rounded-full bg-indigo-400/15 px-2.5 py-1 ring-1 ring-indigo-300/30"><span class="live-dot" /> Scanner ready</span>
            </div>
            <h2 class="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Your loyalty program is live</h2>
            <p class="mt-2 text-sm leading-relaxed text-white/80">Guests can now scan your QR, collect visits, and unlock rewards.</p>
          </div>

          <div class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div class="rounded-3xl bg-white/[0.03] p-4 ring-1 ring-white/10 backdrop-blur">
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
                  <p class="mt-1 text-xs text-white/70">Progress updates automatically after each visit.</p>
                </div>
              </div>
              <p class="mt-3 text-xs font-medium text-white/65">Operational status: waiting for first guests.</p>
            </div>

            <div class="rounded-3xl bg-gradient-to-b from-white/10 to-white/[0.03] p-4 ring-1 ring-white/10">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">Venue QR asset</p>
              <div class="mt-3 rounded-[1.4rem] bg-white/90 p-3 shadow-xl shadow-black/30">
                <div id="dashboard-qr" class="qr-pulse mx-auto rounded-2xl bg-white p-2 ring-1 ring-slate-200">
                  <QrcodeVue v-if="landingUrl" :value="landingUrl" :size="145" level="M" render-as="canvas" :margin="2" />
                </div>
                <p class="mt-3 text-center text-xs font-semibold text-slate-600">Ready for tables</p>
              </div>
              <div class="mt-3 rounded-2xl bg-white/10 px-3 py-2 text-xs text-white/75 ring-1 ring-white/10">
                Hospitality mode: QR printed and guests can start collecting instantly.
              </div>
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-xl font-black text-slate-950">Rewards preview</h2>
          <RouterLink to="/rewards" class="text-xs font-bold uppercase tracking-wide text-slate-500">Manage rewards</RouterLink>
        </div>
        <p class="mt-1 text-sm text-slate-500">Make rewards feel exciting and collectible for your guests.</p>
        <div v-if="previewRewards.length" class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <RouterLink
            v-for="reward in previewRewards"
            :key="reward.id"
            :to="`/rewards?reward_id=${reward.id}${selectedVenue ? `&venue_id=${selectedVenue.id}` : ''}`"
            class="group overflow-hidden rounded-2xl border border-slate-200 bg-white ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div v-if="reward.image" class="h-28 overflow-hidden">
              <img :src="reward.image" alt="" class="h-full w-full object-cover transition group-hover:scale-[1.03]">
            </div>
            <div v-else class="h-28 px-4 py-3 text-white" :class="rewardFallbackStyle(reward.title)">
              <p class="text-2xl">{{ rewardIcon(reward.title) }}</p>
              <p class="mt-1 text-xs font-bold uppercase tracking-wide opacity-90">{{ rewardKindFromTitle(reward.title).replace('_', ' ') }}</p>
            </div>
            <div class="space-y-2 p-4">
              <div class="flex items-center justify-between gap-2">
                <p class="font-black text-slate-900">{{ reward.title }}</p>
                <AppBadge :tone="reward.active ? 'green' : 'amber'">{{ reward.active ? 'Active' : 'Paused' }}</AppBadge>
              </div>
              <p class="text-xs text-slate-500">{{ reward.description || 'Reward ready for guests to unlock.' }}</p>
              <p class="text-sm font-semibold text-slate-700">{{ reward.required_stamps }} visits required</p>
              <div class="h-2 overflow-hidden rounded-full bg-slate-200">
                <div class="h-full rounded-full bg-slate-900/80" :style="{ width: `${Math.min((dashboard?.stats.total_visits ?? 0) / reward.required_stamps * 100, 100)}%` }" />
              </div>
              <p class="text-xs font-semibold text-slate-500">{{ Math.min(dashboard?.stats.total_visits ?? 0, reward.required_stamps) }} / {{ reward.required_stamps }}</p>
            </div>
          </RouterLink>
        </div>
        <div v-else class="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p class="font-semibold text-slate-700">No rewards yet</p>
          <p class="mt-1 text-sm text-slate-500">Add your first reward to start motivating repeat visits.</p>
          <RouterLink to="/rewards" class="mt-3 inline-flex"><AppButton size="sm">Create first reward</AppButton></RouterLink>
        </div>
      </AppCard>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <AppCard>
        <h2 class="text-xl font-black text-slate-950">Recent activity</h2>
        <p class="mt-1 text-sm text-slate-500">What is happening in your loyalty program right now.</p>
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

      <AppCard>
        <h2 class="text-xl font-black text-slate-950">Setup assistant</h2>
        <p class="mt-1 text-sm text-slate-500">Keep momentum. Follow these steps to launch fully.</p>
        <div class="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div class="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
            <span>Setup progress</span>
            <span>{{ setupChecklist.percent }}%</span>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div class="h-full rounded-full bg-slate-900" :style="{ width: `${setupChecklist.percent}%` }" />
          </div>
          <div class="mt-3 space-y-2">
            <div v-for="item in setupChecklist.items" :key="item.label" class="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
              <p class="text-sm font-semibold text-slate-700">{{ item.label }}</p>
              <span class="text-xs font-black" :class="item.done ? 'text-emerald-600' : 'text-slate-400'">{{ item.done ? '✓' : '→' }}</span>
            </div>
          </div>
        </div>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <RouterLink :to="selectedVenue ? `/scanner?venue_id=${selectedVenue.id}` : '/scanner'"><AppButton class="w-full">{{ primaryActionText }}</AppButton></RouterLink>
          <AppButton variant="secondary" class="w-full" @click="downloadQrPng">Download QR</AppButton>
        </div>
      </AppCard>
    </div>

    <AppCard wrapper-class="mt-6 overflow-hidden bg-gradient-to-br from-slate-950/95 to-slate-900/90 text-white ring-1 ring-white/10">
      <div class="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 class="text-xl font-black">Analytics preview</h2>
          <p class="mt-1 text-sm text-white/70">Analytics will appear after your first guest visits.</p>
          <ul class="mt-4 space-y-2 text-sm font-semibold text-white/80">
            <li>• Track repeat visits</li>
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

    <AppCard wrapper-class="mt-6">
      <h2 class="text-xl font-black text-slate-950">How rewards work</h2>
      <p class="mt-1 text-sm text-slate-500">Guests love achievable rewards that feel close and clear.</p>
      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <div class="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 ring-1 ring-slate-200">
          <p class="text-sm font-black text-slate-900">☕ Free coffee reward</p>
          <p class="mt-1 text-xs text-slate-500">5 visits required</p>
          <div class="mt-3 h-2 rounded-full bg-slate-200"><div class="h-full w-3/5 rounded-full bg-emerald-500" /></div>
          <p class="mt-2 text-xs font-semibold text-slate-600">Unlocked after visit #5</p>
          <AppBadge tone="green" class="mt-2">Most popular</AppBadge>
        </div>
        <div class="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 ring-1 ring-slate-200">
          <p class="text-sm font-black text-slate-900">🏷 20% OFF reward</p>
          <p class="mt-1 text-xs text-slate-500">10 visits required</p>
          <div class="mt-3 h-2 rounded-full bg-slate-200"><div class="h-full w-2/5 rounded-full bg-blue-500" /></div>
          <p class="mt-2 text-xs font-semibold text-slate-600">Claimed when customer redeems</p>
          <AppBadge tone="blue" class="mt-2">Next unlock</AppBadge>
        </div>
        <div class="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 ring-1 ring-slate-200">
          <p class="text-sm font-black text-slate-900">🍰 Free dessert reward</p>
          <p class="mt-1 text-xs text-slate-500">15 visits required</p>
          <div class="mt-3 h-2 rounded-full bg-slate-200"><div class="h-full w-1/4 rounded-full bg-indigo-500" /></div>
          <p class="mt-2 text-xs font-semibold text-slate-600">Encourages long-term retention</p>
          <AppBadge tone="amber" class="mt-2">VIP journey</AppBadge>
        </div>
      </div>
    </AppCard>

    <AppCard wrapper-class="mt-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white ring-1 ring-white/10">
      <h2 class="text-xl font-black">Guest journey preview</h2>
      <p class="mt-1 text-sm text-white/70">Scan → collect visits → unlock reward. Your venue is ready for this loop.</p>
      <div class="mt-4 grid gap-2 sm:grid-cols-3">
        <div class="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">1) Guest scans table QR</div>
        <div class="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">2) Staff stamps visit instantly</div>
        <div class="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">3) Reward unlock drives return</div>
      </div>
    </AppCard>
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
