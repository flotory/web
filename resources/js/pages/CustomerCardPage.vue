<script setup lang="ts">
import QrcodeVue from 'qrcode.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import CustomerRewardWallet from '@/components/loyalty/CustomerRewardWallet.vue'
import VenueLandingPreview from '@/components/loyalty/VenueLandingPreview.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { api } from '@/lib/api'
import { venueCoverUrl, venueLogoUrl } from '@/lib/venueMedia'
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
const selectedReward = ref<Reward | null>(null)
let refreshTimer: number | undefined

interface CardResponse {
  active_card: Customer | null
  next_reward: Reward | null
  available_rewards: Reward[]
  journey: RewardJourney | null
  recent_visits: Visit[]
}

const previewMilestones = computed(() =>
  (journey.value?.milestones ?? []).map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    description: milestone.description ?? null,
    image: milestone.image ?? null,
    image_thumb: milestone.image_thumb ?? null,
    required_stamps: milestone.required_stamps,
  })),
)
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
    const response = await fetchCard()
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
  successMessage.value = payload.message
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
  successMessage.value = `${selectedReward.value?.title ?? 'Reward'} claimed. Progress continues at ${response.customer.stamps} stamps.`
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
    <div class="relative mx-auto w-full max-w-md">
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40"
        aria-hidden="true"
        style="background-image: radial-gradient(circle at 1px 1px, rgb(203 213 225 / 0.45) 1px, transparent 0); background-size: 18px 18px;"
      />

      <div v-if="loading" class="relative z-10 py-8">
        <AppCard>
          <p class="text-center text-sm font-semibold text-slate-500">Loading your card...</p>
        </AppCard>
      </div>

      <div v-else-if="error" class="relative z-10 py-8">
        <AppCard>
          <p class="text-center text-sm font-semibold text-red-600">{{ error }}</p>
          <AppButton class="mt-4 w-full" @click="loadCard">Try again</AppButton>
        </AppCard>
      </div>

      <template v-else-if="card">
        <header v-if="card.venue" class="relative z-10 -mx-4 sm:mx-0">
          <div class="relative h-36 w-full overflow-hidden sm:h-40 sm:rounded-3xl">
            <img :src="venueCoverUrl(card.venue)" alt="" class="size-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-b from-slate-950/15 via-slate-950/5 to-slate-100" />
          </div>
        </header>

        <section class="relative z-10 flex flex-col">
          <div v-if="card.venue" class="-mt-12 flex flex-col items-center text-center">
            <div class="grid size-24 place-items-center overflow-hidden rounded-full bg-white p-1 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/80">
              <img :src="venueLogoUrl(card.venue)" :alt="card.venue.name" class="size-full rounded-full object-cover">
            </div>
            <AppBadge tone="amber" class="mt-4">Your loyalty card</AppBadge>
            <h1 class="mt-2 text-2xl font-black tracking-tight text-slate-950">{{ card.venue.name }}</h1>
            <p class="mt-1 text-sm font-medium text-slate-500">Earn stamps and unlock rewards.</p>
          </div>

          <div v-else class="text-center">
            <AppBadge tone="amber">Your loyalty card</AppBadge>
            <h1 class="mt-3 text-2xl font-black tracking-tight text-slate-950">Your loyalty card</h1>
            <p class="mt-1 text-sm font-medium text-slate-500">Earn stamps and unlock rewards.</p>
          </div>

          <p
            v-if="successMessage"
            class="mt-5 rounded-2xl bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100"
          >
            {{ successMessage }}
          </p>

          <AppCard
            wrapper-class="mt-5 w-full rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.18)] sm:p-6"
            :padded="false"
          >
            <h2 class="text-xl font-black text-slate-950 sm:text-2xl">Show this to staff</h2>
            <p class="mt-1 text-sm text-slate-500">
              After you order, staff scan this QR to add a stamp to your card.
            </p>

            <div class="mt-5 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
              <div class="mx-auto rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <QrcodeVue
                  :value="card.qr_token"
                  :size="200"
                  level="M"
                  render-as="canvas"
                  :margin="2"
                />
              </div>
              <div class="text-center sm:text-left">
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">How it works</p>
                <ol class="mt-3 space-y-2 text-sm text-slate-600">
                  <li class="flex gap-2">
                    <span class="font-bold text-slate-900">1.</span>
                    <span>Place your order at the counter or table.</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="font-bold text-slate-900">2.</span>
                    <span>Show this screen to staff — they scan the QR.</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="font-bold text-slate-900">3.</span>
                    <span>Your stamp count updates right here.</span>
                  </li>
                </ol>
                <p class="mt-3 text-xs font-semibold text-slate-400">Keep brightness up for easy scanning.</p>
              </div>
            </div>
          </AppCard>

          <div class="mt-5">
            <VenueLandingPreview :milestones="previewMilestones" :stamps="card.stamps" />

            <p
              v-if="!previewMilestones.length"
              class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-center text-sm text-slate-500"
            >
              Rewards are being set up. Your next stamp is on the way.
            </p>
          </div>

          <div v-if="journey?.milestones?.length" class="mt-4 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Reward status</p>
            <div
              v-for="milestone in journey.milestones.slice(0, 4)"
              :key="milestone.id"
              class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
            >
              <p class="min-w-0 truncate text-sm font-bold text-slate-800">
                {{ milestone.required_stamps }} stamps → {{ milestone.title }}
              </p>
              <AppBadge :tone="milestone.claimed ? 'blue' : (milestone.unlocked ? 'green' : 'amber')">
                {{ milestone.claimed ? 'Claimed' : (milestone.unlocked ? 'Unlocked' : 'Locked') }}
              </AppBadge>
            </div>
          </div>

          <AppButton
            v-if="availableRewards.length"
            class="mt-6 w-full shadow-[0_18px_40px_-20px_rgba(15,23,42,0.45)]"
            size="lg"
            @click="openRewardWallet"
          >
            Redeem unlocked reward
          </AppButton>
        </section>
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
