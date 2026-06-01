<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import VenueLandingPreview from '@/components/loyalty/VenueLandingPreview.vue'
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
import { venueCoverUrl, venueLogoUrl } from '@/lib/venueMedia'
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

const milestones = computed(() => landing.value?.milestones ?? [])
const joinNextPath = computed(() => `/wallet?venue_id=${landing.value?.venue.id ?? ''}`)
const isMember = computed(() => Boolean(memberCard.value))
const previewStamps = computed(() => memberCard.value?.stamps ?? 0)

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
  <main class="min-h-screen bg-[#f7f8fb] text-slate-900">
    <div
      class="pointer-events-none fixed inset-0 opacity-40"
      aria-hidden="true"
      style="background-image: radial-gradient(circle at 1px 1px, rgb(203 213 225 / 0.45) 1px, transparent 0); background-size: 18px 18px;"
    />

    <div v-if="loading" class="flex min-h-screen flex-col justify-center px-5">
      <p class="text-center text-sm font-semibold text-slate-500">Loading rewards...</p>
    </div>

    <div v-else-if="error" class="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-5 text-center">
      <p class="text-sm font-semibold text-red-600">{{ error }}</p>
      <AppButton variant="secondary" @click="loadLanding">Try again</AppButton>
    </div>

    <template v-else-if="landing">
      <header class="relative w-full">
        <div class="relative h-20 w-full overflow-hidden sm:h-24">
          <img
            :src="venueCoverUrl(landing.venue)"
            alt=""
            class="size-full object-cover"
          >
          <div class="absolute inset-0 bg-gradient-to-b from-slate-950/15 via-slate-950/5 to-[#f7f8fb]" />
        </div>
      </header>

      <section class="relative mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-md flex-col px-5 pb-8">
        <div class="relative z-10 -mt-8 flex items-center gap-3">
          <div class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-0.5 shadow-md ring-1 ring-slate-200/80">
            <img
              :src="venueLogoUrl(landing.venue)"
              :alt="landing.venue.name"
              class="size-full rounded-[14px] object-cover"
            >
          </div>
          <div class="min-w-0 text-left">
            <h1 class="truncate text-xl font-black tracking-tight text-slate-950">{{ landing.venue.name }}</h1>
            <p class="mt-0.5 text-sm font-medium text-slate-500">
              {{ isMember ? 'Your loyalty card at this venue' : 'Earn stamps and unlock rewards.' }}
            </p>
          </div>
        </div>

        <div class="mt-5 flex-1">
          <VenueLandingPreview :milestones="milestones" :stamps="previewStamps" />

          <p v-if="!milestones.length" class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-center text-sm text-slate-500">
            Rewards are being set up. Join now and your first stamp is on the way.
          </p>
        </div>

        <div class="sticky bottom-0 mt-6 space-y-3 bg-gradient-to-t from-[#f7f8fb] via-[#f7f8fb] to-transparent pb-2 pt-4">
          <AsyncActionButton
            class="w-full shadow-[0_18px_40px_-20px_rgba(15,23,42,0.45)]"
            block
            size="lg"
            :idle-label="isMember ? 'Open my card' : 'Join & collect rewards'"
            loading-label="Joining…"
            success-label="Joined ✓"
            :loading="joinAction.loading"
            :success="joinAction.success"
            :error="joinAction.error"
            @click="handlePrimaryAction"
          />

          <p v-if="!auth.isAuthenticated" class="text-center text-sm text-slate-500">
            Already a member?
            <button
              type="button"
              class="font-bold text-slate-950 underline-offset-2 hover:underline"
              @click="router.push(buildAuthRedirectWithVenue(slug, joinNextPath))"
            >
              Sign in
            </button>
          </p>
        </div>
      </section>
    </template>
  </main>
</template>
