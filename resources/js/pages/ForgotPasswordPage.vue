<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import { marketingCardClass } from '@/lib/marketingPage'
import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import FormLabel from '@/components/ui/FormLabel.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { api, ApiError } from '@/lib/api'

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
  <MarketingPageShell back-fallback="/login" back-label="Back to login">
      <AppCard :wrapper-class="marketingCardClass">
        <AppBadge tone="amber">Account recovery</AppBadge>
        <h1 class="mt-4 text-4xl font-black tracking-tight text-ink">Forgot password?</h1>
        <p class="mt-2 text-sm leading-relaxed text-ink-muted">
          Enter your email and we will send a secure link to reset your password.
        </p>

        <form v-if="!message" class="mt-6 space-y-4" @submit.prevent="submit">
          <div>
            <FormLabel for-id="email">Email</FormLabel>
            <AppInput id="email" v-model="email" required type="email" autocomplete="email" />
          </div>

          <AppAlert v-if="error">{{ error }}</AppAlert>

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

        <AppAlert v-else variant="success" class="mt-6 border border-success-border">
          {{ message }}
        </AppAlert>

        <p class="mt-5 text-center text-sm text-ink-muted">
          Remember your password?
          <RouterLink to="/login" class="font-bold text-ink">Back to login</RouterLink>
        </p>
      </AppCard>
  </MarketingPageShell>
</template>
