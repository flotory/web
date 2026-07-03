<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import MarketingPageHeader from '@/components/layout/MarketingPageHeader.vue'
import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import { marketingCardClass } from '@/lib/marketingPage'
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
  <MarketingPageShell>
      <MarketingPageHeader back-fallback="/login" back-label="Back to login" />

      <AppCard :wrapper-class="marketingCardClass">
        <AppBadge tone="amber">Account recovery</AppBadge>
        <h1 class="mt-4 text-4xl font-black tracking-tight text-ink">Forgot password?</h1>
        <p class="mt-2 text-sm leading-relaxed text-ink-muted">
          Enter your email and we will send a secure link to reset your password.
        </p>

        <form v-if="!message" class="mt-6 space-y-4" @submit.prevent="submit">
          <div>
            <label class="text-sm font-bold text-ink-muted" for="email">Email</label>
            <input id="email" v-model="email" required type="email" autocomplete="email" :class="authFieldClass">
          </div>

          <p v-if="error" class="rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ error }}</p>

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

        <div v-else class="mt-6 rounded-2xl bg-success-bg p-4 text-sm font-semibold text-success-text border border-success-border">
          {{ message }}
        </div>

        <p class="mt-5 text-center text-sm text-ink-muted">
          Remember your password?
          <RouterLink to="/login" class="font-bold text-ink">Back to login</RouterLink>
        </p>
      </AppCard>
  </MarketingPageShell>
</template>
