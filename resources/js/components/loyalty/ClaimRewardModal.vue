<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import QrcodeVue from 'qrcode.vue'

import RewardRedeemedCelebration from '@/components/loyalty/RewardRedeemedCelebration.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { buildRedeemQrValue } from '@/lib/loyaltyQr'
import type { CustomerRewardWalletItem } from '@/stores/customerRewards'
import type { Reward, Venue } from '@/types'

interface ClaimSessionPayload {
  token: string
  expires_at: string
  status: 'pending' | 'claimed' | 'expired'
  qr_value: string
  reward: Reward
  venue: Venue | null
}

const props = defineProps<{
  item: CustomerRewardWalletItem
}>()

const emit = defineEmits<{
  close: []
  redeemed: []
}>()

const loading = ref(true)
const error = ref('')
const session = ref<ClaimSessionPayload | null>(null)
const showCelebration = ref(false)
const nowMs = ref(Date.now())
let pollTimer: number | undefined
let clockTimer: number | undefined

const qrValue = computed(() => {
  if (!session.value) {
    return ''
  }

  return session.value.qr_value.startsWith('flotory:redeem:')
    ? session.value.qr_value
    : buildRedeemQrValue(session.value.token)
})

const expiresSeconds = computed(() => {
  if (!session.value?.expires_at || session.value.status !== 'pending') {
    return 0
  }

  return Math.max(0, Math.floor((new Date(session.value.expires_at).getTime() - nowMs.value) / 1000))
})

const expiresLabel = computed(() => {
  const seconds = expiresSeconds.value
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  return `${minutes}:${String(remainder).padStart(2, '0')}`
})

async function startSession() {
  loading.value = true
  error.value = ''

  try {
    const response = await api<ClaimSessionPayload>(
      `/customer/rewards/unlocks/${props.item.unlock_id}/claim-session`,
      { method: 'POST' },
    )
    session.value = response
    startPolling()
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not start claim. Try again.')
  } finally {
    loading.value = false
  }
}

async function refreshSession() {
  if (!session.value?.token) {
    return
  }

  try {
    const response = await api<ClaimSessionPayload>(
      `/customer/rewards/claim-sessions/${session.value.token}`,
    )
    session.value = response

    if (response.status === 'claimed') {
      stopPolling()
      showCelebration.value = true
      window.setTimeout(() => {
        showCelebration.value = false
        emit('redeemed')
      }, 2200)
    }

    if (response.status === 'expired') {
      stopPolling()
    }
  } catch {
    // Keep last known session on transient errors.
  }
}

function startPolling() {
  stopPolling()
  pollTimer = window.setInterval(() => {
    void refreshSession()
  }, 2000)
}

function stopPolling() {
  if (pollTimer !== undefined) {
    window.clearInterval(pollTimer)
    pollTimer = undefined
  }
}

onMounted(() => {
  clockTimer = window.setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
  void startSession()
})

onBeforeUnmount(() => {
  stopPolling()
  if (clockTimer !== undefined) {
    window.clearInterval(clockTimer)
  }
})

watch(
  () => props.item.unlock_id,
  () => {
    stopPolling()
    void startSession()
  },
)
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center" @click.self="emit('close')">
    <div
      class="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-amber-200"
      role="dialog"
      aria-labelledby="claim-reward-title"
    >
      <div class="border-b border-amber-100 bg-amber-50 px-5 py-4 text-center">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Redeem</p>
        <h2 id="claim-reward-title" class="mt-1 text-xl font-black text-slate-950">
          {{ item.reward.title }}
        </h2>
      </div>

      <div class="px-5 py-6">
        <p v-if="loading" class="text-center text-sm font-semibold text-slate-500">Loading…</p>
        <p v-else-if="error" class="rounded-2xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700">{{ error }}</p>

        <template v-else-if="session?.status === 'pending'">
          <p class="text-center text-lg font-black text-slate-950">Show this to staff</p>
          <p class="mt-1 text-center text-sm text-slate-500">
            Staff scans this code in <span class="font-bold text-slate-700">Scanner</span> to redeem your reward.
          </p>

          <div class="mx-auto mt-5 w-fit rounded-2xl border-2 border-amber-400 bg-white p-3 shadow-sm">
            <QrcodeVue v-if="qrValue" :value="qrValue" :size="220" level="M" render-as="canvas" :margin="2" />
          </div>

          <p class="mt-5 text-center text-sm font-semibold text-slate-600">Code expires in</p>
          <p class="text-center text-4xl font-black tabular-nums tracking-tight text-amber-600">
            {{ expiresLabel }}
          </p>
        </template>

        <template v-else-if="session?.status === 'claimed'">
          <p class="text-center text-lg font-black text-emerald-950">Reward redeemed</p>
          <p class="mt-2 text-center text-sm text-slate-500">You can close this screen.</p>
        </template>

        <template v-else-if="session?.status === 'expired'">
          <p class="text-center text-lg font-black text-amber-950">Code expired</p>
          <AppButton class="mt-4 w-full" size="lg" @click="startSession">Get new code</AppButton>
        </template>

        <AppButton class="mt-6 w-full" variant="ghost" @click="emit('close')">Close</AppButton>
      </div>
    </div>

    <RewardRedeemedCelebration
      :visible="showCelebration"
      :title="session?.reward.title"
      subtitle="Enjoy your reward!"
    />
  </div>
</template>
