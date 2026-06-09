<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import VenueScanRewardHeroCard from '@/components/loyalty/VenueScanRewardHeroCard.vue'
import VenueScanQuickFacts from '@/components/loyalty/VenueScanQuickFacts.vue'
import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { api } from '@/lib/api'
import {
  buildAuthRedirectWithVenue,
  buildRegisterRedirectWithVenue,
  completeVenueOnboarding,
  fetchVenueLanding,
} from '@/lib/onboarding'
import { venueLogoUrl } from '@/lib/venueMedia'
import { useAuthStore } from '@/stores/auth'
import type { Customer } from '@/types'
import type { VenueLandingPayload } from '@/lib/onboarding'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const slug = computed(() => String(route.params.slug ?? ''))
const loading = ref(true)
const joinAction = useAsyncAction()
const error = ref('')
const landing = ref<VenueLandingPayload | null>(null)
const memberCard = ref<Customer | null>(null)

const joinNextPath = computed(() => `/wallet?venue_id=${landing.value?.venue.id ?? ''}`)
const isMember = computed(() => Boolean(memberCard.value))
const primaryLabel = computed(() => {
  if (isMember.value) return 'Open my card'
  return 'Start collecting rewards'
})

async function loadMembership() {
  memberCard.value = null

  if (!auth.isAuthenticated || !landing.value) {
    return
  }

  try {
    const response = await api<{ cards: Customer[] }>('/customer/cards')
    memberCard.value = response.cards.find((card) => card.venue_id === landing.value?.venue.id) ?? null
  } catch {
    memberCard.value = null
  }
}

async function loadLanding() {
  loading.value = true
  error.value = ''

  try {
    landing.value = await fetchVenueLanding(slug.value)
    await loadMembership()
  } catch {
    error.value = 'This venue link is unavailable right now.'
  } finally {
    loading.value = false
  }
}

async function handlePrimaryAction() {
  if (!landing.value) return

  if (isMember.value) {
    await router.push(joinNextPath.value)
    return
  }

  if (!auth.isAuthenticated) {
    await router.push(buildRegisterRedirectWithVenue(slug.value, joinNextPath.value))
    return
  }

  try {
    await joinAction.run(async () => {
      error.value = ''

      try {
        const result = await completeVenueOnboarding(slug.value)
        await router.push(`/wallet?venue_id=${result.venueId}`)
      } catch {
        error.value = 'Could not join this venue right now. Please try again.'
        throw new Error('join-failed')
      }
    })
  } catch {
    // Button shows Failed.
  }
}

onMounted(loadLanding)
</script>

<template>
  <main class="min-h-screen bg-[#FCFAF6] text-ink">
    <div
      class="pointer-events-none fixed inset-0 opacity-60"
      aria-hidden="true"
      style="background-image: radial-gradient(circle at 1px 1px, rgba(215, 163, 93, 0.07) 1px, transparent 0); background-size: 22px 22px;"
    />

    <div v-if="loading" class="flex min-h-screen flex-col justify-center px-5">
      <p class="text-center text-sm font-semibold text-ink-muted">Loading...</p>
    </div>

    <div v-else-if="error" class="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-5 text-center">
      <p class="text-sm font-semibold text-danger">{{ error }}</p>
      <AppButton variant="secondary" @click="loadLanding">Try again</AppButton>
    </div>

    <template v-else-if="landing">
      <section class="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-32 pt-10">
        <!-- 1. Venue -->
        <div class="flex flex-col items-center text-center">
          <div class="grid size-20 place-items-center overflow-hidden rounded-3xl border border-border bg-surface p-1 shadow-sm">
            <img
              :src="venueLogoUrl(landing.venue)"
              :alt="landing.venue.name"
              class="size-full rounded-[22px] object-cover"
            >
          </div>
          <h1 class="mt-4 text-2xl font-black tracking-tight text-ink">
            {{ landing.venue.name }}
          </h1>
        </div>

        <!-- 2. Reward -->
        <div class="mt-8">
          <VenueScanRewardHeroCard
            :venue-name="landing.venue.name"
            :category="landing.venue.category"
            :hero="landing.hero_reward"
          />
        </div>

        <!-- 3. Quick facts -->
        <div class="mt-6">
          <VenueScanQuickFacts
            :first-reward-stamps="landing.hero_reward?.required_stamps"
            :milestone-count="landing.milestones.length"
          />
        </div>

        <div class="flex-1" />
      </section>

      <!-- 4. CTA -->
      <div class="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-[#FCFAF6]/95 px-5 pb-6 pt-4 backdrop-blur-md">
        <div class="mx-auto w-full max-w-md space-y-2">
          <AsyncActionButton
            class="w-full shadow-[0_18px_40px_-20px_rgba(15,23,42,0.3)]"
            block
            size="lg"
            :idle-label="primaryLabel"
            loading-label="Joining…"
            success-label="Joined ✓"
            :loading="joinAction.loading"
            :success="joinAction.success"
            :error="joinAction.error"
            @click="handlePrimaryAction"
          />

          <p v-if="!auth.isAuthenticated && !isMember" class="text-center text-sm text-ink-soft">
            Already a member?
            <button
              type="button"
              class="font-bold text-ink underline-offset-2 hover:underline"
              @click="router.push(buildAuthRedirectWithVenue(slug, joinNextPath))"
            >
              Sign in
            </button>
          </p>

          <p v-if="error" class="text-center text-sm font-semibold text-danger">{{ error }}</p>
        </div>
      </div>
    </template>
  </main>
</template>
