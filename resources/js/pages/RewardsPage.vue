<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import CustomerRewardWallet from '@/components/loyalty/CustomerRewardWallet.vue'
import ProgressStamps from '@/components/loyalty/ProgressStamps.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useRealtimeStore } from '@/stores/realtime'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Customer, Reward, StampAddedPayload, Venue, Visit } from '@/types'

interface RedemptionResponse {
  customer: Customer
  next_reward: Reward | null
  available_rewards: Reward[]
  recent_visits: Visit[]
}

const auth = useAuthStore()
const realtime = useRealtimeStore()
const workspace = useWorkspaceStore()
const rewards = ref<Reward[]>([])
const customer = ref<Customer | null>(null)
const venue = ref<Venue | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const formOpen = ref(false)
const title = ref('')
const requiredStamps = ref(5)
const rewardType = ref('discount')
const selectedReward = ref<Reward | null>(null)
let refreshTimer: number | undefined

const canManageRewards = computed(() => auth.user?.role === 'admin' || workspace.hasMembership)
const needsVenuePick = computed(
  () => canManageRewards.value && workspace.activeVenues.length > 1 && workspace.effectiveVenueId === null,
)
const visibleRewards = computed(() => (canManageRewards.value ? rewards.value : rewards.value.filter((reward) => reward.active)))
const customerStamps = computed(() => customer.value?.stamps ?? 0)

function resetForm() {
  title.value = ''
  requiredStamps.value = 5
  rewardType.value = 'discount'
}

