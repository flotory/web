<script setup lang="ts">
import QrcodeVue from 'qrcode.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import CustomerRewardWallet from '@/components/loyalty/CustomerRewardWallet.vue'
import ProgressStamps from '@/components/loyalty/ProgressStamps.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { api } from '@/lib/api'
import AppShell from '@/layouts/AppShell.vue'
import { useRealtimeStore } from '@/stores/realtime'
import type { Customer, Reward, RewardJourney, StampAddedPayload, Visit } from '@/types'

interface RedemptionResponse {
  customer: Customer
  next_reward: Reward | null
  available_rewards: Reward[]
  journey: RewardJourney
  recent_visits: Visit[]
}

const route = useRoute()
const realtime = useRealtimeStore()
const loading = ref(true)
const error = ref('')
const card = ref<Customer | null>(null)
const nextReward = ref<Reward | null>(null)
const availableRewards = ref<Reward[]>([])
const journey = ref<RewardJourney | null>(null)
const recentVisits = ref<Visit[]>([])
const successMessage = ref('')
const highlightedStamp = ref<number | null>(null)
const selectedReward = ref<Reward | null>(null)
let refreshTimer: number | undefined

interface CardResponse {
  active_card: Customer | null
  next_reward: Reward | null
  available_rewards: Reward[]
  journey: RewardJourney | null
  recent_visits: Visit[]
}

const displayReward = computed(() => availableRewards.value[0] ?? nextReward.value)
const requiredStamps = computed(() => displayReward.value?.required_stamps ?? 5)
const remainingVisits = computed(() => Math.max(requiredStamps.value - (card.value?.stamps ?? 0), 0))
const selectedVenueId = computed(() => {
  const venueId = route.query.venue_id
  return typeof venueId === 'string' ? venueId : null
})

async function fetchCard(): Promise<CardResponse> {
  return api<CardResponse>(`/customer/cards${selectedVenueId.value ? `?venue_id=${selectedVenueId.value}` : ''}`)
}

async function loadCard(silent = false) {
  if (!silent) {
    loading.value = true
    error.value = ''
  }

  try {
    let response = await fetchCard()

    if (!response.active_card) {
      await api<{ customer: Customer }>('/venues/demo-cafe/join', { method: 'POST' })
      response = await fetchCard()
    }

    card.value = response.active_card
    nextReward.value = response.next_reward
    availableRewards.value = response.available_rewards
    journey.value = response.journey
    recentVisits.value = response.recent_visits
  } catch {
    if (!silent) {
      error.value = 'Could not load your loyalty card. Please try again.'
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

function applyRealtimeStamp(payload: StampAddedPayload) {
  if (!card.value || payload.customer.id !== card.value.id) {
    return
  }

  card.value = payload.customer
  nextReward.value = payload.next_reward
  availableRewards.value = payload.available_rewards
  if (journey.value) {
    journey.value = {
      ...journey.value,
      current_cycle: payload.current_cycle,
      current_stamps: payload.customer.stamps,
      milestones: payload.milestones,
      next_milestone: payload.next_reward,
    }
  }
  highlightedStamp.value = payload.stamps
  successMessage.value = payload.message

  window.setTimeout(() => {
    highlightedStamp.value = null
  }, 1800)
}

function refreshIfVisible() {
  if (document.visibilityState === 'visible') {
    loadCard(true)
  }
}

function openRewardWallet() {
  if (!availableRewards.value.length) return

  selectedReward.value = availableRewards.value[0]
}

function closeRewardWallet() {
  selectedReward.value = null
}

function applyRedemption(response: RedemptionResponse) {
  card.value = response.customer
  nextReward.value = response.next_reward
  availableRewards.value = response.available_rewards
  journey.value = response.journey
  recentVisits.value = response.recent_visits
  successMessage.value = `${selectedReward.value?.title ?? 'Reward'} claimed. Progress continues at ${response.customer.stamps} visits.`
}

onMounted(() => {
  loadCard()
  window.addEventListener('focus', refreshIfVisible)
  document.addEventListener('visibilitychange', refreshIfVisible)
  refreshTimer = window.setInterval(() => loadCard(true), 10000)
})

onUnmounted(() => {
  window.removeEventListener('focus', refreshIfVisible)
  document.removeEventListener('visibilitychange', refreshIfVisible)
  window.clearInterval(refreshTimer)
})

watch(() => route.query.venue_id, () => loadCard())

watch(
  () => realtime.latestStamp,
  (payload) => {
    if (payload) {
      applyRealtimeStamp(payload)
    }
  },
)
</script>

<template>
  <AppShell>
    <div class="mx-auto max-w-md">
      <div class="flex items-center gap-4">
        <div class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white text-xl font-black text-slate-400 shadow-sm ring-1 ring-slate-200">
          <img v-if="card?.venue?.logo" :src="card.venue.logo" alt="" class="size-full object-cover">
          <span v-else>{{ card?.venue?.name?.slice(0, 1) ?? 'L' }}</span>
        </div>
        <div>
          <AppBadge tone="amber">Customer loyalty card</AppBadge>
          <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">{{ card?.venue?.name ?? 'Your loyalty card' }}</h1>
        </div>
      </div>
      <p class="mt-2 text-slate-500">Show this QR to staff after ordering.</p>

      <AppCard v-if="successMessage" wrapper-class="mt-6 border-emerald-200 bg-emerald-50">
        <p class="text-sm font-black text-emerald-700">{{ successMessage }}</p>
      </AppCard>

      <AppCard v-if="loading" wrapper-class="mt-6">
        <p class="text-sm font-bold text-slate-500">Loading your card...</p>
      </AppCard>

      <AppCard v-else-if="error" wrapper-class="mt-6">
        <p class="text-sm font-bold text-red-600">{{ error }}</p>
        <AppButton class="mt-4" @click="loadCard">Retry</AppButton>
      </AppCard>

      <template v-else-if="card">
      <AppCard wrapper-class="mt-6 bg-gradient-to-br from-slate-950 to-blue-950 p-6 text-white">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-bold text-blue-100">Current progress</p>
            <p class="mt-1 text-4xl font-black">{{ card.stamps }} / {{ requiredStamps }}</p>
          </div>
          <AppBadge tone="blue">
            {{ remainingVisits === 0 ? 'Unlocked' : `${remainingVisits} visits left` }}
          </AppBadge>
        </div>
        <div class="mt-8 rounded-[1.5rem] bg-white p-5">
          <ProgressStamps :stamps="card.stamps" :required="requiredStamps" :highlighted-stamp="highlightedStamp" />
        </div>
        <p v-if="displayReward" class="mt-5 text-sm font-bold text-blue-100">
          Reward: {{ displayReward.title }}
        </p>
        <AppButton
          v-if="availableRewards.length"
          class="mt-5 w-full"
          variant="secondary"
          @click="openRewardWallet"
        >
          Redeem unlocked reward
        </AppButton>
      </AppCard>

      <AppCard wrapper-class="mt-4 text-center">
        <div class="mx-auto inline-flex rounded-[2rem] bg-white p-4 ring-1 ring-slate-200">
          <QrcodeVue :value="card.qr_token" :size="220" level="M" />
        </div>
        <p class="mt-4 text-sm font-medium text-slate-500">Personal loyalty QR</p>
      </AppCard>

      </template>
    </div>

    <CustomerRewardWallet
      v-if="selectedReward && card"
      :customer="card"
      :restaurant="card.venue"
      :reward="selectedReward"
      @close="closeRewardWallet"
      @redeemed="applyRedemption"
    />
  </AppShell>
</template>
