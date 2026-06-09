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
import { ownerVenueSetupLocation, resolvePostLoginDestination } from '@/lib/venueRoles'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const route = useRoute()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const authIntent = computed(() => (route.query.intent === 'owner' ? 'owner' : null))
const isStaffInvite = computed(() => isStaffInviteRoute(route.query))

const loginLink = computed(() => {
  const query: Record<string, string> = {}
  if (isStaffInvite.value) {
    query.staff = '1'
  }
  if (typeof route.query.email === 'string') {
    query.email = route.query.email
  }
  if (authIntent.value === 'owner') {
    query.intent = 'owner'
  }

  const params = new URLSearchParams(query)

  return params.toString() ? `/login?${params.toString()}` : '/login'
})

function continueWithGoogle() {
  const nextPath = authIntent.value === 'owner' ? '/my-venues?create=1' : undefined
  window.location.href = buildGoogleAuthUrlWithIntent(null, nextPath, authIntent.value)
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

    await workspace.bootstrap(true)

    if (authIntent.value === 'owner') {
      await router.push(ownerVenueSetupLocation())
      return
    }

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.push(
      resolvePostLoginDestination(redirect, auth.user?.is_admin, workspace.activeVenues, workspace.effectiveVenueId),
    )
  } catch (exception) {
    if (exception instanceof ApiError && exception.message.toLowerCase().includes('already been taken')) {
      error.value = 'This email already has an account — usually from a staff invite. Log in instead.'
    } else {
      error.value = exception instanceof ApiError ? exception.message : 'Unable to create your account.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (isStaffInvite.value) {
    void router.replace(loginLink.value)
    return
  }

  if (typeof route.query.email === 'string') {
    email.value = route.query.email
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
      <AppBadge tone="green">{{ authIntent === 'owner' ? 'Launch Flotory' : 'Create account' }}</AppBadge>
      <h1 class="mt-4 text-4xl font-black tracking-tight text-ink">{{ authIntent === 'owner' ? 'Launch loyalty in minutes' : 'Create your account' }}</h1>
      <p class="mt-2 text-sm leading-relaxed text-ink-muted">
        {{ authIntent === 'owner' ? 'Create your account, set up your first venue, and start collecting stamps.' : 'Venue owners can register here. Guests collect rewards in the Flotory mobile app.' }}
      </p>

      <AppButton
        class="mt-6 w-full border border-border bg-surface-muted text-ink shadow-sm transition hover:bg-surface-muted"
        size="lg"
        :disabled="loading"
        @click="continueWithGoogle"
      >
        <span class="inline-flex items-center gap-2">
          <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3 14.5 2 12 2 6.9 2 2.8 6.5 2.8 12s4.1 10 9.2 10c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1.1-.2-1.6H12z"/>
            <path fill="#34A853" d="M3.8 7.3l3.2 2.4C7.9 8 9.8 6.6 12 6.6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3 14.5 2 12 2 8.4 2 5.2 4.1 3.8 7.3z"/>
            <path fill="#FBBC05" d="M12 22c2.4 0 4.5-.8 6.1-2.3l-2.8-2.3c-.8.6-1.9 1-3.3 1-2.5 0-4.6-1.6-5.4-3.9l-3.3 2.5C4.7 20.1 8 22 12 22z"/>
            <path fill="#4285F4" d="M21.8 12.9c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.2-1.1 2.2-2.2 2.9l2.8 2.3c1.6-1.5 2.7-3.8 2.7-7.5z"/>
          </svg>
          Continue with Google
        </span>
      </AppButton>

      <div class="my-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
        <span class="h-px flex-1 bg-border" />
        or
        <span class="h-px flex-1 bg-border" />
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="text-sm font-bold text-ink-muted" for="name">Name</label>
          <input id="name" v-model="name" required :class="authFieldClass">
        </div>
        <div>
          <label class="text-sm font-bold text-ink-muted" for="email">Email</label>
          <input id="email" v-model="email" required type="email" autocomplete="email" :class="authFieldClass">
        </div>
        <div>
          <label class="text-sm font-bold text-ink-muted" for="password">Password</label>
          <input id="password" v-model="password" required minlength="8" type="password" autocomplete="new-password" :class="authFieldClass">
        </div>
        <p v-if="error" class="rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">
          {{ error }}
          <RouterLink v-if="error.includes('Log in')" :to="loginLink" class="mt-2 block font-black text-danger underline">
            Go to log in
          </RouterLink>
        </p>
        <AppButton class="w-full" size="lg" type="submit" :disabled="loading">
          {{ loading ? 'Creating account...' : 'Create account' }}
        </AppButton>
      </form>

      <p class="mt-5 text-center text-sm text-ink-muted">
        Already have an account?
        <RouterLink :to="loginLink" class="font-bold text-ink">
          Log in
        </RouterLink>
      </p>

      <p class="mt-4 text-center text-sm text-ink-muted">
        Guest collecting rewards?
        <RouterLink to="/app" class="font-bold text-ink">Get the mobile app</RouterLink>
      </p>
      </AppCard>

      <div v-if="authIntent === 'owner'" class="mt-4 overflow-hidden rounded-3xl border border-white/15 bg-surface/5 p-4 shadow-2xl shadow-black/40 backdrop-blur">
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/90">Launch loyalty for your venue</p>
        <p class="mt-2 text-sm leading-relaxed text-white/85">
          QR-based loyalty for cafes, bars, and restaurants. Owners run everything from this dashboard — guests and staff use the Flotory mobile app.
        </p>
        <ol class="mt-4 grid gap-2 sm:grid-cols-3">
          <li class="rounded-2xl border border-white/10 bg-surface/10 p-3">
            <p class="text-xs font-bold uppercase tracking-wide text-cyan-200/90">1</p>
            <p class="mt-1 text-sm font-bold text-white">Guests scan your QR</p>
            <p class="mt-1 text-xs text-white/70">They join in the Flotory app.</p>
          </li>
          <li class="rounded-2xl border border-white/10 bg-surface/10 p-3">
            <p class="text-xs font-bold uppercase tracking-wide text-cyan-200/90">2</p>
            <p class="mt-1 text-sm font-bold text-white">Staff add stamps</p>
            <p class="mt-1 text-xs text-white/70">Scanner lives in the mobile app.</p>
          </li>
          <li class="rounded-2xl border border-white/10 bg-surface/10 p-3">
            <p class="text-xs font-bold uppercase tracking-wide text-cyan-200/90">3</p>
            <p class="mt-1 text-sm font-bold text-white">Rewards bring them back</p>
            <p class="mt-1 text-xs text-white/70">Milestones unlock perks guests actually claim.</p>
          </li>
        </ol>
      </div>
    </section>
  </main>
</template>
