<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { ApiError } from '@/lib/api'
import { completeVenueOnboarding } from '@/lib/onboarding'
import { sanitizeRedirect } from '@/lib/redirect'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const route = useRoute()
const router = useRouter()

const email = ref('customer@example.com')
const password = ref('password')
const loading = ref(false)
const error = ref('')

const venueSlug = computed(() => (typeof route.query.venue_slug === 'string' ? route.query.venue_slug : null))
const postAuthPath = computed(() => sanitizeRedirect(typeof route.query.redirect === 'string' ? route.query.redirect : '/card'))

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
  if (typeof route.query.email === 'string') {
    email.value = route.query.email
  }
})
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
    <AppCard wrapper-class="w-full max-w-md">
      <AppBadge tone="blue">Welcome back</AppBadge>
      <h1 class="mt-4 text-4xl font-black tracking-tight text-slate-950">Log in</h1>
      <p class="mt-2 text-sm text-slate-500">Use the seeded customer or owner account to test the MVP flow.</p>

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
  </main>
</template>
