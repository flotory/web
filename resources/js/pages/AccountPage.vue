<script setup lang="ts">
import { Lock, Settings2, UserRound } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AppShell from '@/layouts/AppShell.vue'
import { currencyOptions } from '@/lib/currency'
import { localeOptions } from '@/i18n'
import FormSelect from '@/components/ui/FormSelect.vue'
import { authFieldClass, formFieldClass } from '@/lib/authForm'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useCurrencyStore } from '@/stores/currency'
import { useLocaleStore } from '@/stores/locale'
import type { User } from '@/types'

const auth = useAuthStore()
const localeStore = useLocaleStore()
const currencyStore = useCurrencyStore()
const router = useRouter()
const { t } = useI18n()

const name = ref('')
const birthday = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const profileAction = useAsyncAction()
const passwordAction = useAsyncAction()
const languageAction = useAsyncAction()
const currencyAction = useAsyncAction()

const error = ref('')
const profileMessage = ref('')
const languageMessage = ref('')
const currencyMessage = ref('')

watch(
  () => auth.user,
  (user) => {
    if (!user) {
      return
    }

    name.value = user.name
    birthday.value = user.birthday ?? ''
  },
  { immediate: true },
)

const initials = computed(() => {
  const parts = name.value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
})

const profileDirty = computed(() => {
  const user = auth.user
  if (!user) {
    return false
  }

  return name.value.trim() !== user.name || (birthday.value || '') !== (user.birthday ?? '')
})

async function saveProfile() {
  if (!auth.user || !profileDirty.value) {
    return
  }

  profileMessage.value = ''

  try {
    await profileAction.run(async () => {
      const response = await api<{ user: User }>('/auth/profile', {
        method: 'PUT',
        body: {
          name: name.value.trim(),
          birthday: birthday.value || null,
        },
      })

      auth.user = response.user
      profileMessage.value = t('account.profileSaved')
    })
  } catch (exception) {
    profileMessage.value = exception instanceof ApiError ? exception.message : t('account.profileError')
  }
}

