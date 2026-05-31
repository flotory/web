<script setup lang="ts">
import { CreditCard } from '@lucide/vue'
import QrcodeVue from 'qrcode.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import CustomerRewardWallet from '@/components/loyalty/CustomerRewardWallet.vue'
import StampRewardCelebration from '@/components/loyalty/StampRewardCelebration.vue'
import VenueLandingPreview from '@/components/loyalty/VenueLandingPreview.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { venueCoverUrl, venueLogoThumbUrl } from '@/lib/venueMedia'
import AppShell from '@/layouts/AppShell.vue'
import { useCustomerRewardsStore } from '@/stores/customerRewards'
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
const router = useRouter()
const realtime = useRealtimeStore()
const customerRewards = useCustomerRewardsStore()
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
const celebrationSubtitle = ref('')
const showCelebration = ref(false)
const displayStamps = ref<number | null>(null)
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
const previewStamps = computed(() => displayStamps.value ?? card.value?.stamps ?? 0)
const selectedVenueId = computed(() => {
  const venueId = route.query.venue_id
  return typeof venueId === 'string' ? venueId : null
})

async function fetchCard(): Promise<CardResponse> {
  return api<CardResponse>(`/customer/cards${selectedVenueId.value ? `?venue_id=${selectedVenueId.value}` : ''}`)
}

