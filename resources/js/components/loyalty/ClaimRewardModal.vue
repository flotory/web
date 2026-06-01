<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import QrcodeVue from 'qrcode.vue'

import RewardRedeemedCelebration from '@/components/loyalty/RewardRedeemedCelebration.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { buildRedeemQrValue } from '@/lib/loyaltyQr'
import { rewardImageUrl } from '@/lib/rewardMedia'
import { venueLogoThumbUrl } from '@/lib/venueMedia'
import type { CustomerRewardWalletItem } from '@/stores/customerRewards'
import type { Reward, Venue } from '@/types'

interface ClaimSessionPayload {
  token: string
  expires_at: string
  claimed_at: string | null
  status: 'pending' | 'claimed' | 'expired'
  qr_value: string
  unlock_id: number
  reward: Reward
  customer: { id: number; venue?: Venue | null }
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
let pollTimer: number | undefined

const qrValue = computed(() => session.value?.qr_value ?? (session.value?.token ? buildRedeemQrValue(session.value.token) : ''))

const expiresLabel = computed(() => {
  if (!session.value?.expires_at || session.value.status !== 'pending') {
    return null
  }

  const expiresAt = new Date(session.value.expires_at).getTime()
  const seconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  return `${minutes}:${String(remainder).padStart(2, '0')}`
})

const statusTone = computed(() => {
  if (session.value?.status === 'claimed') return 'green'
  if (session.value?.status === 'expired') return 'amber'

  return 'blue'
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
    // Keep showing last known session on transient errors.
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

onMounted(startSession)

onBeforeUnmount(stopPolling)

watch(
  () => props.item.unlock_id,
  () => {
    stopPolling()
    void startSession()
  },
)
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center" @click.self="emit('close')">
    <div
      class="w-full max-w-md overflow-hidden rounded-3xl border border-amber-200/80 bg-white shadow-2xl"
      role="dialog"
      aria-labelledby="claim-reward-title"
    >
      <div class="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 px-5 py-4 text-white">
        <AppBadge class="bg-white/20 text-white ring-0">Redeem reward</AppBadge>
        <h2 id="claim-reward-title" class="mt-2 text-2xl font-black tracking-tight">Show this to staff</h2>
        <p class="mt-1 text-sm font-medium text-amber-50">
          Not your stamp card — staff must scan this code to give you the reward.
        </p>
      </div>

      <div class="p-5">
        <p v-if="loading" class="text-center text-sm font-semibold text-slate-500">Preparing your code…</p>
        <p v-else-if="error" class="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>

        <template v-else-if="session">
          <div class="flex items-center gap-3">
            <img
              :src="rewardImageUrl(session.reward)"
              :alt="session.reward.title"
              class="size-14 rounded-2xl object-cover ring-1 ring-slate-200"
            >
            <div class="min-w-0">
              <p class="font-black text-slate-950">{{ session.reward.title }}</p>
              <p v-if="session.venue" class="mt-0.5 flex items-center gap-2 text-sm text-slate-500">
                <img :src="venueLogoThumbUrl(session.venue)" alt="" class="size-5 rounded-md object-cover">
                {{ session.venue.name }}
              </p>
            </div>
          </div>

          <ol class="mt-4 space-y-2 text-sm text-slate-600">
            <li class="flex gap-2">
              <span class="font-black text-amber-600">1.</span>
              <span>Staff opens <strong class="text-slate-800">Scanner</strong> on their phone.</span>
            </li>
            <li class="flex gap-2">
              <span class="font-black text-amber-600">2.</span>
              <span>They scan the code below (not your loyalty card).</span>
            </li>
            <li class="flex gap-2">
              <span class="font-black text-amber-600">3.</span>
              <span>This screen updates when your reward is used.</span>
            </li>
          </ol>

          <div
            v-if="session.status === 'pending'"
            class="mt-5 flex justify-center rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-4"
          >
            <div class="rounded-2xl bg-white p-3 ring-1 ring-amber-200">
              <QrcodeVue v-if="qrValue" :value="qrValue" :size="200" level="M" render-as="canvas" :margin="2" />
            </div>
          </div>

          <div
            v-else-if="session.status === 'claimed'"
            class="mt-5 rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200"
          >
            <p class="text-lg font-black text-emerald-950">Reward redeemed</p>
            <p class="mt-1 text-sm font-semibold text-emerald-700">You can close this screen.</p>
          </div>

          <div
            v-else
            class="mt-5 rounded-2xl bg-amber-50 p-4 text-center ring-1 ring-amber-200"
          >
            <p class="text-lg font-black text-amber-950">Code expired</p>
            <p class="mt-1 text-sm font-semibold text-amber-800">Tap below to get a fresh code.</p>
            <AppButton class="mt-3 w-full" size="lg" @click="startSession">New code</AppButton>
          </div>

          <div class="mt-4 flex items-center justify-between gap-2">
            <AppBadge :tone="statusTone">
              {{
                session.status === 'pending'
                  ? 'Waiting for staff scan'
                  : session.status === 'claimed'
                    ? 'Done'
                    : 'Expired'
              }}
            </AppBadge>
            <p v-if="expiresLabel && session.status === 'pending'" class="text-xs font-bold text-slate-500">
              Expires in {{ expiresLabel }}
            </p>
          </div>
        </template>

        <AppButton class="mt-5 w-full" variant="ghost" @click="emit('close')">Close</AppButton>
      </div>
    </div>

    <RewardRedeemedCelebration
      :visible="showCelebration"
      :title="session?.reward.title"
      subtitle="Enjoy your reward!"
    />
  </div>
</template>
