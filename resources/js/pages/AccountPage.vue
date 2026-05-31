<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AppShell from '@/layouts/AppShell.vue'
import { authFieldClass } from '@/lib/authForm'
import { staffScannerPath } from '@/lib/venueRoles'
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

const isStaff = computed(() => workspace.usesStaffNav)

async function submit() {
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

function goBack() {
  if (isStaff.value) {
    void router.push(staffScannerPath(workspace.effectiveVenueId))
    return
  }

  void router.push('/dashboard')
}
</script>

<template>
  <AppShell>
    <div class="mx-auto max-w-lg">
      <AppBadge :tone="isStaff ? 'green' : 'blue'">{{ isStaff ? 'Staff account' : 'Your account' }}</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Change password</h1>
      <p class="mt-2 text-sm font-semibold text-slate-500">
        {{ isStaff ? 'Set a personal password you will remember. You must be logged in to change it.' : 'Update your login password.' }}
      </p>

      <AppCard class="mt-6">
        <div v-if="auth.user" class="mb-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p class="text-xs font-black uppercase tracking-wide text-slate-400">Signed in as</p>
          <p class="mt-1 font-black text-slate-950">{{ auth.user.name }}</p>
          <p class="text-sm font-semibold text-slate-500">{{ auth.user.email }}</p>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <label class="text-sm font-bold text-slate-600" for="current-password">Current password</label>
            <input
              id="current-password"
              v-model="currentPassword"
              required
              type="password"
              autocomplete="current-password"
              :class="authFieldClass"
              placeholder="Your password right now"
            >
            <p v-if="isStaff" class="mt-2 text-xs font-semibold text-slate-500">
              First time here? Use the one-time password from your manager. Already changed it before? Use the password you chose last time.
            </p>
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
            size="lg"
            type="submit"
            idle-label="Update password"
            loading-label="Saving…"
            success-label="Saved ✓"
            :loading="passwordAction.loading"
            :success="passwordAction.success"
            :error="passwordAction.error"
          />
          <AppButton class="w-full" variant="secondary" type="button" @click="goBack">
            {{ isStaff ? 'Back to scanner' : 'Back to dashboard' }}
          </AppButton>
        </form>

        <p v-if="isStaff" class="mt-5 rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-relaxed text-slate-600 ring-1 ring-slate-200">
          Forgot your password?
          <RouterLink to="/forgot-password" class="font-bold text-slate-950 underline">
            Request a reset link by email
          </RouterLink>
        </p>
      </AppCard>
    </div>
  </AppShell>
</template>
