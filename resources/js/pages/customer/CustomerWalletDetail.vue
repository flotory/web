<script setup lang="ts">
import { ChevronLeft, Gift, QrCode, Wallet } from '@lucide/vue'
import QrcodeVue from 'qrcode.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CustomerRewardWallet from '@/components/loyalty/CustomerRewardWallet.vue'
import StampRewardCelebration from '@/components/loyalty/StampRewardCelebration.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { venueCoverUrl } from '@/lib/venueMedia'
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
const showQr = ref(false)
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

const previewStamps = computed(() => displayStamps.value ?? card.value?.stamps ?? 0)
const sortedMilestones = computed(() =>
  [...(journey.value?.milestones ?? [])].sort((a, b) => a.required_stamps - b.required_stamps),
)
const journeyMaxStamps = computed(() => Math.max(10, sortedMilestones.value.at(-1)?.required_stamps ?? 10))
const journeyRows = computed(() => {
  const rows: number[][] = []
  for (let start = 1; start <= journeyMaxStamps.value; start += 5) {
    const row: number[] = []
    for (let stamp = start; stamp < start + 5 && stamp <= journeyMaxStamps.value; stamp += 1) {
      row.push(stamp)
    }
    rows.push(row)
  }
  return rows
})
const nextRewardStampsRemaining = computed(() =>
  nextReward.value ? Math.max(nextReward.value.required_stamps - previewStamps.value, 0) : 0,
)
const focusReward = computed(() => availableRewards.value[0] ?? nextReward.value)
const hasReadyReward = computed(() => availableRewards.value.length > 0)
const focusRewardProgress = computed(() => {
  if (!focusReward.value) return ''
  return `${Math.min(previewStamps.value, focusReward.value.required_stamps)} / ${focusReward.value.required_stamps} stamps collected`
})
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
      error.value = apiErrorMessage(exception, 'Could not load this card. Please try again.')
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

function isGiftStamp(stamp: number): boolean {
  return sortedMilestones.value.some((milestone) => milestone.required_stamps === stamp)
}

function isStampCollected(stamp: number): boolean {
  return stamp <= previewStamps.value
}

function isStampAnimating(stamp: number): boolean {
  return animatingSlots.value.includes(stamp)
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

function backToWallet() {
  router.push({ name: 'customer-wallet' })
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
        <EmptyState compact title="Loading card…" />
      </div>

      <div v-else-if="error" class="px-4 py-8">
        <ErrorState :message="error" @retry="loadCard()" />
      </div>

      <div v-else-if="!card" class="px-4 py-8">
        <EmptyState
          :icon="Wallet"
          title="Card not found"
          description="This venue is not in your wallet yet."
        >
          <AppButton @click="backToWallet">Back to wallet</AppButton>
        </EmptyState>
      </div>

      <template v-else>
        <header v-if="card.venue" class="relative z-10">
          <div class="relative h-36 w-full overflow-hidden sm:h-40">
            <img :src="venueCoverUrl(card.venue)" :alt="card.venue.name" class="size-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-slate-950/10" />
            <button
              type="button"
              class="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              @click="backToWallet"
            >
              <ChevronLeft class="size-4" />
              Wallet
            </button>
            <div class="absolute bottom-4 left-4 right-4">
              <h1 class="text-2xl font-black tracking-tight text-white">{{ card.venue.name }}</h1>
              <p class="mt-1 text-sm font-medium text-white/85">Collect stamps. Unlock rewards.</p>
            </div>
          </div>
        </header>

        <section class="relative z-10 -mt-4 flex flex-col px-4 pb-8">
          <AppCard wrapper-class="w-full rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.16)] sm:p-6">
            <div class="flex items-end justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Your progress</p>
                <p class="mt-2 text-4xl font-black leading-none text-slate-950">{{ previewStamps }}</p>
                <p class="mt-1 text-sm font-medium text-slate-500">stamps collected</p>
              </div>
              <p v-if="nextReward" class="text-right text-sm font-semibold text-slate-600">
                {{ nextRewardStampsRemaining }} {{ nextRewardStampsRemaining === 1 ? 'stamp' : 'stamps' }} to next reward
              </p>
            </div>

            <div class="mt-5 space-y-2.5">
              <div
                v-for="(row, rowIndex) in journeyRows"
                :key="`row-${rowIndex}`"
                class="grid grid-cols-5 gap-2.5"
              >
                <div
                  v-for="stamp in row"
                  :key="stamp"
                  class="grid h-12 place-items-center rounded-2xl text-sm font-black transition"
                  :class="[
                    isGiftStamp(stamp)
                      ? isStampCollected(stamp)
                        ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                        : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'
                      : isStampCollected(stamp)
                        ? 'bg-slate-950 text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.6)]'
                        : 'bg-white text-slate-400 ring-1 ring-slate-200',
                    isStampAnimating(stamp) ? 'scale-105 animate-pulse' : '',
                  ]"
                >
                  <Gift v-if="isGiftStamp(stamp)" class="size-4" />
                  <span v-else>{{ stamp }}</span>
                </div>
              </div>
            </div>
          </AppCard>

          <AppCard v-if="focusReward" wrapper-class="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.2)] sm:p-6">
            <template v-if="hasReadyReward">
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">Reward ready</p>
              <h2 class="mt-2 text-3xl font-black leading-tight text-slate-950">🎉 Reward Ready</h2>
              <p class="mt-2 text-lg font-semibold text-slate-800">{{ focusReward.title }}</p>
              <AppButton
                class="mt-5 w-full shadow-[0_18px_40px_-20px_rgba(15,23,42,0.45)]"
                size="lg"
                @click="openRewardWallet"
              >
                Claim reward
              </AppButton>
            </template>
            <template v-else>
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Next reward</p>
              <h2 class="mt-2 text-2xl font-black leading-tight text-slate-950">🎁 {{ focusReward.title }}</h2>
              <p class="mt-3 text-base font-semibold text-slate-700">
                {{ nextRewardStampsRemaining }} {{ nextRewardStampsRemaining === 1 ? 'stamp' : 'stamps' }} remaining
              </p>
              <p class="mt-1 text-sm text-slate-500">{{ focusRewardProgress }}</p>
            </template>
          </AppCard>

          <AppCard wrapper-class="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
              @click="showQr = !showQr"
            >
              <span class="inline-flex items-center gap-2">
                <QrCode class="size-4" />
                {{ showQr ? 'Hide QR code' : 'Show QR for staff scan' }}
              </span>
              <span class="text-xs font-bold uppercase tracking-wide text-slate-400">{{ showQr ? 'Hide' : 'Show' }}</span>
            </button>

            <div v-if="showQr" class="mt-4 flex justify-center rounded-2xl bg-slate-50 p-4">
              <div class="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                <QrcodeVue
                  :value="card.qr_token"
                  :size="184"
                  level="M"
                  render-as="canvas"
                  :margin="2"
                />
              </div>
            </div>
            <p class="mt-3 text-center text-xs font-medium text-slate-500">
              Show this only when staff is ready to add stamps.
            </p>
          </AppCard>
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
      unlocked
      @close="closeRewardWallet"
      @redeemed="handleRewardRedeemed"
      @finished="handleRewardFinished"
    />
  </AppShell>
</template>
