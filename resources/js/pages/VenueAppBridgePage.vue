<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import { marketingCardClass } from '@/lib/marketingPage'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { api } from '@/lib/api'
import { mobileVenueDeepLink } from '@/lib/mobileApp'
import { venueLogoUrl } from '@/lib/venueMedia'
import type { VenueCategory } from '@/types'

interface VenueLandingPayload {
  venue: {
    id: number
    name: string
    slug: string
    category?: VenueCategory | null
    logo?: string | null
    logo_thumb?: string | null
  }
  milestones: Array<{
    id: number
    title: string
    required_stamps: number
  }>
}

const route = useRoute()
const loading = ref(true)
const error = ref('')
const landing = ref<VenueLandingPayload | null>(null)

const slug = computed(() => String(route.params.slug ?? ''))
const appDeepLink = computed(() => mobileVenueDeepLink(slug.value))

onMounted(async () => {
  if (!slug.value) {
    error.value = 'Venue link unavailable.'
    loading.value = false
    return
  }

  try {
    landing.value = await api<VenueLandingPayload>(`/public/venues/${encodeURIComponent(slug.value)}/landing`, {
      includeAuth: false,
    })
  } catch {
    error.value = 'This venue link is unavailable.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <MarketingPageShell width="lg" padding-y="10">
      <div class="mb-6 inline-flex">
        <FlotoryLogo size="lg" />
      </div>

      <AppCard :wrapper-class="`${marketingCardClass} sm:p-8`">
        <p v-if="loading" class="text-sm font-semibold text-ink-muted">Loading venue…</p>

        <template v-else-if="landing">
          <div class="flex items-center gap-4">
            <img
              v-if="landing.venue.logo_thumb || landing.venue.logo"
              :src="venueLogoUrl(landing.venue)"
              :alt="landing.venue.name"
              class="size-16 rounded-2xl border border-border object-cover"
            >
            <div>
              <h1 class="text-2xl font-black tracking-tight text-ink">{{ landing.venue.name }}</h1>
              <p class="mt-1 text-sm text-ink-muted">Join and collect rewards in the Flotory app.</p>
            </div>
          </div>

          <ul v-if="landing.milestones.length" class="mt-6 space-y-2 text-sm text-ink-muted">
            <li v-for="milestone in landing.milestones.slice(0, 3)" :key="milestone.id">
              <span class="font-bold text-ink">{{ milestone.required_stamps }} stamps</span>
              — {{ milestone.title }}
            </li>
          </ul>

          <a :href="appDeepLink" class="mt-8 block">
            <AppButton class="w-full" size="lg">Open in Flotory app</AppButton>
          </a>
          <p class="mt-3 text-center text-xs font-semibold leading-relaxed text-ink-muted">
            Install Flotory from the App Store or Google Play if you do not have it yet.
          </p>
        </template>

        <template v-else>
          <h1 class="text-2xl font-black tracking-tight text-ink">Venue unavailable</h1>
          <p class="mt-2 text-sm text-ink-muted">{{ error || 'This venue link is unavailable.' }}</p>
        </template>
      </AppCard>
  </MarketingPageShell>
</template>
