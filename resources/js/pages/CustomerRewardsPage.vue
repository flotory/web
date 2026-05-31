<script setup lang="ts">
import { Gift } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import CustomerRewardWallet from '@/components/loyalty/CustomerRewardWallet.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { apiErrorMessage } from '@/lib/api'
import { rewardImageUrl, rewardThumbUrl } from '@/lib/rewardMedia'
import { venueLogoThumbUrl } from '@/lib/venueMedia'
import { useCustomerRewardsStore, type CustomerRewardWalletItem } from '@/stores/customerRewards'
import type { Customer, Reward } from '@/types'

interface RedemptionResponse {
  customer: Customer
  next_reward: Reward | null
  available_rewards: Reward[]
}

const rewardsStore = useCustomerRewardsStore()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const selectedItem = ref<CustomerRewardWalletItem | null>(null)

async function loadRewards() {
  loading.value = true
  error.value = ''

  try {
    await rewardsStore.refresh()
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load your rewards. Please try again.')
  } finally {
    loading.value = false
  }
}

function openReward(item: CustomerRewardWalletItem) {
  selectedItem.value = item
}

function closeReward() {
  selectedItem.value = null
}

async function handleRedeemed() {
  await rewardsStore.refresh()
}

function handleFinished() {
  selectedItem.value = null
  if (router.currentRoute.value.path !== '/customer/rewards') {
    router.push('/customer/rewards')
  }
}

onMounted(loadRewards)
</script>

<template>
  <AppShell>
    <div class="mx-auto w-full max-w-md">
      <h1 class="text-2xl font-black tracking-tight text-slate-950">Your rewards</h1>
      <p class="mt-1 text-sm text-slate-500">
        Tap a reward when you're at the venue. Slide to use it with staff.
      </p>

      <div v-if="loading" class="mt-6">
        <EmptyState compact title="Loading rewards…" />
      </div>

      <ErrorState
        v-else-if="error"
        class="mt-6"
        :message="error"
        @retry="loadRewards"
      />

      <EmptyState
        v-else-if="!rewardsStore.items.length"
        class="mt-6"
        :icon="Gift"
        title="No rewards yet"
        description="Collect stamps on your card to unlock milestones. Unlocked rewards appear here until you redeem them."
      >
        <RouterLink to="/card">
          <AppButton>Open loyalty card</AppButton>
        </RouterLink>
      </EmptyState>

      <ul v-else class="mt-6 space-y-3">
        <li
          v-for="item in rewardsStore.items"
          :key="item.unlock_id"
          class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
        >
          <button
            type="button"
            class="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50"
            @click="openReward(item)"
          >
            <img
              :src="rewardThumbUrl(item.reward)"
              :alt="item.reward.title"
              class="size-16 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200/80"
            >
            <div class="min-w-0 flex-1">
              <p class="truncate font-black text-slate-950">{{ item.reward.title }}</p>
              <p v-if="item.reward.description" class="mt-1 line-clamp-2 text-sm text-slate-500">
                {{ item.reward.description }}
              </p>
              <div class="mt-1.5 flex items-center gap-2">
                <img
                  v-if="item.customer.venue"
                  :src="venueLogoThumbUrl(item.customer.venue)"
                  :alt="item.customer.venue.name"
                  class="size-5 rounded-md object-cover ring-1 ring-slate-200/80"
                >
                <p class="truncate text-sm text-slate-500">{{ item.customer.venue?.name }}</p>
              </div>
            </div>
            <AppBadge tone="green">Use</AppBadge>
          </button>
        </li>
      </ul>
    </div>

    <CustomerRewardWallet
      v-if="selectedItem"
      :customer="selectedItem.customer"
      :restaurant="selectedItem.customer.venue"
      :reward="selectedItem.reward"
      unlocked
      @close="closeReward"
      @redeemed="handleRedeemed"
      @finished="handleFinished"
    />
  </AppShell>
</template>
