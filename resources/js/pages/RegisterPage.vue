<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'

import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import { marketingCardClass } from '@/lib/marketingPage'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import FormLabel from '@/components/ui/FormLabel.vue'
import { ApiError, api } from '@/lib/api'
import { OWNER_VENUE_SETUP_PATH } from '@/lib/venueRoles'
import { completeSignInNavigation, isLoginCancelledError } from '@/lib/signInNavigation'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

interface InvitePreview {
  valid: boolean
  reason?: string
  email?: string
  business_name?: string | null
  expires_at?: string
  venue?: {
    id: number
    name: string
    slug: string
  } | null
}

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const route = useRoute()
const router = useRouter()

const inviteToken = computed(() => (typeof route.query.invite === 'string' ? route.query.invite : ''))
const preview = ref<InvitePreview | null>(null)
const previewLoading = ref(true)

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const error = ref('')

const inviteValid = computed(() => preview.value?.valid === true)
const isNewVenueOnboarding = computed(() => inviteValid.value && !preview.value?.venue)
const venueName = computed(() => preview.value?.venue?.name ?? preview.value?.business_name ?? 'your venue')

const invalidMessage = computed(() => {
  switch (preview.value?.reason) {
    case 'accepted':
      return 'This invitation was already used. Log in to your dashboard instead.'
    case 'revoked':
      return 'This invitation was revoked. Contact Flotory for a new link.'
    case 'expired':
      return 'This invitation has expired. Contact Flotory for a new link.'
    default:
      return 'This invitation link is invalid. Contact Flotory if you need help.'
  }
})

async function loadPreview() {
  previewLoading.value = true
  preview.value = null

  try {
    preview.value = await api<InvitePreview>(`/public/owner-invitations/${encodeURIComponent(inviteToken.value)}`)
    if (preview.value.valid && preview.value.email) {
      email.value = preview.value.email
    }
  } catch (exception) {
    if (exception instanceof ApiError && exception.status === 404) {
      preview.value = { valid: false, reason: 'not_found' }
    } else {
      error.value = exception instanceof ApiError ? exception.message : 'Could not verify this invitation.'
    }
  } finally {
    previewLoading.value = false
  }
}

async function submit() {
  if (!inviteValid.value) {
    return
  }

  loading.value = true
  error.value = ''

  const sessionEpoch = auth.sessionEpoch

  try {
    const response = await api<{ token: string }>(`/public/owner-invitations/${encodeURIComponent(inviteToken.value)}/accept`, {
      method: 'POST',
      body: {
        name: name.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value,
      },
    })

    if (sessionEpoch !== auth.sessionEpoch) {
      return
    }

    await auth.loginWithToken(response.token)

    if (isNewVenueOnboarding.value) {
      if (!auth.isSessionCurrent(sessionEpoch)) {
        return
      }

      await router.replace(OWNER_VENUE_SETUP_PATH)
      return
    }

    await completeSignInNavigation({
      auth,
      workspace,
      router,
      sessionEpoch,
      redirect: '/dashboard',
    })
  } catch (exception) {
    if (isLoginCancelledError(exception)) {
      return
    }

    error.value = exception instanceof ApiError ? exception.message : 'Unable to complete registration.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadPreview()
})
</script>

<template>
  <MarketingPageShell width="md-wide">
    <AppCard :wrapper-class="marketingCardClass">
      <AppBadge tone="amber">Owner invitation</AppBadge>
      <h1 class="mt-4 text-4xl font-black tracking-tight text-ink">
        {{ isNewVenueOnboarding ? 'Create your account' : 'Set up your dashboard' }}
      </h1>

      <p v-if="previewLoading" class="mt-2 text-sm text-ink-muted">Verifying your invitation…</p>

      <template v-else-if="inviteValid">
        <p class="mt-2 text-sm leading-relaxed text-ink-muted">
          <template v-if="isNewVenueOnboarding">
            You've been invited to launch <span class="font-semibold text-ink">{{ venueName }}</span> on Flotory.
            Create your password, then set up your venue and upload branding for review.
          </template>
          <template v-else>
            You've been invited to manage <span class="font-semibold text-ink">{{ venueName }}</span>.
            Create a password to open your owner dashboard.
          </template>
        </p>

        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <div>
            <FormLabel for-id="name">Your name</FormLabel>
            <AppInput id="name" v-model="name" required />
          </div>
          <div>
            <FormLabel for-id="email">Email</FormLabel>
            <AppInput id="email" v-model="email" required type="email" readonly />
          </div>
          <div>
            <FormLabel for-id="password">Password</FormLabel>
            <AppInput id="password" v-model="password" required minlength="8" type="password" autocomplete="new-password" />
          </div>
          <div>
            <FormLabel for-id="password-confirm">Confirm password</FormLabel>
            <AppInput id="password-confirm" v-model="passwordConfirmation" required minlength="8" type="password" autocomplete="new-password" />
          </div>
          <AppAlert v-if="error">{{ error }}</AppAlert>
          <AppButton class="w-full" size="lg" type="submit" :disabled="loading">
            {{ loading ? 'Creating account…' : (isNewVenueOnboarding ? 'Continue to venue setup' : 'Open dashboard') }}
          </AppButton>
        </form>
      </template>

      <template v-else>
        <p class="mt-2 text-sm leading-relaxed text-ink-muted">{{ invalidMessage }}</p>
        <div class="mt-6 flex flex-wrap gap-2">
          <RouterLink to="/login?intent=owner">
            <AppButton variant="secondary">Log in</AppButton>
          </RouterLink>
          <RouterLink to="/book-demo">
            <AppButton>Book A Demo</AppButton>
          </RouterLink>
        </div>
      </template>
    </AppCard>
  </MarketingPageShell>
</template>
