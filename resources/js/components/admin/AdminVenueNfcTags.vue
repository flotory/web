<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { api, ApiError } from '@/lib/api'
import { buildNfcTapUrl } from '@/lib/mobileApp'

interface NfcTagRow {
  id: number
  venue_id: number
  token: string
  label?: string | null
  active: boolean
  tap_url: string
  stamp_events_count?: number | null
  created_at?: string | null
}

const props = defineProps<{
  venueId: number
}>()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const tags = ref<NfcTagRow[]>([])
const label = ref('')

const activeCount = computed(() => tags.value.filter((tag) => tag.active).length)

async function loadTags() {
  loading.value = true
  error.value = ''

  try {
    const response = await api<{ tags: NfcTagRow[] }>(`/admin/manage-venues/${props.venueId}/nfc-tags`)
    tags.value = response.tags
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not load NFC tags.'
  } finally {
    loading.value = false
  }
}

async function createTag() {
  saving.value = true
  error.value = ''

  try {
    const response = await api<{ tag: NfcTagRow }>(`/admin/manage-venues/${props.venueId}/nfc-tags`, {
      method: 'POST',
      body: { label: label.value.trim() || null },
    })
    tags.value = [response.tag, ...tags.value]
    label.value = ''
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not create NFC tag.'
  } finally {
    saving.value = false
  }
}

async function updateTag(tag: NfcTagRow, patch: Partial<Pick<NfcTagRow, 'active' | 'label'>> & { regenerate_token?: boolean }) {
  saving.value = true
  error.value = ''

  try {
    const response = await api<{ tag: NfcTagRow }>(`/admin/nfc-tags/${tag.id}`, {
      method: 'PATCH',
      body: patch,
    })
    tags.value = tags.value.map((row) => (row.id === tag.id ? response.tag : row))
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not update NFC tag.'
  } finally {
    saving.value = false
  }
}

async function copyTapUrl(tag: NfcTagRow) {
  const url = tag.tap_url || buildNfcTapUrl(tag.token)
  await navigator.clipboard.writeText(url)
}

onMounted(() => {
  void loadTags()
})
</script>

<template>
  <AppCard wrapper-class="mt-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-xl font-black text-ink">NFC stamp stands</h2>
        <p class="mt-2 max-w-2xl text-sm text-ink-muted">
          Create a tag for each physical stand. Program the tap URL on the NFC chip, then ship the stand to the venue.
          Each tap adds one stamp in the mobile app.
        </p>
      </div>
      <p class="text-sm font-semibold text-ink-muted">{{ activeCount }} active</p>
    </div>

    <form class="mt-6 flex flex-col gap-3 sm:flex-row" @submit.prevent="createTag">
      <input
        v-model="label"
        type="text"
        maxlength="120"
        placeholder="Label (optional) — e.g. Counter stand #1"
        class="h-12 flex-1 rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft"
      >
      <AppButton type="submit" :disabled="saving">Create tag</AppButton>
    </form>

    <p v-if="error" class="mt-4 rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ error }}</p>

    <div v-if="loading" class="mt-6">
      <EmptyState compact title="Loading NFC tags…" />
    </div>

    <EmptyState
      v-else-if="!tags.length"
      class="mt-6"
      title="No NFC tags yet"
      description="Create a tag to get the URL for programming a stand."
    />

    <ul v-else class="mt-6 space-y-4">
      <li
        v-for="tag in tags"
        :key="tag.id"
        class="rounded-[22px] border border-border bg-surface-muted/40 p-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="font-extrabold text-ink">{{ tag.label || `Stand #${tag.id}` }}</p>
            <p class="mt-1 break-all text-xs font-semibold text-ink-muted">{{ tag.tap_url || buildNfcTapUrl(tag.token) }}</p>
            <p class="mt-2 text-xs font-semibold text-ink-soft">
              {{ tag.active ? 'Active' : 'Inactive' }} · {{ tag.stamp_events_count ?? 0 }} taps logged
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <AppButton variant="secondary" size="sm" @click="copyTapUrl(tag)">Copy URL</AppButton>
            <AppButton
              variant="secondary"
              size="sm"
              :disabled="saving"
              @click="updateTag(tag, { active: !tag.active })"
            >
              {{ tag.active ? 'Deactivate' : 'Activate' }}
            </AppButton>
            <AppButton
              variant="secondary"
              size="sm"
              :disabled="saving"
              @click="updateTag(tag, { regenerate_token: true })"
            >
              New token
            </AppButton>
          </div>
        </div>
      </li>
    </ul>
  </AppCard>
</template>
