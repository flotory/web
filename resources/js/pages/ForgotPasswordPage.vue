<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { api, ApiError } from '@/lib/api'
import { authFieldClass } from '@/lib/authForm'

const route = useRoute()
const email = ref('')
const message = ref('')
const error = ref('')
const submitAction = useAsyncAction()

onMounted(() => {
  if (typeof route.query.email === 'string') {
    email.value = route.query.email
  }
})

async function submit() {
  try {
    await submitAction.run(async () => {
      message.value = ''
      error.value = ''

      try {
        const response = await api<{ message: string }>('/auth/forgot-password', {
          method: 'POST',
          includeAuth: false,
          body: { email: email.value },
        })

        message.value = response.message
      } catch (exception) {
        error.value = exception instanceof ApiError ? exception.message : 'Could not send reset link.'
        throw exception
      }
    })
  } catch {
    // Button shows Failed.
  }
}
</script>

<template>
  <main class="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_55%)] px-4 py-8 text-slate-100 sm:py-12">
    <section class="mx-auto w-full max-w-md">
      <RouterLink to="/" class="mb-6 inline-flex">
        <FlotoryLogo inverted size="lg" />
      </RouterLink>

      <AppCard wrapper-class="w-full rounded-3xl border border-slate-200/20 bg-white/95 p-6 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:p-7">
        <AppBadge tone="blue">Account recovery</AppBadge>
        <h1 class="mt-4 text-4xl font-black tracking-tight text-slate-950">Forgot password?</h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-500">
          Enter your email and we will send a secure link to reset your password.
        </p>

        <form v-if="!message" class="mt-6 space-y-4" @submit.prevent="submit">
          <div>
            <label class="text-sm font-bold text-slate-600" for="email">Email</label>
            <input id="email" v-model="email" required type="email" autocomplete="email" :class="authFieldClass">
          </div>

          <p v-if="error" class="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>

          <AsyncActionButton
            class="w-full"
            block
            size="lg"
            type="submit"
            idle-label="Send reset link"
            loading-label="Sending…"
            success-label="Sent ✓"
            :loading="submitAction.loading"
            :success="submitAction.success"
            :error="submitAction.error"
          />
        </form>

        <div v-else class="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100">
          {{ message }}
        </div>

        <p class="mt-5 text-center text-sm text-slate-500">
          Remember your password?
          <RouterLink to="/login" class="font-bold text-slate-950">Back to login</RouterLink>
        </p>
      </AppCard>
    </section>
  </main>
</template>
