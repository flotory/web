<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ClaimRewardModal from '@/components/loyalty/ClaimRewardModal.vue'
import CustomerScreen from '@/components/customer/CustomerScreen.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { apiErrorMessage } from '@/lib/api'
import { useCustomerRewardsStore } from '@/stores/customerRewards'

const route = useRoute()
const router = useRouter()
const rewardsStore = useCustomerRewardsStore()

const loading = ref(true)
const error = ref('')

const unlockId = computed(() => Number(route.params.unlockId))
const item = computed(() => rewardsStore.items.find((entry) => entry.unlock_id === unlockId.value) ?? null)

async function load() {
  loading.value = true
  error.value = ''

  try {
    await rewardsStore.refresh()
    if (!item.value) {
      error.value = 'This reward is no longer available.'
    }
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load reward.')
  } finally {
    loading.value = false
  }
}

function handleRedeemed() {
  void router.push('/home')
}

function handleClose() {
  void router.back()
}

onMounted(load)
</script>

<template>
  <AppShell hide-customer-tab-bar>
    <CustomerScreen>
      <div class="mx-auto w-full max-w-md py-4">
        <div v-if="loading">
          <EmptyState compact title="Loading claim…" />
        </div>

        <ErrorState
          v-else-if="error || !item"
          :message="error || 'Reward not found.'"
          @retry="load"
        />

        <ClaimRewardModal
          v-else
          :item="item"
          @close="handleClose"
          @redeemed="handleRedeemed"
        />
      </div>
    </CustomerScreen>
  </AppShell>
</template>
