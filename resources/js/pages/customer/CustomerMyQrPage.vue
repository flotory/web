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
    <div
      class="mx-auto flex w-full max-w-md flex-col items-center px-4 pb-6 pt-4"
      :class="loading || error ? 'min-h-[50vh] justify-center' : 'min-h-[calc(100dvh-7.5rem)] justify-center'"
    >
      <header class="mb-6 w-full text-center">
        <h1 class="text-2xl font-black tracking-tight text-ink">My QR</h1>
        <p class="mt-1 text-sm text-ink-muted">One QR for all your venues — show it when staff is ready to scan.</p>
      </header>

      <div v-if="loading" class="w-full py-10">
        <EmptyState compact title="Loading your QR…" />
      </div>

      <div v-else-if="error" class="w-full py-10">
        <ErrorState :message="error" @retry="loadQr()" />
      </div>

      <template v-else>
        <AppCard wrapper-class="w-full rounded-3xl border border-border bg-surface/95 p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.16)]">
          <div class="grid place-items-center rounded-2xl bg-surface-muted p-5">
            <div class="w-fit rounded-2xl bg-surface p-3 border border-border [&_canvas]:block">
              <QrcodeVue
                :value="qrValue"
                :size="220"
                level="M"
                render-as="canvas"
                :margin="2"
              />
            </div>
          </div>
          <p class="mt-5 text-center text-base font-black text-ink">One QR for all your venues</p>
          <p class="mt-2 text-center text-sm text-ink-muted">
            Stamps apply to the venue where you scan. New venues join automatically on first visit.
          </p>
        </AppCard>

        <RouterLink to="/wallet" class="mt-6 w-full">
          <AppButton variant="secondary" class="w-full">Back to wallet</AppButton>
        </RouterLink>
      </template>
    </div>
  </AppShell>
</template>