async function submitPassword() {
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

async function updateCurrency(event: Event) {
  const select = event.target as HTMLSelectElement
  const nextCurrency = select.value
  const previousCurrency = currencyStore.currency

  currencyStore.setCurrency(nextCurrency)
  currencyMessage.value = ''

  try {
    await currencyAction.run(async () => {
      const response = await api<{ user: User }>('/auth/currency', {
        method: 'PUT',
        body: { currency: currencyStore.currency },
      })

      auth.user = response.user
      currencyMessage.value = t('account.currencySaved')
    })
  } catch {
    currencyStore.setCurrency(previousCurrency)
    currencyMessage.value = t('account.currencyError')
  }
}
</script>

<template>
  <AppShell>
    <div class="mx-auto max-w-2xl">
      <PageHeader
        :title="t('account.title')"
        :description="t('account.description')"
        :badge="t('account.badge')"
      />

      <AppCard v-if="auth.user" wrapper-class="mb-4 p-5 sm:p-6">
        <div class="flex items-start gap-4">
          <div class="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-lg font-black text-primary">
            {{ initials }}
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">{{ t('account.signedInAs') }}</p>
            <p class="mt-1 text-xl font-black text-ink">{{ auth.user.name }}</p>
            <p class="text-sm font-semibold text-ink-muted">{{ auth.user.email }}</p>
          </div>
        </div>
      </AppCard>

      <AppCard wrapper-class="mb-4 p-5 sm:p-6">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-xl bg-surface-muted text-ink-muted">
            <UserRound class="size-5" stroke-width="2.25" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-ink">{{ t('account.profileTitle') }}</h2>
            <p class="text-sm text-ink-muted">{{ t('account.profileDescription') }}</p>
          </div>
        </div>

        <form class="mt-5 space-y-4" @submit.prevent="saveProfile">
          <div>
            <label class="text-sm font-bold text-ink" for="account-name">{{ t('account.nameLabel') }}</label>
            <input
              id="account-name"
              v-model="name"
              required
              maxlength="120"
              autocomplete="name"
              :class="formFieldClass"
            >
          </div>

          <div>
            <label class="text-sm font-bold text-ink" for="account-email">{{ t('account.emailLabel') }}</label>
            <input
              id="account-email"
              :value="auth.user?.email ?? ''"
              type="email"
              readonly
              class="mt-2 h-12 w-full cursor-not-allowed rounded-2xl border border-border bg-surface-muted px-4 text-sm font-medium text-ink-muted"
            >
            <p class="mt-1.5 text-xs font-medium text-ink-soft">{{ t('account.emailHint') }}</p>
          </div>

          <div>
            <label class="text-sm font-bold text-ink" for="account-birthday">{{ t('account.birthdayLabel') }}</label>
            <input
              id="account-birthday"
              v-model="birthday"
              type="date"
              :max="new Date().toISOString().slice(0, 10)"
              :class="formFieldClass"
            >
            <p class="mt-1.5 text-xs font-medium text-ink-soft">{{ t('account.birthdayHint') }}</p>
          </div>

          <p v-if="profileMessage" class="text-sm font-semibold text-ink-muted">{{ profileMessage }}</p>

          <AsyncActionButton
            type="submit"
            :disabled="!profileDirty"
            :idle-label="t('account.saveProfile')"
            :loading-label="t('common.saving')"
            :success-label="t('common.saved')"
            :error-label="t('common.failed')"
            :loading="profileAction.loading"
            :success="profileAction.success"
            :error="profileAction.error"
          />
        </form>
      </AppCard>

      <AppCard wrapper-class="mb-4 p-5 sm:p-6">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-xl bg-surface-muted text-ink-muted">
            <Settings2 class="size-5" stroke-width="2.25" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-ink">{{ t('account.preferencesTitle') }}</h2>
            <p class="text-sm text-ink-muted">{{ t('account.preferencesDescription') }}</p>
          </div>
        </div>

        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label class="text-sm font-bold text-ink" for="account-locale">{{ t('account.languageTitle') }}</label>
            <p class="mt-1 text-xs font-medium text-ink-soft">{{ t('account.languageDescription') }}</p>
            <FormSelect
              id="account-locale"
              class="mt-2"
              :model-value="localeStore.locale"
              :disabled="languageAction.loading.value"
              @change="updateLanguage"
            >
              <option
                v-for="option in localeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.nativeLabel }}
              </option>
            </FormSelect>
            <p v-if="languageMessage" class="mt-2 text-sm font-semibold text-ink-muted">{{ languageMessage }}</p>
          </div>

          <div>
            <label class="text-sm font-bold text-ink" for="account-currency">{{ t('account.currencyTitle') }}</label>
            <p class="mt-1 text-xs font-medium text-ink-soft">{{ t('account.currencyDescription') }}</p>
            <FormSelect
              id="account-currency"
              class="mt-2"
              :model-value="currencyStore.currency"
              :disabled="currencyAction.loading.value"
              @change="updateCurrency"
            >
              <option
                v-for="option in currencyOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.nativeLabel }}
              </option>
            </FormSelect>
            <p v-if="currencyMessage" class="mt-2 text-sm font-semibold text-ink-muted">{{ currencyMessage }}</p>
          </div>
        </div>
      </AppCard>

      <AppCard wrapper-class="mb-4 p-5 sm:p-6">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-xl bg-surface-muted text-ink-muted">
            <Lock class="size-5" stroke-width="2.25" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-ink">{{ t('account.securityTitle') }}</h2>
            <p class="text-sm text-ink-muted">{{ t('account.securityDescription') }}</p>
          </div>
        </div>

        <form class="mt-5 space-y-4" @submit.prevent="submitPassword">
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
          <div class="grid gap-4 sm:grid-cols-2">
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
          </div>

          <p v-if="error" class="rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ error }}</p>

          <AsyncActionButton
            :idle-label="t('account.updatePassword')"
            :loading-label="t('common.saving')"
            :success-label="t('common.saved')"
            :error-label="t('common.failed')"
            :loading="passwordAction.loading"
            :success="passwordAction.success"
            :error="passwordAction.error"
          />
        </form>
      </AppCard>

      <AppButton class="w-full sm:w-auto" variant="secondary" type="button" @click="goBack">
        {{ t('account.backToDashboard') }}
      </AppButton>
    </div>
  </AppShell>
</template>
