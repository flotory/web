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
import { useWorkspaceStore } from '@/stores/workspace'
import type { VenueLandingPayload } from '@/lib/onboarding'

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const route = useRoute()
const router = useRouter()

const email = ref('customer@example.com')
const password = ref('password')
const loading = ref(false)
const oauthLoading = ref(false)
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
    await auth.login({ email: email.value, password: password.value })
    await workspace.bootstrap(true)

    if (venueSlug.value) {
      const result = await completeVenueOnboarding(venueSlug.value)
      await router.push(`/card?venue_id=${result.venueId}`)
      return
    }

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    if (redirect) {
      await router.push(sanitizeRedirect(redirect))
      return
    }

    await router.push(
      auth.user?.role === 'admin' || workspace.hasMembership ? '/dashboard' : '/card',
    )
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Unable to log in. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const oauthToken = typeof route.query.oauth_token === 'string' ? route.query.oauth_token : null
  if (oauthToken) {
    oauthLoading.value = true
    auth
      .loginWithToken(oauthToken)
      .then(async () => {
        await workspace.bootstrap(true)
        if (venueSlug.value) {
          const result = await completeVenueOnboarding(venueSlug.value)
          await router.replace(`/card?venue_id=${result.venueId}`)
          return
        }

        const safeRedirect = sanitizeRedirect(typeof route.query.redirect === 'string' ? route.query.redirect : '/card')
        await router.replace(safeRedirect)
      })
      .catch(() => {
        error.value = 'Google sign in failed. Please try again.'
      })
      .finally(() => {
        oauthLoading.value = false
      })
  }

  if (typeof route.query.email === 'string') {
    email.value = route.query.email
  }

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
            <p class="text-xs text-white/70">Your loyalty card is waiting</p>
          </div>
        </div>
        <p class="mt-3 text-sm text-white/85">
          {{ landing.milestones[0]?.title ?? 'Start collecting rewards on your next visit.' }}
          <span v-if="landing.milestones[0]" class="text-cyan-200"> · {{ landing.milestones[0].required_stamps }} visits</span>
        </p>
      </div>

      <AppCard wrapper-class="w-full rounded-3xl border border-slate-200/20 bg-white/95 p-6 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:p-7">
      <AppBadge tone="blue">{{ venueSlug ? 'Start collecting rewards' : 'Welcome back' }}</AppBadge>
      <h1 class="mt-4 text-4xl font-black tracking-tight text-slate-950">{{ venueSlug ? 'Join your favorite venue' : 'Log in' }}</h1>
      <p class="mt-2 text-sm leading-relaxed text-slate-500">
        {{ venueSlug ? 'Continue in seconds and open your loyalty card instantly.' : 'Sign in to manage venues, staff, and rewards.' }}
      </p>

      <AppButton
        class="mt-6 w-full border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50"
        size="lg"
        :disabled="loading || oauthLoading"
        @click="continueWithGoogle"
      >
        {{ oauthLoading ? 'Connecting Google...' : 'Continue with Google' }}
      </AppButton>

      <div class="my-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        <span class="h-px flex-1 bg-slate-200" />
        or
        <span class="h-px flex-1 bg-slate-200" />
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="text-sm font-bold text-slate-600" for="email">Email</label>
          <input id="email" v-model="email" type="email" autocomplete="email" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white">
        </div>
        <div>
          <label class="text-sm font-bold text-slate-600" for="password">Password</label>
          <input id="password" v-model="password" type="password" autocomplete="current-password" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white">
        </div>
        <p v-if="error" class="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>
        <AppButton class="w-full" size="lg" type="submit" :disabled="loading">
          {{ loading ? 'Logging in...' : 'Log in' }}
        </AppButton>
      </form>

      <p class="mt-5 text-center text-sm text-slate-500">
        New here?
        <RouterLink
          :to="venueSlug ? `/register?venue_slug=${encodeURIComponent(venueSlug)}&redirect=${encodeURIComponent(postAuthPath)}` : '/register'"
          class="font-bold text-slate-950"
        >
          Create an account
        </RouterLink>
      </p>
      </AppCard>
    </section>
  </main>
</template>
