<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import { MARKETING_HOME_PATH } from '@/lib/brand'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { api } from '@/lib/api'
import { buildCalendlyEmbedUrl, type DemoBookingConfig } from '@/lib/demoBooking'

const route = useRoute()

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
  <main class="min-h-screen bg-auth-gradient px-4 py-8 text-primary-text sm:py-12">
    <section class="mx-auto w-full max-w-3xl">
      <RouterLink :to="MARKETING_HOME_PATH" class="mb-6 inline-flex" aria-label="Flotory home">
        <FlotoryLogo inverted size="lg" />
      </RouterLink>

      <AppCard wrapper-class="rounded-3xl border border-border/20 bg-surface/95 p-6 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:p-8">
        <AppBadge tone="blue">Owner demo</AppBadge>
        <h1 class="mt-4 text-4xl font-black tracking-tight text-ink">Book a 30-minute walkthrough</h1>
        <p class="mt-3 text-sm leading-relaxed text-ink-muted">
          Pick a time below — no Flotory account needed.
        </p>

        <p v-if="loading" class="mt-6 text-sm font-semibold text-ink-muted">Loading calendar...</p>
        <p v-else-if="configError" class="mt-6 text-sm font-semibold text-ink-muted">{{ configError }}</p>

        <iframe
          v-else-if="calendlyIframeUrl"
          :key="calendlyIframeUrl"
          :src="calendlyIframeUrl"
          title="Book a Flotory demo on Calendly"
          class="mt-6 min-h-[700px] w-full rounded-2xl border border-border/70 bg-surface"
          style="min-height: 700px; border: 0;"
        />

        <p v-else class="mt-6 rounded-2xl border border-dashed border-border px-4 py-5 text-sm font-semibold text-ink-muted">
          Online booking is not configured yet. Email team@flotory.com to schedule.
        </p>

        <p v-if="calendlyIframeUrl && !loading" class="mt-3 text-center text-sm font-semibold text-ink-muted">
          <a
            :href="calendlyIframeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="font-bold text-ink underline decoration-accent/60 underline-offset-2"
          >
            Open Calendly in a new tab
          </a>
        </p>
      </AppCard>
    </section>
  </main>
</template>
