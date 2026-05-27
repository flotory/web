<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import {
  buildAuthRedirectWithVenue,
  buildRegisterRedirectWithVenue,
  buildVenueLandingUrl,
  completeVenueOnboarding,
  fetchVenueLanding,
  QR_MESSAGE_PRESETS,
  type QrMessagePresetId,
} from '@/lib/onboarding'
import { useAuthStore } from '@/stores/auth'
import type { VenueLandingPayload } from '@/lib/onboarding'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const slug = computed(() => String(route.params.slug ?? ''))
const loading = ref(true)
const joining = ref(false)
const error = ref('')
const landing = ref<VenueLandingPayload | null>(null)
const selectedPreset = ref<QrMessagePresetId>('collect')

const headline = computed(() => QR_MESSAGE_PRESETS.find((item) => item.id === selectedPreset.value)?.headline ?? 'Join & collect rewards')
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

  joining.value = true
  error.value = ''

  try {
    const result = await completeVenueOnboarding(slug.value)
    await router.push(`/card?venue_id=${result.venueId}`)
  } catch {
    error.value = 'Could not join this venue right now. Please try again.'
  } finally {
    joining.value = false
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
        <div class="flex items-center justify-between">
          <AppBadge tone="blue">Loyalty rewards</AppBadge>
          <p class="text-xs font-semibold uppercase tracking-wide text-white/60">{{ landing.venue.name }}</p>
        </div>

        <div class="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div class="flex items-center gap-4">
            <div class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/10 text-xl font-black">
              <img v-if="landing.venue.logo" :src="landing.venue.logo" alt="" class="size-full object-cover">
              <span v-else>{{ landing.venue.name.slice(0, 1) }}</span>
            </div>
            <div>
              <h1 class="text-3xl font-black tracking-tight">{{ landing.venue.name }}</h1>
              <p class="mt-2 text-sm text-white/70">{{ headline }}</p>
            </div>
          </div>
        </div>

        <div class="mt-6 grid gap-3">
          <article
            v-for="milestone in milestones"
            :key="milestone.id"
            class="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <p class="text-xs font-bold uppercase tracking-wide text-emerald-300">{{ milestone.required_stamps }} visits</p>
            <p class="mt-1 text-lg font-black">{{ milestone.title }}</p>
            <p v-if="milestone.description" class="mt-1 text-sm text-white/65">{{ milestone.description }}</p>
          </article>
          <p v-if="!milestones.length" class="rounded-2xl border border-dashed border-white/20 p-4 text-sm text-white/60">
            Milestones are being prepared. Join now and your first reward unlocks soon.
          </p>
        </div>

        <div class="mt-8 space-y-3">
          <AppButton class="w-full" size="lg" :disabled="joining" @click="handleJoin">
            {{ joining ? 'Joining...' : 'Join & collect rewards' }}
          </AppButton>
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
