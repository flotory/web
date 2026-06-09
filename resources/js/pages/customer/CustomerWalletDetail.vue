<script setup lang="ts">
import { ArrowLeft, Check, Gift, Wallet } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CardDetailHeader from '@/components/customer/CardDetailHeader.vue'
import CardPromotionBanner from '@/components/customer/CardPromotionBanner.vue'
import CardVenueRewardsCarousel from '@/components/customer/CardVenueRewardsCarousel.vue'
import CustomerScreen from '@/components/customer/CustomerScreen.vue'
import StampScannedBanner from '@/components/customer/StampScannedBanner.vue'
import StampRewardCelebration from '@/components/loyalty/StampRewardCelebration.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { stampBannerCopy } from '@/lib/stampLiveUpdate'
import AppShell from '@/layouts/AppShell.vue'
import { useCustomerRewardsStore } from '@/stores/customerRewards'
import { useRealtimeStore } from '@/stores/realtime'
import type { Customer, Reward, RewardJourney, StampAddedPayload, VenuePromotion, Visit } from '@/types'

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
const promotion = ref<VenuePromotion | null>(null)
const pendingUnlocks = ref<Array<{ unlock_id: number; reward: Reward }>>([])
const scanBanner = ref<StampAddedPayload | null>(null)
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
  pending_unlocks?: Array<{ unlock_id: number; reward: Reward }>
  promotion?: VenuePromotion | null
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
const progressTarget = computed(() =>
  nextReward.value?.required_stamps ?? sortedMilestones.value.at(-1)?.required_stamps ?? journeyMaxStamps.value,
)
const scanBannerCopy = computed(() => (scanBanner.value ? stampBannerCopy(scanBanner.value) : null))
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
    pendingUnlocks.value = response.pending_unlocks ?? []
    promotion.value = response.promotion ?? null
    journey.value = response.journey
    recentVisits.value = response.recent_visits

    customerRewards.refresh().catch(() => undefined)

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

  scanBanner.value = payload
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

function isGiftStamp(stamp: number): boolean {
  return sortedMilestones.value.some((milestone) => milestone.required_stamps === stamp)
}

function isStampCollected(stamp: number): boolean {
  return stamp <= previewStamps.value
}

function isStampAnimating(stamp: number): boolean {
  return animatingSlots.value.includes(stamp)
}

function handleBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
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
  <AppShell hide-customer-tab-bar>
    <StampScannedBanner
      :visible="Boolean(scanBanner && scanBannerCopy)"
      :title="scanBannerCopy?.title ?? ''"
      :subtitle="scanBannerCopy?.subtitle"
      @dismiss="scanBanner = null"
    />

    <CustomerScreen>
      <div class="relative mx-auto w-full max-w-md pb-8">
        <button
          type="button"
          class="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-bold text-ink shadow-sm transition hover:bg-surface-muted"
          @click="handleBack"
        >
          <ArrowLeft class="size-4" />
          Back
        </button>

        <div v-if="loading" class="py-8">
          <EmptyState compact title="Loading card…" />
        </div>

        <ErrorState
          v-else-if="error"
          class="py-8"
          :message="error"
          @retry="loadCard()"
        />

        <div
          v-else-if="!card"
          class="py-8"
        >
          <EmptyState
            :icon="Wallet"
            title="Card not found"
            description="This loyalty card may have been removed. Check your wallet or discover a new venue."
          >
            <AppButton @click="handleBack">Open wallet</AppButton>
          </EmptyState>
        </div>

        <template v-else>
          <CardDetailHeader :venue="card.venue" />

          <CardPromotionBanner
            v-if="promotion"
            :promotion="promotion"
          />

          <div class="mt-3.5 rounded-[22px] border border-border bg-surface p-[18px] shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-[13px] font-semibold text-ink-muted">Your progress</p>
                <p class="mt-1.5 text-[21px] font-extrabold leading-snug text-ink">
                  {{ nextReward?.title ?? 'Your next reward' }}
                </p>
              </div>
              <span class="shrink-0 rounded-full border border-success-border bg-success-bg px-3 py-1.5 text-[13px] font-extrabold text-success-text">
                {{ Math.min(previewStamps, progressTarget) }} of {{ progressTarget }}
              </span>
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
                        ? 'border border-accent-border bg-accent-soft text-accent-active'
                        : 'border border-border bg-surface-muted text-ink-soft'
                      : isStampCollected(stamp)
                        ? 'bg-primary text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.6)]'
                        : 'border border-border bg-surface text-ink-soft',
                    isStampAnimating(stamp) ? 'scale-105 animate-pulse' : '',
                  ]"
                >
                  <Gift
                    v-if="isGiftStamp(stamp)"
                    class="size-4"
                  />
                  <Check
                    v-else-if="isStampCollected(stamp)"
                    class="size-4"
                  />
                  <span v-else>{{ stamp }}</span>
                </div>
              </div>
            </div>

            <p class="mt-4 text-sm font-bold text-ink-muted">
              {{
                Math.max(progressTarget - previewStamps, 0) === 0
                  ? 'Ready to claim your reward'
                  : `${Math.max(progressTarget - previewStamps, 0)} more visit${Math.max(progressTarget - previewStamps, 0) === 1 ? '' : 's'} to go`
              }}
            </p>
          </div>

          <CardVenueRewardsCarousel
            v-if="card.venue"
            :venue="card.venue"
            :milestones="sortedMilestones"
            :stamps="previewStamps"
            :card-id="card.id"
            :venue-id="card.venue_id"
            :pending-unlocks="pendingUnlocks"
          />
        </template>
      </div>
    </CustomerScreen>

    <Teleport to="body">
      <StampRewardCelebration
        :visible="showCelebration"
        :title="celebrationTitle"
        :subtitle="celebrationSubtitle"
      />
    </Teleport>
  </AppShell>
</template>
