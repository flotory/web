<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AppShell from '@/layouts/AppShell.vue'
import { localeOptions } from '@/i18n'
import { authFieldClass } from '@/lib/authForm'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useLocaleStore } from '@/stores/locale'
import type { User } from '@/types'

const auth = useAuthStore()
const localeStore = useLocaleStore()
const router = useRouter()
const { t } = useI18n()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordAction = useAsyncAction()
const languageAction = useAsyncAction()
const error = ref('')
const languageMessage = ref('')

async function submit() {
  if (newPassword.value !== confirmPassword.value) {
    error.value = t('account.passwordMismatch')
    return
  }

  try {
    await passwordAction.run(async () => {
      error.value = ''

      try {
        await api<{ message: string }>('/auth/password', {
          method: 'PUT',
          body: {
            current_password: currentPassword.value,
            password: newPassword.value,
            password_confirmation: confirmPassword.value,
          },
        })

        currentPassword.value = ''
        newPassword.value = ''
        confirmPassword.value = ''
      } catch (exception) {
        error.value = exception instanceof ApiError ? exception.message : t('account.passwordError')
        throw exception
      }
    })
  } catch {
    // Button shows Failed.
  }
}

function goBack() {
  void router.push('/dashboard')
}

async function updateLanguage(event: Event) {
  const select = event.target as HTMLSelectElement
  const nextLocale = select.value
  const previousLocale = localeStore.locale

  localeStore.setLocale(nextLocale)
  languageMessage.value = ''

  try {
    await languageAction.run(async () => {
      const response = await api<{ user: User }>('/auth/locale', {
        method: 'PUT',
        body: { locale: localeStore.locale },
      })

      auth.user = response.user
      languageMessage.value = t('account.languageSaved')
    })
  } catch {
    localeStore.setLocale(previousLocale)
    languageMessage.value = t('account.languageError')
  }
}
</script>

<template>
  <AppShell>
    <div class="mx-auto max-w-lg">
      <AppBadge tone="blue">{{ t('account.badge') }}</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-ink">{{ t('account.title') }}</h1>
      <p class="mt-2 text-sm font-semibold text-ink-muted">
        {{ t('account.description') }}
      </p>

      <AppCard class="mt-6">
        <div v-if="auth.user" class="mb-5 rounded-2xl bg-surface-muted p-4 border border-border">
          <p class="text-xs font-black uppercase tracking-wide text-ink-soft">{{ t('account.signedInAs') }}</p>
          <p class="mt-1 font-black text-ink">{{ auth.user.name }}</p>
          <p class="text-sm font-semibold text-ink-muted">{{ auth.user.email }}</p>
        </div>

        <div class="mb-5 rounded-2xl border border-border bg-surface p-4">
          <label class="text-sm font-black text-ink" for="account-locale">{{ t('account.languageTitle') }}</label>
          <p class="mt-1 text-sm font-semibold text-ink-muted">{{ t('account.languageDescription') }}</p>
          <select
            id="account-locale"
            :value="localeStore.locale"
            :disabled="languageAction.loading.value"
            :class="[authFieldClass, 'mt-3']"
            @change="updateLanguage"
          >
            <option
              v-for="option in localeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.nativeLabel }}
            </option>
          </select>
          <p v-if="languageMessage" class="mt-2 text-sm font-semibold text-ink-muted">{{ languageMessage }}</p>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <label class="text-sm font-bold text-ink-muted" for="current-password">{{ t('account.currentPassword') }}</label>
            <input
              id="current-password"
              v-model="currentPassword"
              required
              type="password"
              autocomplete="current-password"
              :class="authFieldClass"
              :placeholder="t('account.currentPasswordPlaceholder')"
            >
          </div>
          <div>
            <label class="text-sm font-bold text-ink-muted" for="new-password">{{ t('account.newPassword') }}</label>
            <input
              id="new-password"
              v-model="newPassword"
              required
              minlength="8"
              type="password"
              autocomplete="new-password"
              :class="authFieldClass"
            >
          </div>
          <div>
            <label class="text-sm font-bold text-ink-muted" for="confirm-password">{{ t('account.confirmPassword') }}</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              required
              minlength="8"
              type="password"
              autocomplete="new-password"
              :class="authFieldClass"
            >
          </div>

          <p v-if="error" class="rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ error }}</p>

          <AsyncActionButton
            class="w-full"
            block
            size="lg"
            type="submit"
            :idle-label="t('account.updatePassword')"
            :loading-label="t('common.saving')"
            :success-label="t('common.saved')"
            :error-label="t('common.failed')"
            :loading="passwordAction.loading"
            :success="passwordAction.success"
            :error="passwordAction.error"
          />
          <AppButton class="w-full" variant="secondary" type="button" @click="goBack">
            {{ t('account.backToDashboard') }}
          </AppButton>
        </form>
      </AppCard>
    </div>
  </AppShell>
</template>
