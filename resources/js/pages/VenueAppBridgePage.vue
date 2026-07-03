<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import MarketingPageHeader from '@/components/layout/MarketingPageHeader.vue'
import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import VenueJoinBridgeCard from '@/components/marketing/VenueJoinBridgeCard.vue'
import { marketingCardClass } from '@/lib/marketingPage'
import AppCard from '@/components/ui/AppCard.vue'
import { api } from '@/lib/api'
import { mobileVenueDeepLink } from '@/lib/mobileApp'
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
  hero_reward?: {
    id: number
    title: string
    description?: string | null
    image?: string | null
    image_thumb?: string | null
    required_stamps: number
  } | null
  social_proof?: {
    members_count: number
    rewards_claimed_count: number
  } | null
}

const route = useRoute()
const loading = ref(true)
const error = ref('')
const landing = ref<VenueLandingPayload | null>(null)

const slug = computed(() => String(route.params.slug ?? ''))
const appDeepLink = computed(() => (slug.value ? mobileVenueDeepLink(slug.value) : ''))

const heroReward = computed(() => {
  if (landing.value?.hero_reward) {
    return landing.value.hero_reward
  }

  const firstMilestone = landing.value?.milestones[0]
  if (!firstMilestone) {
    return null
  }

  return {
    title: firstMilestone.title,
    required_stamps: firstMilestone.required_stamps,
  }
})

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
    <MarketingPageHeader logo-size="md" header-class="mb-5" />

    <AppCard :wrapper-class="`${marketingCardClass} sm:p-8`">
      <p v-if="loading" class="text-sm font-semibold text-ink-muted">Loading venue…</p>

      <VenueJoinBridgeCard
        v-else-if="landing"
        :venue="landing.venue"
        :hero-reward="heroReward"
        :social-proof="landing.social_proof"
        :app-deep-link="appDeepLink"
      />

      <template v-else>
        <h1 class="text-2xl font-black tracking-tight text-ink">Venue unavailable</h1>
        <p class="mt-2 text-sm text-ink-muted">{{ error || 'This venue link is unavailable.' }}</p>
      </template>
    </AppCard>
  </MarketingPageShell>
</template>
