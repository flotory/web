<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { ApiError } from '@/lib/api'
import { buildGoogleAuthUrlWithIntent, completeVenueOnboarding, fetchVenueLanding } from '@/lib/onboarding'
import { authFieldClass, isStaffInviteRoute } from '@/lib/authForm'
import { sanitizeRedirect } from '@/lib/redirect'
import { markOwnerOnboardingIntent } from '@/lib/ownerIntent'
import { resolvePostLoginDestination } from '@/lib/venueRoles'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import type { VenueLandingPayload } from '@/lib/onboarding'
import { rewardThumbUrl } from '@/lib/rewardMedia'
import { venueLogoThumbUrl } from '@/lib/venueMedia'

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const oauthLoading = ref(false)
const error = ref('')
const landing = ref<VenueLandingPayload | null>(null)

const venueSlug = computed(() => (typeof route.query.venue_slug === 'string' ? route.query.venue_slug : null))
const postAuthPath = computed(() => {
  if (authIntent.value === 'owner') {
    return '/onboarding/create-venue'
  }

  return sanitizeRedirect(typeof route.query.redirect === 'string' ? route.query.redirect : '/wallet')
})
const authIntent = computed(() => (route.query.intent === 'owner' ? 'owner' : null))
const isStaffInvite = computed(() => isStaffInviteRoute(route.query))

function continueWithGoogle() {
  window.location.href = buildGoogleAuthUrlWithIntent(venueSlug.value, postAuthPath.value, authIntent.value)
}

