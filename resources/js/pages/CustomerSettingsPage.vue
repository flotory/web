<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AppShell from '@/layouts/AppShell.vue'
import { authFieldClass } from '@/lib/authForm'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const router = useRouter()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordAction = useAsyncAction()
const error = ref('')

async function submitPassword() {
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'New passwords do not match.'
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
        error.value = exception instanceof ApiError ? exception.message : 'Could not update password.'
        throw exception
      }
    })
  } catch {
    // Button shows Failed.
  }
}

async function logout() {
  await auth.logout()
  workspace.$reset()
  await router.push('/login')
}
</script>

<template>
  <AppShell>
    <div class="mx-auto w-full max-w-md">
      <h1 class="text-2xl font-black tracking-tight text-slate-950">Settings</h1>
      <p class="mt-1 text-sm text-slate-500">Your account details and sign-in preferences.</p>

      <AppCard class="mt-6">
        <div v-if="auth.user" class="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p class="text-xs font-black uppercase tracking-wide text-slate-400">Account</p>
          <p class="mt-1 font-black text-slate-950">{{ auth.user.name }}</p>
          <p class="text-sm font-semibold text-slate-500">{{ auth.user.email }}</p>
        </div>

        <form class="mt-5 space-y-4" @submit.prevent="submitPassword">
          <p class="text-sm font-bold text-slate-700">Change password</p>
          <div>
            <label class="text-sm font-bold text-slate-600" for="current-password">Current password</label>
            <input
              id="current-password"
              v-model="currentPassword"
              required
              type="password"
              autocomplete="current-password"
              :class="authFieldClass"
            >
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="new-password">New password</label>
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
            <label class="text-sm font-bold text-slate-600" for="confirm-password">Confirm new password</label>
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

          <p v-if="error" class="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>

          <AsyncActionButton
            class="w-full"
            block
            type="submit"
            idle-label="Update password"
            loading-label="Saving…"
            success-label="Saved ✓"
            :loading="passwordAction.loading"
            :success="passwordAction.success"
            :error="passwordAction.error"
          />
        </form>

        <AppButton class="mt-5 w-full" variant="secondary" @click="logout">
          Log out
        </AppButton>
      </AppCard>
    </div>
  </AppShell>
</template>
