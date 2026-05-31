<script setup lang="ts">
import QrcodeVue from 'qrcode.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import CustomerRewardWallet from '@/components/loyalty/CustomerRewardWallet.vue'
import StampRewardCelebration from '@/components/loyalty/StampRewardCelebration.vue'
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
const selectedReward = ref<Reward | null>(null)
const animatingSlots = ref<number[]>([])
const celebratingReward = ref(false)
const celebrationTitle = ref('')
const showCelebration = ref(false)
let refreshTimer: number | undefined
let animationTimer: number | undefined
let celebrationTimer: number | undefined

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

    const pendingStamp = realtime.latestStamp
    if (pendingStamp && card.value && pendingStamp.customer.id === card.value.id) {
      applyStampUpdate(pendingStamp)
      realtime.clearLatestStamp()
    }
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

function slotsForStampIncrease(previousStamps: number, addedStamps: number, cycleCompleted: boolean, maxStamps: number): number[] {
  if (cycleCompleted) {
    return Array.from({ length: Math.min(addedStamps, maxStamps) }, (_, index) => index + 1)
  }

  const slots: number[] = []
  for (let position = previousStamps + 1; position <= previousStamps + addedStamps; position += 1) {
    if (position <= maxStamps) {
      slots.push(position)
    }
  }

  return slots
}

function triggerStampAnimation(previousStamps: number, addedStamps: number, cycleCompleted: boolean) {
  const maxStamps = Math.max(...(journey.value?.milestones.map((m) => m.required_stamps) ?? [10]), 10)
  animatingSlots.value = slotsForStampIncrease(previousStamps, addedStamps, cycleCompleted, maxStamps)
  window.clearTimeout(animationTimer)
  animationTimer = window.setTimeout(() => {
    animatingSlots.value = []
    celebratingReward.value = false
  }, 1400)
}

function triggerRewardCelebration(rewardTitle: string) {
  celebrationTitle.value = rewardTitle
  showCelebration.value = true
  celebratingReward.value = true
  window.clearTimeout(celebrationTimer)
  celebrationTimer = window.setTimeout(() => {
    showCelebration.value = false
  }, 1100)
}

function applyStampUpdate(payload: StampAddedPayload) {
  if (!card.value || payload.customer.id !== card.value.id) {
    return
  }

  const previousAvailableIds = new Set(availableRewards.value.map((reward) => reward.id))
  const previousStamps = card.value.stamps

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

  triggerStampAnimation(previousStamps, payload.added_stamps, payload.cycle_completed)

  const unlockedReward = payload.available_rewards.find((reward) => !previousAvailableIds.has(reward.id))
  if (unlockedReward) {
    triggerRewardCelebration(unlockedReward.title)
  }
}

function applyRealtimeStamp(payload: StampAddedPayload) {
  applyStampUpdate(payload)
  realtime.clearLatestStamp()
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
  window.clearTimeout(animationTimer)
  window.clearTimeout(celebrationTimer)
})

watch(() => route.query.venue_id, () => loadCard())

watch(
  () => realtime.latestStamp,
  (payload) => {
    if (payload && card.value && payload.customer.id === card.value.id) {
      applyRealtimeStamp(payload)
    }
  },
)
</script>

<template>
  <AppShell>
    <div class="relative mx-auto w-full max-w-md">
      <div v-if="loading" class="px-4 py-8">
        <AppCard>
          <p class="text-center text-sm font-semibold text-slate-500">Loading your card...</p>
        </AppCard>
      </div>

      <div v-else-if="error" class="px-4 py-8">
        <AppCard>
          <p class="text-center text-sm font-semibold text-red-600">{{ error }}</p>
          <AppButton class="mt-4 w-full" @click="loadCard">Try again</AppButton>
        </AppCard>
      </div>

      <template v-else-if="card">
        <header v-if="card.venue" class="relative z-10">
          <div class="relative h-24 w-full overflow-hidden sm:h-28">
            <img :src="venueCoverUrl(card.venue)" alt="" class="size-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/5 to-slate-100" />
          </div>
        </header>

        <section class="relative z-10 flex flex-col px-4">
          <div v-if="card.venue" class="-mt-8 flex items-center gap-3 px-1">
            <div class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-0.5 shadow-md ring-1 ring-slate-200/80">
              <img :src="venueLogoUrl(card.venue)" :alt="card.venue.name" class="size-full rounded-[14px] object-cover">
            </div>
            <h1 class="text-xl font-black tracking-tight text-slate-950">{{ card.venue.name }}</h1>
          </div>

          <AppCard
            wrapper-class="mt-5 w-full rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.18)] sm:p-6"
            :padded="false"
          >
            <h2 class="text-center text-lg font-black text-slate-950">Show this to staff</h2>
            <p class="mt-1 text-center text-sm text-slate-500">
              Staff scan this QR to add a stamp.
            </p>

            <div class="mt-4 flex justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                <QrcodeVue
                  :value="card.qr_token"
                  :size="200"
                  level="M"
                  render-as="canvas"
                  :margin="2"
                />
              </div>
            </div>
          </AppCard>

          <div class="mt-5">
            <VenueLandingPreview
              :milestones="previewMilestones"
              :stamps="card.stamps"
              :animating-slots="animatingSlots"
              :celebrating-reward="celebratingReward"
            />

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

    <StampRewardCelebration :visible="showCelebration" :title="celebrationTitle" />

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
