<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { Venue } from '@/types'

const router = useRouter()
const auth = useAuthStore()

const name = ref('My Cafe')
const slug = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  loading.value = true
  error.value = ''

  try {
    await api<{ venue: Venue }>('/venues', {
      method: 'POST',
      body: {
        name: name.value,
        slug: slug.value || undefined,
      },
    })
    await auth.fetchUser()
    await router.push('/dashboard')
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Unable to create venue.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
    <AppCard wrapper-class="w-full max-w-md">
      <AppBadge tone="blue">Venue onboarding</AppBadge>
      <h1 class="mt-4 text-4xl font-black tracking-tight text-slate-950">Create your venue</h1>
      <p class="mt-2 text-sm text-slate-500">This creates the first workspace for rewards, scanner, and analytics.</p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="text-sm font-bold text-slate-600" for="venue-name">Venue name</label>
          <input id="venue-name" v-model="name" required class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white">
        </div>
        <div>
          <label class="text-sm font-bold text-slate-600" for="venue-slug">Slug optional</label>
          <input id="venue-slug" v-model="slug" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white" placeholder="my-venue">
        </div>
        <p v-if="error" class="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>
        <AppButton class="w-full" size="lg" type="submit" :disabled="loading">
          {{ loading ? 'Creating...' : 'Create venue' }}
        </AppButton>
      </form>
    </AppCard>
  </main>
</template>