async function submit() {
  loading.value = true
  error.value = ''

  try {
    await auth.login({ email: email.value, password: password.value })
    await workspace.bootstrap(true)

    if (venueSlug.value) {
      const result = await completeVenueOnboarding(venueSlug.value)
      await router.push(`/wallet?venue_id=${result.venueId}`)
      return
    }

    if (authIntent.value === 'owner') {
      markOwnerOnboardingIntent()
      await router.push('/onboarding/create-venue')
      return
    }

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.push(
      resolvePostLoginDestination(redirect, auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId),
    )
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Unable to log in. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (authIntent.value === 'owner') {
    markOwnerOnboardingIntent()
  }

  const oauthToken = typeof route.query.oauth_token === 'string' ? route.query.oauth_token : null
  if (oauthToken) {
    oauthLoading.value = true
    auth
      .loginWithToken(oauthToken)
      .then(async () => {
        await workspace.bootstrap(true)
        if (venueSlug.value) {
          const result = await completeVenueOnboarding(venueSlug.value)
          await router.replace(`/wallet?venue_id=${result.venueId}`)
          return
        }

        if (authIntent.value === 'owner') {
          markOwnerOnboardingIntent()
          await router.replace('/onboarding/create-venue')
          return
        }

        const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
        await router.replace(
          resolvePostLoginDestination(redirect, auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId),
        )
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

  if (route.query.error === 'google_auth_failed') {
    error.value = 'Google sign-in could not be completed. Try again, or use email and password below.'
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
      <RouterLink to="/" class="mb-6 inline-flex">
        <FlotoryLogo inverted size="lg" />
      </RouterLink>

      <div v-if="landing" class="mb-4 overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-4 shadow-2xl shadow-black/40 backdrop-blur">
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/90">Join rewards in seconds</p>
        <div class="mt-3 flex items-center gap-3">
          <div class="grid size-12 place-items-center overflow-hidden rounded-xl border border-white/20 bg-white/10">
            <img :src="venueLogoThumbUrl(landing.venue)" :alt="landing.venue.name" class="size-full object-cover">
          </div>
          <div>
            <p class="text-lg font-bold leading-tight">{{ landing.venue.name }}</p>
            <p class="text-xs text-white/70">Your loyalty card is waiting</p>
          </div>
        </div>
        <div v-if="landing.milestones[0]" class="mt-3 flex items-center gap-3 rounded-2xl bg-white/5 p-2 ring-1 ring-white/10">
          <img :src="rewardThumbUrl(landing.milestones[0])" alt="" class="size-12 rounded-lg object-cover">
          <p class="text-sm text-white/85">
            {{ landing.milestones[0].title }}
            <span class="text-cyan-200"> · {{ landing.milestones[0].required_stamps }} stamps</span>
          </p>
        </div>
        <p v-else class="mt-3 text-sm text-white/85">Collect stamps to unlock rewards at this venue.</p>
      </div>

      <AppCard wrapper-class="w-full rounded-3xl border border-slate-200/20 bg-white/95 p-6 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:p-7">
      <div v-if="isStaffInvite" class="mb-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
        <p class="font-black">Staff invitation</p>
        <p class="mt-1 font-semibold text-cyan-900">
          Sign in with the email that received the invite. You will return to accept and join the team.
        </p>
      </div>

      <AppBadge tone="blue">{{ isStaffInvite ? 'Staff invitation' : venueSlug ? 'Start collecting rewards' : authIntent === 'owner' ? 'Launch Flotory' : 'Welcome back' }}</AppBadge>
      <h1 class="mt-4 text-4xl font-black tracking-tight text-slate-950">{{ isStaffInvite ? 'Sign in to join the team' : venueSlug ? 'Join your favorite venue' : authIntent === 'owner' ? 'Continue venue setup' : 'Log in' }}</h1>
      <p class="mt-2 text-sm leading-relaxed text-slate-500">
        {{ isStaffInvite ? 'After login you can accept the invitation and open the scanner.' : venueSlug ? 'Continue in seconds and open your loyalty card instantly.' : authIntent === 'owner' ? 'Sign in to continue creating your venue and launch loyalty.' : 'Sign in to manage venues, staff, and rewards.' }}
      </p>

      <AppButton
        class="mt-6 w-full border border-slate-300 bg-slate-50 text-slate-900 shadow-sm transition hover:bg-slate-100"
        size="lg"
        :disabled="loading || oauthLoading"
        @click="continueWithGoogle"
      >
        <span class="inline-flex items-center gap-2">
          <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3 14.5 2 12 2 6.9 2 2.8 6.5 2.8 12s4.1 10 9.2 10c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1.1-.2-1.6H12z"/>
            <path fill="#34A853" d="M3.8 7.3l3.2 2.4C7.9 8 9.8 6.6 12 6.6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3 14.5 2 12 2 8.4 2 5.2 4.1 3.8 7.3z"/>
            <path fill="#FBBC05" d="M12 22c2.4 0 4.5-.8 6.1-2.3l-2.8-2.3c-.8.6-1.9 1-3.3 1-2.5 0-4.6-1.6-5.4-3.9l-3.3 2.5C4.7 20.1 8 22 12 22z"/>
            <path fill="#4285F4" d="M21.8 12.9c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.2-1.1 2.2-2.2 2.9l2.8 2.3c1.6-1.5 2.7-3.8 2.7-7.5z"/>
          </svg>
          {{ oauthLoading ? 'Connecting Google...' : 'Continue with Google' }}
        </span>
      </AppButton>

      <div class="my-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        <span class="h-px flex-1 bg-slate-200" />
        or
        <span class="h-px flex-1 bg-slate-200" />
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="text-sm font-bold text-slate-600" for="email">Email</label>
          <input id="email" v-model="email" type="email" autocomplete="email" :class="authFieldClass">
        </div>
        <div>
          <label class="text-sm font-bold text-slate-600" for="password">Password</label>
          <input id="password" v-model="password" type="password" autocomplete="current-password" :class="authFieldClass">
          <p class="mt-2 text-right">
            <RouterLink
              :to="{ name: 'forgot-password', query: email ? { email } : {} }"
              class="text-xs font-bold text-slate-600 hover:text-slate-950"
            >
              Forgot password?
            </RouterLink>
          </p>
        </div>
        <p v-if="error" class="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>
        <AppButton class="w-full" size="lg" type="submit" :disabled="loading">
          {{ loading ? 'Logging in...' : 'Log in' }}
        </AppButton>
      </form>

      <p v-if="!isStaffInvite" class="mt-5 text-center text-sm text-slate-500">
        New here?
        <RouterLink
          :to="venueSlug
            ? `/register?venue_slug=${encodeURIComponent(venueSlug)}&redirect=${encodeURIComponent(postAuthPath)}`
            : authIntent === 'owner'
              ? '/register?intent=owner'
              : '/register'"
          class="font-bold text-slate-950"
        >
          Create an account
        </RouterLink>
      </p>
      <p v-else class="mt-5 text-center text-xs font-semibold leading-relaxed text-slate-500">
        No account yet? Your manager can resend the invitation from the Team page.
      </p>
      </AppCard>
    </section>
  </main>
</template>
