<script setup lang="ts">
import { computed, ref } from 'vue'

import { api, ApiError } from '@/lib/api'
import { rewardImageUrl } from '@/lib/rewardMedia'
import { venueLogoUrl } from '@/lib/venueMedia'
import type { Customer, Reward, RewardJourney, Venue, Visit } from '@/types'

import ProgressStamps from './ProgressStamps.vue'
import SuccessCheck from './SuccessCheck.vue'
import SwipeToRedeem from './SwipeToRedeem.vue'

interface RedemptionResponse {
  customer: Customer
  next_reward: Reward | null
  available_rewards: Reward[]
  journey: RewardJourney
  recent_visits: Visit[]
}

const props = defineProps<{
  customer: Customer
  restaurant?: Venue | null
  reward: Reward
  unlocked?: boolean
}>()

const emit = defineEmits<{
  close: []
  redeemed: [response: RedemptionResponse]
}>()

const state = ref<'locked' | 'available' | 'redeeming' | 'redeemed'>(
  props.unlocked || props.customer.stamps >= props.reward.required_stamps ? 'available' : 'locked',
)
const error = ref('')
const redeemedCustomer = ref<Customer | null>(null)

const venue = computed(() => props.restaurant ?? props.customer.venue ?? null)
const currentCustomer = computed(() => redeemedCustomer.value ?? props.customer)
const isReadyToRedeem = computed(() => props.unlocked || currentCustomer.value.stamps >= props.reward.required_stamps)

const effectiveState = computed(() => {
  if (state.value === 'redeeming' || state.value === 'redeemed') return state.value
  if (isReadyToRedeem.value) return 'available'
  return 'locked'
})

const rewardSummary = computed(() => {
  if (props.reward.description?.trim()) {
    return props.reward.description.trim()
  }

  return `You unlocked this after collecting ${props.reward.required_stamps} stamps.`
})

const stampsRemaining = computed(() =>
  Math.max(props.reward.required_stamps - currentCustomer.value.stamps, 0),
)

async function redeemReward() {
  if (effectiveState.value !== 'available') return

  state.value = 'redeeming'
  error.value = ''

  try {
    const response = await api<RedemptionResponse>(`/customers/${props.customer.id}/rewards/${props.reward.id}/redeem`, {
      method: 'POST',
    })

    redeemedCustomer.value = response.customer
    state.value = 'redeemed'
    emit('redeemed', response)
  } catch (exception) {
    state.value = 'available'
    error.value = exception instanceof ApiError ? exception.message : 'Could not redeem reward.'
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-8 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-8 opacity-0"
  >
    <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-100">
      <div class="mx-auto flex min-h-screen max-w-md flex-col pb-6">
        <header class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-slate-100/95 px-4 py-4 backdrop-blur">
          <button
            type="button"
            class="rounded-full px-3 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-slate-950"
            :disabled="state === 'redeeming'"
            @click="emit('close')"
          >
            Close
          </button>
          <div v-if="venue" class="flex min-w-0 items-center gap-2">
            <img :src="venueLogoUrl(venue)" :alt="venue.name" class="size-7 rounded-lg object-cover ring-1 ring-slate-200/80">
            <p class="truncate text-sm font-bold text-slate-700">{{ venue.name }}</p>
          </div>
        </header>

        <div v-if="state === 'redeemed'" class="flex flex-1 flex-col px-4 pt-8">
          <div class="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/80">
            <SuccessCheck />
            <h2 class="mt-6 text-3xl font-black text-slate-950">All set!</h2>
            <p class="mt-2 text-lg font-bold text-slate-800">{{ reward.title }}</p>
            <p class="mt-3 text-sm leading-6 text-slate-500">
              Staff marked this reward as used. Your stamp card stays at
              <span class="font-bold text-slate-700">{{ currentCustomer.stamps }}</span>
              — keep collecting for the next one.
            </p>
          </div>
          <button
            type="button"
            class="mt-6 w-full rounded-2xl bg-slate-950 px-4 py-4 text-sm font-bold text-white"
            @click="emit('close')"
          >
            Back to rewards
          </button>
        </div>

        <div v-else class="flex flex-1 flex-col px-4 pt-5">
          <article class="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <img
              :src="rewardImageUrl(reward)"
              :alt="reward.title"
              class="aspect-[4/3] w-full object-cover"
            >
            <div class="p-5">
              <p class="text-xs font-bold uppercase tracking-wide text-emerald-600">
                {{ isReadyToRedeem ? 'Ready to use' : 'Not unlocked yet' }}
              </p>
              <h1 class="mt-2 text-2xl font-black leading-tight text-slate-950">{{ reward.title }}</h1>
              <p class="mt-3 text-sm leading-6 text-slate-600">{{ rewardSummary }}</p>
            </div>
          </article>

          <section
            v-if="isReadyToRedeem"
            class="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80"
          >
            <h2 class="text-sm font-black uppercase tracking-wide text-slate-400">What to do</h2>
            <ol class="mt-4 space-y-3">
              <li class="flex gap-3 text-sm leading-6 text-slate-700">
                <span class="grid size-7 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">1</span>
                <span>Go to the counter at <strong>{{ venue?.name ?? 'the venue' }}</strong>.</span>
              </li>
              <li class="flex gap-3 text-sm leading-6 text-slate-700">
                <span class="grid size-7 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">2</span>
                <span>Slide below when staff is ready — this marks the reward as used.</span>
              </li>
              <li class="flex gap-3 text-sm leading-6 text-slate-700">
                <span class="grid size-7 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">3</span>
                <span>Show this screen and enjoy your <strong>{{ reward.title }}</strong>.</span>
              </li>
            </ol>
          </section>

          <section
            v-else
            class="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80"
          >
            <h2 class="text-sm font-black uppercase tracking-wide text-slate-400">Progress</h2>
            <div class="mt-4">
              <ProgressStamps :stamps="currentCustomer.stamps" :required="reward.required_stamps" />
            </div>
            <p class="mt-4 text-sm font-semibold text-slate-600">
              Collect {{ stampsRemaining }} more {{ stampsRemaining === 1 ? 'stamp' : 'stamps' }} on your card to unlock this reward.
            </p>
          </section>

          <p v-if="error" class="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-100">
            {{ error }}
          </p>

          <div class="mt-auto pt-8">
            <p v-if="isReadyToRedeem" class="mb-3 text-center text-xs font-semibold text-slate-500">
              Slide only when staff confirms your order
            </p>
            <SwipeToRedeem
              :state="effectiveState"
              :disabled="state === 'redeeming'"
              theme="light"
              locked-label="Reward locked"
              available-label="Slide to use reward"
              redeeming-label="Marking as used..."
              redeemed-label="Used"
              @confirm="redeemReward"
            />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