async function loadCard(silent = false) {
  const priorStamps = card.value?.stamps
  const priorAvailableIds = new Set(availableRewards.value.map((reward) => reward.id))
  const priorCardId = card.value?.id

  if (!silent) {
    loading.value = true
    error.value = ''
  }

  try {
    const response = await fetchCard()

    if (
      silent &&
      priorCardId &&
      response.active_card?.id === priorCardId &&
      priorStamps !== undefined &&
      response.journey &&
      response.active_card.venue
    ) {
      const stampsChanged = response.active_card.stamps !== priorStamps
      const newRewards = response.available_rewards.filter((reward) => !priorAvailableIds.has(reward.id))

      if (stampsChanged || newRewards.length > 0) {
        const maxStamps = Math.max(...(response.journey.milestones.map((m) => m.required_stamps) ?? [10]), 10)
        const cycleCompleted = response.active_card.stamps < priorStamps

        applyStampUpdate({
          customer: response.active_card,
          venue: response.active_card.venue,
          previous_stamps: priorStamps,
          added_stamps: cycleCompleted ? maxStamps - priorStamps : response.active_card.stamps - priorStamps,
          stamps: response.active_card.stamps,
          next_reward: response.next_reward,
          available_rewards: response.available_rewards,
          milestones: response.journey.milestones,
          current_cycle: response.journey.current_cycle,
          cycle_completed: cycleCompleted,
          message: '',
          occurred_at: new Date().toISOString(),
        })
        return
      }
    }

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
  } catch (exception) {
    if (!silent) {
      error.value = apiErrorMessage(exception, 'Could not load your loyalty card. Please try again.')
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

function rewardEarnedThisScan(
  payload: StampAddedPayload,
  previousAvailableIds: Set<number>,
  maxStamps: number,
): Reward | null {
  const newlyListed = payload.available_rewards.find((reward) => !previousAvailableIds.has(reward.id))
  if (newlyListed) {
    return newlyListed
  }

  const effectiveStamps = payload.cycle_completed
    ? maxStamps
    : payload.previous_stamps + payload.added_stamps

  const crossed = payload.available_rewards
    .filter(
      (reward) =>
        reward.required_stamps > payload.previous_stamps &&
        reward.required_stamps <= effectiveStamps,
    )
    .sort((a, b) => b.required_stamps - a.required_stamps)

  if (crossed.length > 0) {
    return crossed[0] ?? null
  }

  if (payload.cycle_completed && payload.available_rewards.length > 0) {
    return payload.available_rewards
      .slice()
      .sort((a, b) => b.required_stamps - a.required_stamps)[0] ?? null
  }

  return null
}

function stampUpdateSignature(payload: StampAddedPayload): string {
  return [
    payload.customer.id,
    payload.previous_stamps,
    payload.stamps,
    payload.added_stamps,
    payload.cycle_completed,
  ].join(':')
}

let lastAnimatedStampSignature = ''

function slotsForStampIncrease(previousStamps: number, addedStamps: number, cycleCompleted: boolean, maxStamps: number): number[] {
  if (cycleCompleted) {
    const slots: number[] = []
    for (let position = previousStamps + 1; position <= maxStamps; position += 1) {
      slots.push(position)
    }

    return slots.length ? slots : [maxStamps]
  }

  const slots: number[] = []
  for (let position = previousStamps + 1; position <= previousStamps + addedStamps; position += 1) {
    if (position <= maxStamps) {
      slots.push(position)
    }
  }

  return slots
}

function triggerStampAnimation(payload: StampAddedPayload, maxStamps: number) {
  animatingSlots.value = slotsForStampIncrease(
    payload.previous_stamps,
    payload.added_stamps,
    payload.cycle_completed,
    maxStamps,
  )
  window.clearTimeout(animationTimer)
  animationTimer = window.setTimeout(() => {
    animatingSlots.value = []
  }, 1400)
}

function triggerRewardCelebration(
  rewardTitle: string,
  options?: { cycleCompleted?: boolean; resetStampsTo?: number },
) {
  celebrationTitle.value = rewardTitle
  celebrationSubtitle.value = 'Saved to your Rewards tab — redeem when you are ready.'
  showCelebration.value = true
  celebratingReward.value = true
  window.clearTimeout(celebrationTimer)
  celebrationTimer = window.setTimeout(() => {
    showCelebration.value = false
    celebratingReward.value = false
    if (options?.cycleCompleted && options.resetStampsTo !== undefined) {
      displayStamps.value = options.resetStampsTo
    }

    customerRewards.refresh()
      .catch(() => undefined)
      .finally(() => {
        customerRewards.pulseBadge()
      })
  }, 2400)
}

function applyStampUpdate(payload: StampAddedPayload) {
  if (!card.value || payload.customer.id !== card.value.id) {
    return
  }

  const signature = stampUpdateSignature(payload)
  if (signature === lastAnimatedStampSignature) {
    return
  }
  lastAnimatedStampSignature = signature

  const previousAvailableIds = new Set(availableRewards.value.map((reward) => reward.id))
  const maxStamps = Math.max(...(journey.value?.milestones.map((m) => m.required_stamps) ?? [10]), 10)

  if (payload.cycle_completed) {
    displayStamps.value = maxStamps
  } else {
    displayStamps.value = null
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

  triggerStampAnimation(payload, maxStamps)

  const unlockedReward = rewardEarnedThisScan(payload, previousAvailableIds, maxStamps)
  if (unlockedReward) {
    if (payload.cycle_completed) {
      window.setTimeout(() => {
        triggerRewardCelebration(unlockedReward.title, {
          cycleCompleted: true,
          resetStampsTo: payload.customer.stamps,
        })
      }, 900)
    } else {
      triggerRewardCelebration(unlockedReward.title)
    }
  } else if (payload.cycle_completed) {
    window.setTimeout(() => {
      displayStamps.value = payload.customer.stamps
    }, 900)
  }

  if (!unlockedReward) {
    customerRewards.refresh().catch(() => undefined)
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
  customerRewards.refresh().catch(() => undefined)
}

async function handleRewardRedeemed(response: RedemptionResponse) {
  applyRedemption(response)
}

function handleRewardFinished() {
  selectedReward.value = null
  router.push('/customer/rewards')
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
        <EmptyState compact title="Loading your card…" />
      </div>

      <div v-else-if="error" class="px-4 py-8">
        <ErrorState :message="error" @retry="loadCard()" />
      </div>

      <div v-else-if="!card" class="px-4 py-8">
        <EmptyState
          :icon="CreditCard"
          title="No loyalty card yet"
          description="Join a venue to start collecting stamps and unlocking rewards."
        >
          <RouterLink to="/customer/venues">
            <AppButton>Browse venues</AppButton>
          </RouterLink>
        </EmptyState>
      </div>

      <template v-else>
        <header v-if="card.venue" class="relative z-10">
          <div class="relative h-24 w-full overflow-hidden sm:h-28">
            <img :src="venueCoverUrl(card.venue)" alt="" class="size-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/5 to-slate-100" />
          </div>
        </header>

        <section class="relative z-10 flex flex-col px-4">
          <div v-if="card.venue" class="-mt-8 flex items-center gap-3 px-1">
            <div class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-0.5 shadow-md ring-1 ring-slate-200/80">
              <img :src="venueLogoThumbUrl(card.venue)" :alt="card.venue.name" class="size-full rounded-[14px] object-cover">
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
              :stamps="previewStamps"
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

    <Teleport to="body">
      <StampRewardCelebration
        :visible="showCelebration"
        :title="celebrationTitle"
        :subtitle="celebrationSubtitle"
      />
    </Teleport>

    <CustomerRewardWallet
      v-if="selectedReward && card"
      :customer="card"
      :restaurant="card.venue"
      :reward="selectedReward"
      @close="closeRewardWallet"
      @redeemed="handleRewardRedeemed"
      @finished="handleRewardFinished"
    />
  </AppShell>
</template>
