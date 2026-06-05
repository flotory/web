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
      <h1 class="mt-3 text-4xl font-black tracking-tight text-ink">Change password</h1>
      <p class="mt-2 text-sm font-semibold text-ink-muted">
        {{ isStaff ? 'Set a personal password you will remember. You must be logged in to change it.' : 'Update your login password.' }}
      </p>

      <AppCard class="mt-6">
        <div v-if="auth.user" class="mb-5 rounded-2xl bg-surface-muted p-4 ring-1 ring-border">
          <p class="text-xs font-black uppercase tracking-wide text-ink-soft">Signed in as</p>
          <p class="mt-1 font-black text-ink">{{ auth.user.name }}</p>
          <p class="text-sm font-semibold text-ink-muted">{{ auth.user.email }}</p>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <label class="text-sm font-bold text-ink-muted" for="current-password">Current password</label>
            <input
              id="current-password"
              v-model="currentPassword"
              required
              type="password"
              autocomplete="current-password"
              :class="authFieldClass"
              placeholder="Your password right now"
            >
            <p v-if="isStaff" class="mt-2 text-xs font-semibold text-ink-muted">
              Enter the password you use to sign in — the one you chose when you created your account or accepted your staff invitation.
            </p>
          </div>
          <div>
            <label class="text-sm font-bold text-ink-muted" for="new-password">New password</label>
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
            <label class="text-sm font-bold text-ink-muted" for="confirm-password">Confirm new password</label>
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

        <p v-if="isStaff" class="mt-5 rounded-2xl bg-surface-muted p-3 text-xs font-semibold leading-relaxed text-ink-muted ring-1 ring-border">
          Forgot your password?
          <RouterLink to="/forgot-password" class="font-bold text-ink underline">
            Request a reset link by email
          </RouterLink>
        </p>
      </AppCard>
    </div>
  </AppShell>
</template>
