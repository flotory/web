<script setup lang="ts">
import { computed, ref } from 'vue'

import { api, ApiError } from '@/lib/api'
import { rewardImageUrl } from '@/lib/rewardMedia'
import { venueLogoUrl } from '@/lib/venueMedia'
import { useAuthStore } from '@/stores/auth'
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
}>()

const emit = defineEmits<{
  close: []
  redeemed: [response: RedemptionResponse]
}>()

const auth = useAuthStore()
const state = ref<'locked' | 'available' | 'redeeming' | 'redeemed'>(
  props.customer.stamps >= props.reward.required_stamps ? 'available' : 'locked',
)
const error = ref('')
const redeemedCustomer = ref<Customer | null>(null)

const currentCustomer = computed(() => redeemedCustomer.value ?? props.customer)
const effectiveState = computed(() => {
  if (state.value === 'redeeming' || state.value === 'redeemed') return state.value

  return currentCustomer.value.stamps >= props.reward.required_stamps ? 'available' : 'locked'
})

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
    <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-white">
      <div class="mx-auto flex min-h-screen max-w-md flex-col px-5 py-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-black uppercase tracking-[0.25em] text-white/45">Your reward</p>
            <h2 class="mt-1 text-2xl font-black">{{ restaurant?.name ?? currentCustomer.venue?.name }}</h2>
          </div>
          <button
            type="button"
            class="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/80 ring-1 ring-white/15"
            :disabled="state === 'redeeming'"
            @click="emit('close')"
          >
            Done
          </button>
        </div>

        <div class="my-6 flex flex-1 items-center">
          <div class="relative w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-amber-300 via-emerald-400 to-slate-950 p-1 shadow-2xl shadow-emerald-500/20">
            <div class="absolute -right-16 -top-20 size-48 rounded-full bg-white/20 blur-2xl" />
            <div class="absolute -bottom-24 -left-16 size-56 rounded-full bg-amber-200/25 blur-3xl" />
            <div class="relative rounded-[2.25rem] bg-slate-950/35 p-6 ring-1 ring-white/20 backdrop-blur">
              <div v-if="state === 'redeemed'" class="grid min-h-[29rem] place-items-center text-center">
                <div>
                  <SuccessCheck />
                  <h3 class="mt-6 text-4xl font-black">Redeemed</h3>
                  <p class="mt-2 text-lg font-semibold text-white/75">{{ reward.title }}</p>
                  <p class="mt-4 rounded-full bg-white/15 px-5 py-2 text-sm font-black text-white/85">
                    Progress stays at {{ currentCustomer.stamps }} visits
                  </p>
                </div>
              </div>

              <div v-else class="min-h-[29rem]">
                <div class="overflow-hidden rounded-2xl ring-1 ring-white/15">
                  <img :src="rewardImageUrl(reward)" :alt="reward.title" class="h-40 w-full object-cover">
                </div>
                <div class="mt-5 flex items-start justify-between gap-4">
                  <div class="flex min-w-0 items-start gap-3">
                    <div v-if="restaurant" class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/15 ring-1 ring-white/20">
                      <img :src="venueLogoUrl(restaurant)" :alt="restaurant.name" class="size-full object-cover">
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-bold text-white/65">{{ currentCustomer.user?.name ?? auth.user?.name ?? 'Customer' }}</p>
                      <h3 class="mt-2 text-3xl font-black leading-tight">{{ reward.title }}</h3>
                    </div>
                  </div>
                  <div class="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-xl font-black ring-1 ring-white/20">
                    {{ reward.required_stamps }}
                  </div>
                </div>

                <div class="mt-8 rounded-[1.75rem] bg-white/12 p-4 ring-1 ring-white/15">
                  <ProgressStamps :stamps="currentCustomer.stamps" :required="reward.required_stamps" />
                </div>

                <div class="mt-6 grid grid-cols-2 gap-3">
                  <div class="rounded-3xl bg-white/12 p-4 ring-1 ring-white/15">
                    <p class="text-xs font-black uppercase tracking-wide text-white/45">Your stamps</p>
                    <p class="mt-2 text-2xl font-black">{{ currentCustomer.stamps }}</p>
                  </div>
                  <div class="rounded-3xl bg-white/12 p-4 ring-1 ring-white/15">
                    <p class="text-xs font-black uppercase tracking-wide text-white/45">Milestone</p>
                    <p class="mt-2 text-2xl font-black">{{ reward.required_stamps }}</p>
                  </div>
                </div>

                <p v-if="error" class="mt-6 rounded-3xl bg-red-500/20 p-4 text-sm font-bold text-red-50 ring-1 ring-red-200/20">
                  {{ error }}
                </p>
                <p v-else class="mt-6 rounded-3xl bg-white/10 p-4 text-sm font-bold text-white/70 ring-1 ring-white/15">
                  Slide to claim this unlocked milestone.
                </p>
              </div>
            </div>
          </div>
        </div>

        <SwipeToRedeem
          :state="effectiveState"
          :disabled="state === 'redeeming'"
          available-label="Slide to redeem"
          redeeming-label="Redeeming..."
          redeemed-label="Redeemed"
          @confirm="redeemReward"
        />
      </div>
    </div>
  </Transition>
</template>
