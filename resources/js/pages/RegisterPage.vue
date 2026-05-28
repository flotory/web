<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { ApiError } from '@/lib/api'
import { buildGoogleAuthUrl, completeVenueOnboarding, fetchVenueLanding } from '@/lib/onboarding'
import { sanitizeRedirect } from '@/lib/redirect'
import { useAuthStore } from '@/stores/auth'
import type { VenueLandingPayload } from '@/lib/onboarding'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const landing = ref<VenueLandingPayload | null>(null)

const venueSlug = computed(() => (typeof route.query.venue_slug === 'string' ? route.query.venue_slug : null))
const postAuthPath = computed(() => sanitizeRedirect(typeof route.query.redirect === 'string' ? route.query.redirect : '/card'))

function continueWithGoogle() {
  window.location.href = buildGoogleAuthUrl(venueSlug.value, postAuthPath.value)
}

async function submit() {
  loading.value = true
  error.value = ''

  try {
    await auth.register({
      name: name.value,
      email: email.value,
      password: password.value,
      password_confirmation: password.value,
    })

    if (venueSlug.value) {
      const result = await completeVenueOnboarding(venueSlug.value)
      await router.push(`/card?venue_id=${result.venueId}`)
      return
    }

    await router.push('/onboarding')
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Unable to create your account.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (venueSlug.value) {
    fetchVenueLanding(venueSlug.value)
      .then((payload) => {
        landing.value = payload
      })
      .catch(() => undefined)
  }
})
</script>

<template>
  <main class="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_55%)] px-4 py-8 text-slate-100 sm:py-12">
    <section class="mx-auto w-full max-w-md">
      <div v-if="landing" class="mb-4 overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-4 shadow-2xl shadow-black/40 backdrop-blur">
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/90">Join rewards in seconds</p>
        <div class="mt-3 flex items-center gap-3">
          <div class="grid size-12 place-items-center overflow-hidden rounded-xl border border-white/20 bg-white/10">
            <img v-if="landing.venue.logo" :src="landing.venue.logo" alt="" class="size-full object-cover">
            <span v-else class="text-sm font-black">{{ landing.venue.name.slice(0, 1) }}</span>
          </div>
          <div>
            <p class="text-lg font-bold leading-tight">{{ landing.venue.name }}</p>
            <p class="text-xs text-white/70">Start collecting rewards</p>
          </div>
        </div>
        <p class="mt-3 text-sm text-white/85">
          {{ landing.milestones[0]?.title ?? 'Free perks unlock as you visit more.' }}
          <span v-if="landing.milestones[0]" class="text-cyan-200"> · {{ landing.milestones[0].required_stamps }} visits</span>
        </p>
      </div>

      <AppCard wrapper-class="w-full rounded-3xl border border-slate-200/20 bg-white/95 p-6 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:p-7">
      <AppBadge tone="green">{{ venueSlug ? 'Join rewards in seconds' : 'Launch Flotory' }}</AppBadge>
      <h1 class="mt-4 text-4xl font-black tracking-tight text-slate-950">{{ venueSlug ? 'Your loyalty card is waiting' : 'Launch loyalty in minutes' }}</h1>
      <p class="mt-2 text-sm leading-relaxed text-slate-500">
        {{ venueSlug ? 'Create your account and open this venue loyalty card instantly.' : 'Create your account, set up your first venue, and start collecting repeat visits.' }}
      </p>

      <AppButton
        class="mt-6 w-full border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50"
        size="lg"
        :disabled="loading"
        @click="continueWithGoogle"
      >
        Continue with Google
      </AppButton>

      <div class="my-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        <span class="h-px flex-1 bg-slate-200" />
        or
        <span class="h-px flex-1 bg-slate-200" />
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="text-sm font-bold text-slate-600" for="name">Name</label>
          <input id="name" v-model="name" required class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white">
        </div>
        <div>
          <label class="text-sm font-bold text-slate-600" for="email">Email</label>
          <input id="email" v-model="email" required type="email" autocomplete="email" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white">
        </div>
        <div>
          <label class="text-sm font-bold text-slate-600" for="password">Password</label>
          <input id="password" v-model="password" required minlength="8" type="password" autocomplete="new-password" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white">
        </div>
        <p v-if="error" class="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>
        <AppButton class="w-full" size="lg" type="submit" :disabled="loading">
          {{ loading ? 'Creating account...' : 'Create account' }}
        </AppButton>
      </form>

      <p class="mt-5 text-center text-sm text-slate-500">
        Already have an account?
        <RouterLink
          :to="venueSlug ? `/login?venue_slug=${encodeURIComponent(venueSlug)}&redirect=${encodeURIComponent(postAuthPath)}` : '/login'"
          class="font-bold text-slate-950"
        >
          Log in
        </RouterLink>
      </p>
      </AppCard>
    </section>
  </main>
</template>