async function loadRewards(silent = false) {
  if (!silent) {
    loading.value = true
    error.value = ''
  }

  try {
    if (canManageRewards.value) {
      await workspace.bootstrap()
      const venueId = workspace.effectiveVenueId
      venue.value = venueId ? (workspace.activeVenues.find((item) => item.id === venueId) ?? null) : null
      rewards.value = venueId ? (await api<{ rewards: Reward[] }>(`/venues/${venueId}/rewards`)).rewards : []
    } else {
      const cards = await api<{ active_card: Customer | null }>('/customer/cards')
      customer.value = cards.active_card
      venue.value = cards.active_card?.venue ?? null
      rewards.value = cards.active_card
        ? (await api<{ rewards: Reward[] }>(`/customers/${cards.active_card.id}/rewards`)).rewards
        : []
    }
  } catch {
    if (!silent) {
      error.value = 'Could not load rewards.'
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

async function createReward() {
  if (!venue.value) return

  saving.value = true
  error.value = ''

  try {
    await api<{ reward: Reward }>(`/venues/${venue.value.id}/rewards`, {
      method: 'POST',
      body: {
        title: title.value,
        required_stamps: requiredStamps.value,
        reward_type: rewardType.value,
        active: true,
      },
    })

    resetForm()
    formOpen.value = false
    await loadRewards()
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not create reward.'
  } finally {
    saving.value = false
  }
}

async function deactivateReward(reward: Reward) {
  if (!venue.value) return

  saving.value = true
  error.value = ''

  try {
    await api<void>(`/venues/${venue.value.id}/rewards/${reward.id}`, {
      method: 'DELETE',
    })
    await loadRewards()
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not deactivate reward.'
  } finally {
    saving.value = false
  }
}

function openCustomerReward(reward: Reward) {
  if (canManageRewards.value) return

  selectedReward.value = reward
}

function closeCustomerReward() {
  selectedReward.value = null
}

function applyRedemption(response: RedemptionResponse) {
  customer.value = response.customer
}

function applyRealtimeStamp(payload: StampAddedPayload) {
  if (!customer.value || payload.customer.id !== customer.value.id) {
    return
  }

  customer.value = payload.customer
}

function refreshIfVisible() {
  if (document.visibilityState === 'visible') {
    loadRewards(true)
  }
}

onMounted(() => {
  loadRewards()
  window.addEventListener('focus', refreshIfVisible)
  document.addEventListener('visibilitychange', refreshIfVisible)
  refreshTimer = window.setInterval(() => loadRewards(true), 10000)
})

onUnmounted(() => {
  window.removeEventListener('focus', refreshIfVisible)
  document.removeEventListener('visibilitychange', refreshIfVisible)
  window.clearInterval(refreshTimer)
})

watch(
  () => realtime.latestStamp,
  (payload) => {
    if (payload) {
      applyRealtimeStamp(payload)
    }
  },
)

watch(() => workspace.filterVenueId, () => loadRewards())
</script>

<template>
  <AppShell>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <AppBadge tone="blue">{{ canManageRewards ? 'Reward management' : 'Your rewards' }}</AppBadge>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Rewards</h1>
        <p class="mt-2 text-slate-500">Keep rewards simple and easy for staff to explain.</p>
      </div>
      <AppButton v-if="canManageRewards" @click="formOpen = !formOpen">
        {{ formOpen ? 'Close' : 'Add reward' }}
      </AppButton>
    </div>

    <AppCard v-if="formOpen && canManageRewards" wrapper-class="mb-4">
      <form class="grid gap-4 md:grid-cols-[1fr_140px_160px_auto]" @submit.prevent="createReward">
        <div>
          <label class="text-sm font-bold text-slate-600" for="reward-title">Reward title</label>
          <input id="reward-title" v-model="title" required class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white" placeholder="Free coffee">
        </div>
        <div>
          <label class="text-sm font-bold text-slate-600" for="reward-stamps">Stamps</label>
          <input id="reward-stamps" v-model.number="requiredStamps" required min="1" max="100" type="number" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white">
        </div>
        <div>
          <label class="text-sm font-bold text-slate-600" for="reward-type">Type</label>
          <select id="reward-type" v-model="rewardType" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white">
            <option value="discount">Discount</option>
            <option value="free_item">Free item</option>
            <option value="upgrade">Upgrade</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div class="flex items-end">
          <AppButton class="w-full" type="submit" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save' }}
          </AppButton>
        </div>
      </form>
    </AppCard>

    <AppCard v-if="canManageRewards && needsVenuePick" wrapper-class="mb-4">
      <p class="text-sm font-bold text-slate-500">Select a specific venue in the sidebar filter to manage its rewards.</p>
    </AppCard>

    <AppCard v-if="loading" wrapper-class="mb-4">
      <p class="text-sm font-bold text-slate-500">Loading rewards...</p>
    </AppCard>
    <AppCard v-else-if="error" wrapper-class="mb-4">
      <p class="text-sm font-bold text-red-600">{{ error }}</p>
    </AppCard>

    <div class="grid gap-4 md:grid-cols-2">
      <AppCard
        v-for="reward in visibleRewards"
        :key="reward.id"
        :wrapper-class="!canManageRewards ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-xl' : ''"
        @click="openCustomerReward(reward)"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-black text-slate-950">{{ reward.title }}</h2>
            <p class="mt-1 text-sm font-semibold text-slate-500">{{ reward.reward_type }} · {{ reward.required_stamps }} stamps</p>
          </div>
          <AppBadge :tone="canManageRewards ? (reward.active ? 'green' : 'slate') : (customerStamps >= reward.required_stamps ? 'green' : 'amber')">
            {{ canManageRewards ? (reward.active ? 'Active' : 'Inactive') : (customerStamps >= reward.required_stamps ? 'Ready' : 'Locked') }}
          </AppBadge>
        </div>
        <div class="mt-6">
          <ProgressStamps :stamps="customerStamps" :required="reward.required_stamps" />
        </div>
        <AppButton v-if="canManageRewards && reward.active" class="mt-5" variant="secondary" size="sm" :disabled="saving" @click="deactivateReward(reward)">
          Deactivate
        </AppButton>
        <p v-else-if="!canManageRewards" class="mt-5 text-sm font-bold text-slate-500">
          Tap to open reward
        </p>
      </AppCard>
      <AppCard v-if="!loading && !visibleRewards.length">
        <p class="text-sm font-semibold text-slate-500">No rewards yet.</p>
      </AppCard>
    </div>

    <CustomerRewardWallet
      v-if="selectedReward && customer"
      :customer="customer"
      :restaurant="venue"
      :reward="selectedReward"
      @close="closeCustomerReward"
      @redeemed="applyRedemption"
    />
  </AppShell>
</template>
