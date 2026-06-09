<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import { useCalendlyIframeResize } from '@/composables/useCalendlyIframeResize'
import { MARKETING_HOME_PATH } from '@/lib/brand'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { marketingCardClass } from '@/lib/marketingPage'
import { api } from '@/lib/api'
import { buildCalendlyEmbedUrl, type DemoBookingConfig } from '@/lib/demoBooking'

const route = useRoute()
const { iframeHeight } = useCalendlyIframeResize()

const loading = ref(true)
const calendlyUrl = ref<string | null>(null)
const configError = ref('')

const calendlyIframeUrl = computed(() => {
  if (!calendlyUrl.value) {
    return null
  }

  return buildCalendlyEmbedUrl(calendlyUrl.value, {
    utm_source: typeof route.query.utm_source === 'string' ? route.query.utm_source : 'flotory',
    utm_campaign: typeof route.query.utm_campaign === 'string' ? route.query.utm_campaign : 'book-demo',
    embedHost: typeof window !== 'undefined' ? window.location.hostname : undefined,
  })
})

const iframeStyle = computed(() => ({
  height: `${iframeHeight.value}px`,
  border: 0,
}))

async function loadBookingConfig() {
  loading.value = true
  configError.value = ''

  try {
    const response = await api<DemoBookingConfig>('/public/demo-booking', { includeAuth: false })
    calendlyUrl.value = response.calendly_url
  } catch {
    configError.value = 'Booking is temporarily unavailable. Email team@flotory.com and we will set up a time.'
  } finally {
    loading.value = false
  }
}

onMounted(loadBookingConfig)
</script>

<template>
  <MarketingPageShell width="3xl">
    <RouterLink :to="MARKETING_HOME_PATH" class="mb-4 inline-flex" aria-label="Flotory home">
      <FlotoryLogo size="lg" />
    </RouterLink>

    <AppCard :wrapper-class="`${marketingCardClass} sm:p-6`">
      <div class="flex flex-wrap items-center gap-3">
        <AppBadge tone="amber">Owner demo</AppBadge>
        <h1 class="text-2xl font-black tracking-tight text-ink sm:text-3xl">Book a 30-minute walkthrough</h1>
      </div>
      <p class="mt-2 text-sm text-ink-muted">
        Pick a time below — no Flotory account needed.
      </p>

      <p v-if="loading" class="mt-4 text-sm font-semibold text-ink-muted">Loading calendar...</p>
      <p v-else-if="configError" class="mt-4 text-sm font-semibold text-ink-muted">{{ configError }}</p>

      <iframe
        v-else-if="calendlyIframeUrl"
        :key="calendlyIframeUrl"
        :src="calendlyIframeUrl"
        title="Book a Flotory demo on Calendly"
        class="mt-4 w-full rounded-2xl bg-surface"
        :style="iframeStyle"
        scrolling="no"
      />

      <p v-else class="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted px-4 py-5 text-sm font-semibold text-ink-muted">
        Online booking is not configured yet. Email team@flotory.com to schedule.
      </p>

      <p v-if="calendlyIframeUrl && !loading" class="mt-2 text-center text-sm font-semibold text-ink-muted">
        <a
          :href="calendlyIframeUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="font-bold text-ink underline decoration-accent decoration-2 underline-offset-2"
        >
          Open Calendly in a new tab
        </a>
      </p>
    </AppCard>
  </MarketingPageShell>
</template>
