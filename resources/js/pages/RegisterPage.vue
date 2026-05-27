<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

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

    await router.push('/card')
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Unable to create your account.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
    <AppCard wrapper-class="w-full max-w-md">
      <AppBadge tone="green">Create account</AppBadge>
      <h1 class="mt-4 text-4xl font-black tracking-tight text-slate-950">Start loyalty</h1>
      <p class="mt-2 text-sm text-slate-500">Create your account, then join venues to start collecting rewards.</p>

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
        <RouterLink to="/login" class="font-bold text-slate-950">Log in</RouterLink>
      </p>
    </AppCard>
  </main>
</template>
