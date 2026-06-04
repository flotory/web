<script setup lang="ts">
import QrcodeVue from 'qrcode.vue'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import { api, apiErrorMessage } from '@/lib/api'
import AppShell from '@/layouts/AppShell.vue'

interface StampQrResponse {
  public_token: string
  qr_value: string
  version: number
}

const loading = ref(true)
const error = ref('')
const qrValue = ref('')

async function loadQr() {
  loading.value = true
  error.value = ''

  try {
    const response = await api<StampQrResponse>('/customer/stamp-qr')
    qrValue.value = response.qr_value
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load your stamp QR.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadQr()
})
</script>

<template>
  <AppShell>
    <div class="mx-auto w-full max-w-md px-4 pb-8 pt-4">
      <header class="mb-5 text-center">
        <h1 class="text-2xl font-black tracking-tight text-slate-950">My QR</h1>
        <p class="mt-1 text-sm text-slate-500">One QR for all your venues — show it when staff is ready to scan.</p>
      </header>

      <div v-if="loading" class="py-10">
        <EmptyState compact title="Loading your QR…" />
      </div>

      <div v-else-if="error" class="py-10">
        <ErrorState :message="error" @retry="loadQr()" />
      </div>

      <template v-else>
        <AppCard wrapper-class="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.16)]">
          <div class="flex justify-center rounded-2xl bg-slate-50 p-5">
            <div class="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <QrcodeVue
                :value="qrValue"
                :size="220"
                level="M"
                render-as="canvas"
                :margin="2"
              />
            </div>
          </div>
          <p class="mt-5 text-center text-base font-black text-slate-950">One QR for all your venues</p>
          <p class="mt-2 text-center text-sm text-slate-500">
            Stamps apply to the venue where you scan. New venues join automatically on first visit.
          </p>
        </AppCard>

        <RouterLink to="/wallet" class="mt-6 block">
          <AppButton variant="secondary" class="w-full">Back to wallet</AppButton>
        </RouterLink>
      </template>
    </div>
  </AppShell>
</template>
