<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import {
  buildAuthRedirectWithVenue,
  buildRegisterRedirectWithVenue,
  buildVenueLandingUrl,
  completeVenueOnboarding,
  fetchVenueLanding,
} from '@/lib/onboarding'
import { rewardImageUrl } from '@/lib/rewardMedia'
import { venueCoverUrl, venueLogoUrl } from '@/lib/venueMedia'
import { useAuthStore } from '@/stores/auth'
import type { VenueLandingPayload } from '@/lib/onboarding'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const slug = computed(() => String(route.params.slug ?? ''))
const loading = ref(true)
const joinAction = useAsyncAction()
const error = ref('')
const landing = ref<VenueLandingPayload | null>(null)

const milestones = computed(() => landing.value?.milestones ?? [])
const joinNextPath = computed(() => `/card?venue_id=${landing.value?.venue.id ?? ''}`)

async function loadLanding() {
  loading.value = true
  error.value = ''

  try {
    landing.value = await fetchVenueLanding(slug.value)
  } catch {
    error.value = 'This venue link is unavailable right now.'
  } finally {
    loading.value = false
  }
}

async function handleJoin() {
  if (!landing.value) return

  if (!auth.isAuthenticated) {
    await router.push(buildAuthRedirectWithVenue(slug.value, joinNextPath.value))
    return
  }

  try {
    await joinAction.run(async () => {
      error.value = ''

      try {
        const result = await completeVenueOnboarding(slug.value)
        await router.push(`/card?venue_id=${result.venueId}`)
      } catch {
        error.value = 'Could not join this venue right now. Please try again.'
        throw new Error('join-failed')
      }
    })
  } catch {
    // Button shows Failed.
  }
}

onMounted(async () => {
  await loadLanding()
  if (auth.isAuthenticated) {
    await handleJoin()
  }
})
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
    <section class="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-8">
      <div v-if="loading" class="flex flex-1 flex-col justify-center">
        <p class="text-center text-sm font-semibold text-white/70">Loading venue experience...</p>
      </div>

      <div v-else-if="error" class="flex flex-1 flex-col justify-center gap-4 text-center">
        <p class="text-sm font-semibold text-red-200">{{ error }}</p>
        <AppButton variant="secondary" @click="loadLanding">Try again</AppButton>
      </div>

      <template v-else-if="landing">
        <div class="flex items-center justify-between gap-3">
          <FlotoryLogo inverted size="sm" :show-wordmark="false" />
          <div class="text-right">
            <p class="text-xs font-semibold uppercase tracking-wide text-cyan-200/90">Flotory rewards</p>
            <p class="text-xs font-semibold text-white/60">{{ landing.venue.name }}</p>
          </div>
        </div>

        <div class="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur">
          <img :src="venueCoverUrl(landing.venue)" alt="" class="h-40 w-full object-cover">
          <div class="flex items-center gap-4 p-5">
            <div class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/10 ring-2 ring-white/20">
              <img :src="venueLogoUrl(landing.venue)" :alt="landing.venue.name" class="size-full object-cover">
            </div>
            <div>
              <h1 class="text-3xl font-black tracking-tight">{{ landing.venue.name }}</h1>
              <p class="mt-2 text-sm text-white/70">Join & collect rewards</p>
            </div>
          </div>
        </div>

        <div class="mt-6 grid gap-3">
          <article
            v-for="milestone in milestones"
            :key="milestone.id"
            class="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
          >
            <img :src="rewardImageUrl(milestone)" :alt="milestone.title" class="h-28 w-full object-cover">
            <div class="p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-emerald-300">{{ milestone.required_stamps }} visits</p>
              <p class="mt-1 text-lg font-black">{{ milestone.title }}</p>
              <p v-if="milestone.description" class="mt-1 text-sm text-white/65">{{ milestone.description }}</p>
            </div>
          </article>
          <p v-if="!milestones.length" class="rounded-2xl border border-dashed border-white/20 p-4 text-sm text-white/60">
            Milestones are being prepared. Join now and your first reward unlocks soon.
          </p>
        </div>

        <div class="mt-8 space-y-3">
          <AsyncActionButton
            class="w-full"
            block
            size="lg"
            idle-label="Join & collect rewards"
            loading-label="Joining…"
            success-label="Joined ✓"
            :loading="joinAction.loading"
            :success="joinAction.success"
            :error="joinAction.error"
            @click="handleJoin"
          />
          <AppButton
            variant="ghost"
            class="w-full border border-white/20 text-white hover:bg-white/10"
            @click="router.push(buildRegisterRedirectWithVenue(slug, joinNextPath))"
          >
            Create account
          </AppButton>
        </div>

        <p class="mt-4 text-center text-xs text-white/50">
          {{ buildVenueLandingUrl(slug) }}
        </p>
      </template>
    </section>
  </main>
</template>
