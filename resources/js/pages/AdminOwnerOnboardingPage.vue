<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError } from '@/lib/api'

interface OwnerInvitationRow {
  id: number
  email: string
  business_name: string | null
  expires_at: string
  accepted_at: string | null
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  pipeline_stage: 'invited' | 'registered' | 'venue_draft' | 'pending_review' | 'published' | 'revoked' | 'expired'
  venue: { id: number; name: string; slug: string; status: string } | null
  register_url: string | null
}

const loading = ref(true)
const sending = ref(false)
const error = ref('')
const success = ref('')
const search = ref('')
const email = ref('')
const businessName = ref('')
const invitations = ref<OwnerInvitationRow[]>([])
const copiedId = ref<number | null>(null)

const stageLabels: Record<OwnerInvitationRow['pipeline_stage'], string> = {
  invited: 'Invited',
  registered: 'Registered',
  venue_draft: 'Venue draft',
  pending_review: 'Pending review',
  published: 'Published',
  revoked: 'Revoked',
  expired: 'Expired',
}

const stageTone: Record<OwnerInvitationRow['pipeline_stage'], 'blue' | 'green' | 'amber' | 'slate'> = {
  invited: 'blue',
  registered: 'amber',
  venue_draft: 'amber',
  pending_review: 'blue',
  published: 'green',
  revoked: 'slate',
  expired: 'slate',
}

async function loadInvitations() {
  loading.value = true
  error.value = ''

  try {
    const params = search.value.trim() ? `?search=${encodeURIComponent(search.value.trim())}` : ''
    const response = await api<{ invitations: OwnerInvitationRow[] }>(`/admin/owner-invitations${params}`)
    invitations.value = response.invitations
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not load invitations.'
  } finally {
    loading.value = false
  }
}

async function sendInvitation() {
  sending.value = true
  error.value = ''
  success.value = ''

  try {
    const response = await api<{ invitation: OwnerInvitationRow }>('/admin/owner-invitations', {
      method: 'POST',
      body: {
        email: email.value,
        business_name: businessName.value || undefined,
      },
    })

    invitations.value = [response.invitation, ...invitations.value.filter((row) => row.id !== response.invitation.id)]
    success.value = `Invitation sent to ${response.invitation.email}.`
    email.value = ''
    businessName.value = ''
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not send invitation.'
  } finally {
    sending.value = false
  }
}

async function revokeInvitation(invitation: OwnerInvitationRow) {
  error.value = ''
  success.value = ''

  try {
    const response = await api<{ invitation: OwnerInvitationRow }>(
      `/admin/owner-invitations/${invitation.id}`,
      { method: 'DELETE' },
    )

    invitations.value = invitations.value.map((row) => (
      row.id === invitation.id ? response.invitation : row
    ))
    success.value = 'Invitation revoked.'
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not revoke invitation.'
  }
}

async function copyLink(invitation: OwnerInvitationRow) {
  if (!invitation.register_url) return
  await navigator.clipboard.writeText(invitation.register_url)
  copiedId.value = invitation.id
  window.setTimeout(() => { copiedId.value = null }, 2000)
}

onMounted(loadInvitations)
</script>

<template>
  <AppShell>
    <PageHeader
      title="Owner onboarding"
      badge="Sales pipeline"
      description="After a demo, invite the owner by email. They register, create their venue, upload files, and submit for approval."
    />

    <AppCard wrapper-class="mb-5">
      <h2 class="text-lg font-black text-ink">Send invitation</h2>
      <p class="mt-1 text-sm text-ink-muted">No venue needed yet — the owner creates it after registering.</p>

      <form class="mt-4 grid gap-4 md:grid-cols-2" @submit.prevent="sendInvitation">
        <div>
          <label class="text-sm font-bold text-ink-muted" for="pipeline-email">Owner email</label>
          <input
            id="pipeline-email"
            v-model="email"
            required
            type="email"
            class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft"
            placeholder="owner@cafe.com"
          >
        </div>
        <div>
          <label class="text-sm font-bold text-ink-muted" for="pipeline-business">Business name (optional)</label>
          <input
            id="pipeline-business"
            v-model="businessName"
            class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft"
            placeholder="Harbor Coffee"
          >
        </div>
        <div class="md:col-span-2 flex flex-wrap gap-2">
          <AppButton type="submit" :disabled="sending || !email.trim()">
            {{ sending ? 'Sending…' : 'Send invitation' }}
          </AppButton>
        </div>
      </form>

      <p v-if="success" class="mt-3 text-sm font-semibold text-accent-active">{{ success }}</p>
      <p v-if="error" class="mt-3 rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ error }}</p>
    </AppCard>

    <AppCard>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0 flex-1">
          <label class="text-sm font-bold text-ink-muted" for="pipeline-search">Search</label>
          <input
            id="pipeline-search"
            v-model="search"
            class="mt-2 h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft"
            placeholder="Email or business name"
            @keyup.enter="loadInvitations"
          >
        </div>
        <AppButton variant="secondary" @click="loadInvitations">Search</AppButton>
      </div>

      <div v-if="loading" class="mt-6 text-sm text-ink-muted">Loading pipeline…</div>
      <EmptyState v-else-if="!invitations.length" class="mt-6" title="No invitations yet" description="Send your first invite after a demo call." />

      <ul v-else class="mt-6 space-y-3">
        <li
          v-for="invitation in invitations"
          :key="invitation.id"
          class="rounded-2xl border border-border bg-surface-muted/60 p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-ink">{{ invitation.email }}</p>
              <p v-if="invitation.business_name" class="mt-1 text-sm text-ink-muted">{{ invitation.business_name }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <AppBadge :tone="stageTone[invitation.pipeline_stage]">
                  {{ stageLabels[invitation.pipeline_stage] }}
                </AppBadge>
                <span v-if="invitation.venue" class="text-xs font-semibold text-ink-soft">
                  {{ invitation.venue.name }} · {{ invitation.venue.status }}
                </span>
                <span v-else-if="invitation.pipeline_stage === 'registered'" class="text-xs font-semibold text-ink-soft">
                  Awaiting venue setup
                </span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <RouterLink v-if="invitation.venue" :to="`/admin/manage-venues/${invitation.venue.id}`">
                <AppButton size="sm" variant="secondary">View venue</AppButton>
              </RouterLink>
              <RouterLink v-else-if="invitation.pipeline_stage === 'pending_review'" to="/admin/venues">
                <AppButton size="sm" variant="secondary">Review listing</AppButton>
              </RouterLink>
              <AppButton
                v-if="invitation.register_url"
                size="sm"
                variant="secondary"
                type="button"
                @click="copyLink(invitation)"
              >
                {{ copiedId === invitation.id ? 'Copied' : 'Copy link' }}
              </AppButton>
              <AppButton
                v-if="invitation.status === 'pending'"
                size="sm"
                variant="secondary"
                type="button"
                @click="revokeInvitation(invitation)"
              >
                Revoke
              </AppButton>
            </div>
          </div>
        </li>
      </ul>
    </AppCard>
  </AppShell>
</template>
