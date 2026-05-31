<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { api, ApiError } from '@/lib/api'
import { authFieldClass } from '@/lib/authForm'

const route = useRoute()
const router = useRouter()

const email = ref('')
const token = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const error = ref('')
const resetAction = useAsyncAction()

const linkValid = computed(() => Boolean(token.value && email.value))

onMounted(() => {
  if (typeof route.query.email === 'string') {
    email.value = route.query.email
  }

  if (typeof route.query.token === 'string') {
    token.value = route.query.token
  }
})

async function submit() {
  if (!linkValid.value) {
    error.value = 'This reset link is incomplete. Request a new one from the forgot password page.'
    return
  }

  try {
    await resetAction.run(async () => {
      error.value = ''

      try {
        await api<{ message: string }>('/auth/reset-password', {
          method: 'POST',
          includeAuth: false,
          body: {
            email: email.value,
            token: token.value,
            password: password.value,
            password_confirmation: passwordConfirmation.value,
          },
        })

        await router.push({ name: 'login', query: { email: email.value } })
      } catch (exception) {
        error.value = exception instanceof ApiError ? exception.message : 'Could not reset password.'
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
        <h1 class="mt-4 text-4xl font-black tracking-tight text-slate-950">Choose a new password</h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-500">
          Set a new password for <strong>{{ email || 'your account' }}</strong>.
        </p>

        <div v-if="!linkValid" class="mt-6 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-950 ring-1 ring-amber-200">
          This reset link is invalid or expired.
          <RouterLink to="/forgot-password" class="mt-3 block font-bold text-amber-950 underline">
            Request a new link
          </RouterLink>
        </div>

        <form v-else class="mt-6 space-y-4" @submit.prevent="submit">
          <div>
            <label class="text-sm font-bold text-slate-600" for="password">New password</label>
            <input id="password" v-model="password" required minlength="8" type="password" autocomplete="new-password" :class="authFieldClass">
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="password-confirm">Confirm password</label>
            <input id="password-confirm" v-model="passwordConfirmation" required minlength="8" type="password" autocomplete="new-password" :class="authFieldClass">
          </div>

          <p v-if="error" class="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>

          <AsyncActionButton
            class="w-full"
            block
            size="lg"
            type="submit"
            idle-label="Update password"
            loading-label="Saving…"
            success-label="Saved ✓"
            :loading="resetAction.loading"
            :success="resetAction.success"
            :error="resetAction.error"
          />
        </form>

        <p class="mt-5 text-center text-sm text-slate-500">
          <RouterLink to="/login" class="font-bold text-slate-950">Back to login</RouterLink>
        </p>
      </AppCard>
    </section>
  </main>
</template>
