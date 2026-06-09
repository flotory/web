<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { ApiError } from '@/lib/api'
import { buildGoogleAuthUrlWithIntent } from '@/lib/onboarding'
import { authFieldClass, isStaffInviteRoute } from '@/lib/authForm'
import { markOwnerOnboardingIntent } from '@/lib/ownerIntent'
import { resolvePostLoginDestination } from '@/lib/venueRoles'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const oauthLoading = ref(false)
const error = ref('')

const authIntent = computed(() => (route.query.intent === 'owner' ? 'owner' : null))
const isStaffInvite = computed(() => isStaffInviteRoute(route.query))
const postAuthPath = computed(() => {
  if (authIntent.value === 'owner') {
    return '/onboarding/create-venue'
  }

  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
  return redirect
})

function continueWithGoogle() {
  window.location.href = buildGoogleAuthUrlWithIntent(null, postAuthPath.value ?? undefined, authIntent.value)
}

async function submit() {
  loading.value = true
  error.value = ''

  try {
    await auth.login({ email: email.value, password: password.value })
  } catch (exception) {
    error.value = exception instanceof ApiError || exception instanceof Error
      ? exception.message
      : 'Unable to log in. Please try again.'
    loading.value = false
    return
  }

  try {
    await workspace.bootstrap(true)

    if (authIntent.value === 'owner') {
      markOwnerOnboardingIntent()
      await router.push('/onboarding/create-venue')
      return
    }

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.push(
      resolvePostLoginDestination(redirect, auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId),
    )
  } catch {
    error.value = 'Signed in, but we could not open your workspace. Please refresh and try again.'
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
})
</script>

<template>
  <main class="min-h-screen bg-auth-gradient px-4 py-8 text-primary-text sm:py-12">
    <section class="mx-auto w-full max-w-md">
      <RouterLink to="/" class="mb-6 inline-flex">
        <FlotoryLogo inverted size="lg" />
      </RouterLink>

      <AppCard wrapper-class="w-full rounded-3xl border border-border/20 bg-surface/95 p-6 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:p-7">
      <div v-if="isStaffInvite" class="mb-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
        <p class="font-black">Staff invitation</p>
        <p class="mt-1 font-semibold text-cyan-900">
          Sign in with the email that received the invite. You will return to accept and join the team.
        </p>
      </div>

      <AppBadge tone="blue">{{ isStaffInvite ? 'Staff invitation' : authIntent === 'owner' ? 'Launch Flotory' : 'Welcome back' }}</AppBadge>
      <h1 class="mt-4 text-4xl font-black tracking-tight text-ink">{{ isStaffInvite ? 'Sign in to join the team' : authIntent === 'owner' ? 'Continue venue setup' : 'Log in' }}</h1>
      <p class="mt-2 text-sm leading-relaxed text-ink-muted">
        {{ isStaffInvite ? 'After login you can accept the invitation and open the Flotory mobile app.' : authIntent === 'owner' ? 'Sign in to continue creating your venue and launch loyalty.' : 'Sign in to manage venues, staff, and rewards.' }}
      </p>

      <AppButton
        class="mt-6 w-full border border-border bg-surface-muted text-ink shadow-sm transition hover:bg-surface-muted"
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

      <div class="my-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
        <span class="h-px flex-1 bg-border" />
        or
        <span class="h-px flex-1 bg-border" />
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="text-sm font-bold text-ink-muted" for="email">Email</label>
          <input id="email" v-model="email" type="email" autocomplete="email" :class="authFieldClass">
        </div>
        <div>
          <label class="text-sm font-bold text-ink-muted" for="password">Password</label>
          <input id="password" v-model="password" type="password" autocomplete="current-password" :class="authFieldClass">
          <p class="mt-2 text-right">
            <RouterLink
              :to="{ name: 'forgot-password', query: email ? { email } : {} }"
              class="text-xs font-bold text-ink-muted hover:text-ink"
            >
              Forgot password?
            </RouterLink>
          </p>
        </div>
        <p v-if="error" class="rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ error }}</p>
        <AppButton class="w-full" size="lg" type="submit" :disabled="loading">
          {{ loading ? 'Logging in...' : 'Log in' }}
        </AppButton>
      </form>

      <p v-if="!isStaffInvite" class="mt-5 text-center text-sm text-ink-muted">
        New here?
        <RouterLink
          :to="authIntent === 'owner' ? '/register?intent=owner' : '/register'"
          class="font-bold text-ink"
        >
          Create an account
        </RouterLink>
      </p>
      <p v-else class="mt-5 text-center text-xs font-semibold leading-relaxed text-ink-muted">
        No account yet? Your manager can resend the invitation from the Team page.
      </p>

      <p class="mt-4 text-center text-sm text-ink-muted">
        Guest collecting rewards?
        <RouterLink to="/app" class="font-bold text-ink">Get the mobile app</RouterLink>
      </p>
      </AppCard>
    </section>
  </main>
</template>
