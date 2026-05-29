<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { api, ApiError } from '@/lib/api'
import { authFieldClass } from '@/lib/authForm'
import { staffScannerPath } from '@/lib/venueRoles'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

type InvitePreview = {
  email: string
  role: string
  status: string
  expires_at: string
  venue: { id: number; name: string; slug: string }
  inviter: { name: string }
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const workspace = useWorkspaceStore()

const token = computed(() => String(route.params.token))
const loading = ref(true)
const acceptAction = useAsyncAction()
const registerAction = useAsyncAction()
const error = ref('')
const inviteValid = ref(true)
const invalidMessage = ref('')
const preview = ref<InvitePreview | null>(null)
const accountExists = ref(false)
const emailMatches = ref<boolean | null>(null)

const name = ref('')
const password = ref('')
const passwordConfirmation = ref('')

const loginRedirect = computed(() => `/invite/${token.value}`)

async function loadInvite() {
  loading.value = true
  error.value = ''

  try {
    const response = await api<{
      invitation?: InvitePreview
      valid: boolean
      account_exists?: boolean
      email_matches?: boolean | null
      message?: string
    }>(`/invites/${token.value}`, { includeAuth: false })

    preview.value = response.invitation ?? null
    inviteValid.value = response.valid
    accountExists.value = Boolean(response.account_exists)
    emailMatches.value = response.email_matches ?? null
    invalidMessage.value = response.message ?? ''
  } catch (exception) {
    inviteValid.value = false
    invalidMessage.value = exception instanceof ApiError ? exception.message : 'This invitation link is invalid.'
  } finally {
    loading.value = false
  }
}

async function finishJoin(venueId: number) {
  await workspace.bootstrap(true)
  await router.push(staffScannerPath(venueId))
}

async function acceptInvitation() {
  try {
    await acceptAction.run(async () => {
      error.value = ''

      try {
        const response = await api<{ venue_id: number }>(`/invites/${token.value}/accept`, {
          method: 'POST',
        })

        await finishJoin(response.venue_id)
      } catch (exception) {
        error.value = exception instanceof ApiError ? exception.message : 'Could not accept invitation.'
        throw exception
      }
    })
  } catch {
    // Button shows Failed.
  }
}

async function registerAndJoin() {
  try {
    await registerAction.run(async () => {
      error.value = ''

      try {
        const response = await api<{ token: string; user: { id: number; name: string; email: string }; venue_id: number }>(
          `/invites/${token.value}/register`,
          {
            method: 'POST',
            includeAuth: false,
            body: {
              name: name.value,
              password: password.value,
              password_confirmation: passwordConfirmation.value,
            },
          },
        )

        await auth.loginWithToken(response.token)
        await finishJoin(response.venue_id)
      } catch (exception) {
        error.value = exception instanceof ApiError ? exception.message : 'Could not create your account.'
        throw exception
      }
    })
  } catch {
    // Button shows Failed.
  }
}

onMounted(async () => {
  if (auth.token && !auth.booted) {
    await auth.fetchUser()
  }

  await loadInvite()
})

async function logoutForInvite() {
  const email = preview.value?.email
  await auth.logout()
  await router.push({ name: 'login', query: { email, redirect: loginRedirect.value } })
}
</script>

<template>
  <main class="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_55%)] px-4 py-8 text-slate-100 sm:py-12">
    <section class="mx-auto w-full max-w-md">
      <RouterLink to="/" class="mb-6 inline-flex">
        <FlotoryLogo inverted size="lg" />
      </RouterLink>

      <AppCard wrapper-class="w-full rounded-3xl border border-slate-200/20 bg-white/95 p-6 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:p-7">
        <p v-if="loading" class="text-sm font-bold text-slate-500">Loading invitation...</p>

        <template v-else-if="!inviteValid">
          <AppBadge tone="slate">Invitation</AppBadge>
          <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950">Link unavailable</h1>
          <p class="mt-2 text-sm font-semibold text-slate-500">{{ invalidMessage }}</p>
          <p v-if="preview?.venue?.name" class="mt-4 text-sm font-semibold text-slate-600">
            Venue: <strong>{{ preview.venue.name }}</strong>
          </p>
          <RouterLink to="/login" class="mt-6 inline-block">
            <AppButton variant="secondary">Go to login</AppButton>
          </RouterLink>
        </template>

        <template v-else-if="preview">
          <AppBadge tone="blue">Team invitation</AppBadge>
          <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950">
            Join {{ preview.venue.name }}
          </h1>
          <p class="mt-2 text-sm font-semibold text-slate-500">
            <strong>{{ preview.inviter.name }}</strong> invited you to join as staff on Flotory.
          </p>

          <ul class="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
            <li>Open the scanner</li>
            <li>Add customer stamps</li>
            <li>Help customers redeem rewards</li>
          </ul>

          <p v-if="error" class="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>

          <div v-if="accountExists && !auth.isAuthenticated" class="mt-6 space-y-3">
            <p class="text-sm font-semibold text-slate-600">
              An account already exists for <strong>{{ preview.email }}</strong>. Sign in to accept.
            </p>
            <RouterLink :to="{ name: 'login', query: { email: preview.email, redirect: loginRedirect } }">
              <AppButton class="w-full" size="lg">Sign in to accept</AppButton>
            </RouterLink>
          </div>

          <div v-else-if="auth.isAuthenticated && emailMatches === false" class="mt-6 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-950 ring-1 ring-amber-200">
            You are signed in as a different user. Log out, then sign in with <strong>{{ preview.email }}</strong>.
            <AppButton class="mt-4 w-full" variant="secondary" size="sm" @click="logoutForInvite">
              Log out
            </AppButton>
          </div>

          <div v-else-if="auth.isAuthenticated && emailMatches" class="mt-6">
            <AsyncActionButton
              class="w-full"
              block
              size="lg"
              idle-label="Accept invitation"
              loading-label="Joining…"
              success-label="Joined ✓"
              :loading="acceptAction.loading"
              :success="acceptAction.success"
              :error="acceptAction.error"
              @click="acceptInvitation"
            />
          </div>

          <form v-else class="mt-6 grid gap-3" @submit.prevent="registerAndJoin">
            <div>
              <label class="text-sm font-bold text-slate-600" for="invite-name">Your name</label>
              <input id="invite-name" v-model="name" required class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-950 outline-none focus:border-slate-400 focus:bg-white" placeholder="Alex Rivera">
            </div>
            <div>
              <label class="text-sm font-bold text-slate-600" for="invite-email">Email</label>
              <input id="invite-email" :value="preview.email" readonly class="mt-2 h-12 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-600">
            </div>
            <div>
              <label class="text-sm font-bold text-slate-600" for="invite-password">Password</label>
              <input id="invite-password" v-model="password" required type="password" autocomplete="new-password" :class="authFieldClass">
            </div>
            <div>
              <label class="text-sm font-bold text-slate-600" for="invite-password-confirm">Confirm password</label>
              <input id="invite-password-confirm" v-model="passwordConfirmation" required type="password" autocomplete="new-password" :class="authFieldClass">
            </div>
            <AsyncActionButton
              class="w-full"
              block
              size="lg"
              type="submit"
              idle-label="Create account and join"
              loading-label="Creating…"
              success-label="Created ✓"
              :loading="registerAction.loading"
              :success="registerAction.success"
              :error="registerAction.error"
            />
          </form>
        </template>
      </AppCard>
    </section>
  </main>
</template>
