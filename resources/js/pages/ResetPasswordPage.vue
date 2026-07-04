<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import { marketingCardClass } from '@/lib/marketingPage'
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
  <MarketingPageShell back-fallback="/login" back-label="Back to login">
      <AppCard :wrapper-class="marketingCardClass">
        <AppBadge tone="amber">Account recovery</AppBadge>
        <h1 class="mt-4 text-4xl font-black tracking-tight text-ink">Choose a new password</h1>
        <p class="mt-2 text-sm leading-relaxed text-ink-muted">
          Set a new password for <strong>{{ email || 'your account' }}</strong>.
        </p>

        <div v-if="!linkValid" class="mt-6 rounded-2xl bg-accent-soft p-4 text-sm font-semibold text-accent-active border border-accent-border">
          This reset link is invalid or expired.
          <RouterLink to="/forgot-password" class="mt-3 block font-bold text-accent-active underline">
            Request a new link
          </RouterLink>
        </div>

        <form v-else class="mt-6 space-y-4" @submit.prevent="submit">
          <div>
            <label class="text-sm font-bold text-ink-muted" for="password">New password</label>
            <input id="password" v-model="password" required minlength="8" type="password" autocomplete="new-password" :class="authFieldClass">
          </div>
          <div>
            <label class="text-sm font-bold text-ink-muted" for="password-confirm">Confirm password</label>
            <input id="password-confirm" v-model="passwordConfirmation" required minlength="8" type="password" autocomplete="new-password" :class="authFieldClass">
          </div>

          <p v-if="error" class="rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ error }}</p>

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

        <p class="mt-5 text-center text-sm text-ink-muted">
          <RouterLink to="/login" class="font-bold text-ink">Back to login</RouterLink>
        </p>
      </AppCard>
  </MarketingPageShell>
</template>
