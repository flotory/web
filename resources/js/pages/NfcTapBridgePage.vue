<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import MarketingPageHeader from '@/components/layout/MarketingPageHeader.vue'
import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import { marketingCardClass } from '@/lib/marketingPage'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { api } from '@/lib/api'
import { mobileNfcDeepLink } from '@/lib/mobileApp'
import { venueLogoUrl } from '@/lib/venueMedia'

interface NfcTagPayload {
  token: string
  label?: string | null
  tap_url: string
  venue?: {
    id: number
    name: string
    slug: string
    logo?: string | null
    logo_thumb?: string | null
  } | null
}

const route = useRoute()
const loading = ref(true)
const error = ref('')
const payload = ref<NfcTagPayload | null>(null)

const token = computed(() => String(route.params.token ?? ''))
const appDeepLink = computed(() => (token.value ? mobileNfcDeepLink(token.value) : ''))

onMounted(async () => {
  if (!token.value) {
    error.value = 'NFC link unavailable.'
    loading.value = false
    return
  }

  try {
    payload.value = await api<NfcTagPayload>(`/public/nfc/t/${encodeURIComponent(token.value)}`, {
      includeAuth: false,
    })
  } catch {
    error.value = 'This NFC stand is unavailable.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <MarketingPageShell width="lg" padding-y="10">
    <MarketingPageHeader logo-size="md" />

    <AppCard :wrapper-class="`${marketingCardClass} sm:p-8`">
      <p v-if="loading" class="text-sm font-semibold text-ink-muted">Loading stand…</p>

      <template v-else-if="payload?.venue">
        <div class="flex items-center gap-4">
          <img
            v-if="payload.venue.logo_thumb || payload.venue.logo"
            :src="venueLogoUrl(payload.venue)"
            :alt="payload.venue.name"
            class="size-16 rounded-2xl border border-border object-cover"
          >
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-accent-active">NFC stamp stand</p>
            <h1 class="mt-1 text-2xl font-black tracking-tight text-ink">{{ payload.venue.name }}</h1>
            <p class="mt-1 text-sm text-ink-muted">Tap to collect stamps in the Flotory app.</p>
          </div>
        </div>

        <a :href="appDeepLink" class="mt-8 block">
          <AppButton class="w-full" size="lg">Open in Flotory app</AppButton>
        </a>
        <p class="mt-3 text-center text-xs font-semibold leading-relaxed text-ink-muted">
          Sign in if prompted, then tap the stand again for each stamp.
        </p>
      </template>

      <template v-else>
        <h1 class="text-2xl font-black tracking-tight text-ink">Stand unavailable</h1>
        <p class="mt-2 text-sm text-ink-muted">{{ error || 'This NFC stand is unavailable.' }}</p>
      </template>
    </AppCard>
  </MarketingPageShell>
</template>
