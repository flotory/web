<script setup lang="ts">
import { Gift } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import ClaimRewardModal from '@/components/loyalty/ClaimRewardModal.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { apiErrorMessage } from '@/lib/api'
import { rewardThumbUrl } from '@/lib/rewardMedia'
import { venueLogoThumbUrl } from '@/lib/venueMedia'
import { useCustomerRewardsStore, type CustomerRewardWalletItem } from '@/stores/customerRewards'

const rewardsStore = useCustomerRewardsStore()
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

function openClaim(item: CustomerRewardWalletItem) {
  selectedItem.value = item
}

function closeClaim() {
  selectedItem.value = null
}

async function handleRedeemed() {
  selectedItem.value = null
  await rewardsStore.refresh()
}

onMounted(loadRewards)
</script>

<template>
  <AppShell>
    <div class="mx-auto w-full max-w-md">
      <h1 class="text-2xl font-black tracking-tight text-slate-950">Your rewards</h1>
      <p class="mt-1 text-sm text-slate-500">
        At the counter, tap <strong class="text-slate-700">Claim</strong> and show the amber QR to staff.
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
          <div class="flex items-center gap-3 p-4">
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
            <AppButton size="sm" class="shrink-0" @click="openClaim(item)">
              Claim
            </AppButton>
          </div>
        </li>
      </ul>
    </div>

    <ClaimRewardModal
      v-if="selectedItem"
      :item="selectedItem"
      @close="closeClaim"
      @redeemed="handleRedeemed"
    />
  </AppShell>
</template>
