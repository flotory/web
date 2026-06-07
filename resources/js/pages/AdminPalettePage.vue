<script setup lang="ts">
import { Palette, RotateCcw, Save } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { applyPaletteToDocument, type FlotoryPalette } from '@/lib/applyPalette'
import { paletteGroupLabels, paletteGroupOrder } from '@/lib/paletteGroups'
import { toast } from '@/lib/toast'

interface PaletteToken {
  key: string
  label: string
  description: string
  group: string
}

interface PaletteResponse {
  defaults: FlotoryPalette
  current: FlotoryPalette
  overrides: FlotoryPalette
  tokens: PaletteToken[]
}

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const defaults = ref<FlotoryPalette>({})
const saved = ref<FlotoryPalette>({})
const draft = ref<FlotoryPalette>({})
const tokens = ref<PaletteToken[]>([])
const previewWholeApp = ref(false)
const previewRoot = ref<HTMLElement | null>(null)

const groupedTokens = computed(() => {
  return paletteGroupOrder
    .map((group) => ({
      group,
      label: paletteGroupLabels[group] ?? group,
      items: tokens.value.filter((token) => token.group === group),
    }))
    .filter((section) => section.items.length > 0)
})

const changedKeys = computed(() => {
  return Object.keys(draft.value).filter((key) => draft.value[key] !== defaults.value[key])
})

const isDirty = computed(() => {
  return Object.keys(draft.value).some((key) => draft.value[key] !== saved.value[key])
})

function previewTarget(): HTMLElement {
  if (previewWholeApp.value) {
    return document.documentElement
  }

  return previewRoot.value ?? document.documentElement
}

function applyDraft() {
  applyPaletteToDocument(draft.value, previewTarget())
}

function restoreSavedPalette() {
  applyPaletteToDocument(saved.value)
}

async function loadPalette() {
  loading.value = true
  error.value = ''

  try {
    const response = await api<PaletteResponse>('/admin/palette')
    defaults.value = response.defaults
    saved.value = response.current
    draft.value = { ...response.current }
    tokens.value = response.tokens
    await nextTick()
    applyDraft()
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load palette.')
  } finally {
    loading.value = false
  }
}

function updateToken(key: string, value: string) {
  const normalized = value.trim().toUpperCase()
  if (!/^#[0-9A-F]{6}$/.test(normalized)) {
    return
  }

  draft.value = {
    ...draft.value,
    [key]: normalized,
  }
  applyDraft()
}

function resetDraftToDefaults() {
  draft.value = { ...defaults.value }
  applyDraft()
}

async function savePalette() {
  saving.value = true

  try {
    const response = await api<PaletteResponse>('/admin/palette', {
      method: 'PATCH',
      body: { palette: draft.value },
    })
    defaults.value = response.defaults
    saved.value = response.current
    draft.value = { ...response.current }
    applyPaletteToDocument(response.current)
    toast.success('Palette saved.')
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not save palette.'))
  } finally {
    saving.value = false
  }
}

async function resetPalette() {
  saving.value = true

  try {
    const response = await api<PaletteResponse>('/admin/palette/reset', { method: 'POST' })
    defaults.value = response.defaults
    saved.value = response.current
    draft.value = { ...response.current }
    applyPaletteToDocument(response.current)
    toast.success('Palette reset to defaults.')
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not reset palette.'))
  } finally {
    saving.value = false
  }
}

watch(previewWholeApp, () => {
  applyDraft()
})

onMounted(loadPalette)

onBeforeUnmount(() => {
  restoreSavedPalette()
})
</script>

<template>
  <AppShell>
    <PageHeader
      title="Design palette"
      badge="Platform design"
      compact
      description="Central place for Flotory colors used across web and mobile. Tweak values, preview, then save when ready."
    >
      <template #actions>
        <AppButton variant="secondary" :disabled="saving" @click="resetDraftToDefaults">
          <RotateCcw class="size-4" />
          Revert draft
        </AppButton>
        <AppButton variant="secondary" :disabled="saving" @click="resetPalette">
          Reset saved
        </AppButton>
        <AppButton :disabled="saving || !isDirty" @click="savePalette">
          <Save class="size-4" />
          {{ saving ? 'Saving…' : 'Save palette' }}
        </AppButton>
      </template>
    </PageHeader>

    <AppCard v-if="loading" wrapper-class="mb-6">
      <EmptyState compact title="Loading palette…" />
    </AppCard>

    <ErrorState
      v-else-if="error"
      class="mb-6"
      :message="error"
      @retry="loadPalette"
    />

    <template v-else>
      <AppCard wrapper-class="mb-6 p-4">
        <label class="flex items-center gap-3 text-sm font-semibold text-ink-muted">
          <input
            v-model="previewWholeApp"
            type="checkbox"
            class="size-4 rounded border-border"
          >
          Preview draft on the whole owner app (temporary until you leave this page)
        </label>
        <p v-if="changedKeys.length" class="mt-2 text-xs font-medium text-accent-active">
          {{ changedKeys.length }} token(s) differ from shipped defaults.
        </p>
      </AppCard>

      <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div class="space-y-6">
          <AppCard
            v-for="section in groupedTokens"
            :key="section.group"
            wrapper-class="p-5 sm:p-6"
          >
            <h2 class="text-lg font-black text-ink">{{ section.label }}</h2>
            <div class="mt-4 space-y-4">
              <div
                v-for="token in section.items"
                :key="token.key"
                class="grid gap-3 rounded-2xl border border-border/80 bg-surface-muted/70 p-4 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p class="font-semibold text-ink">{{ token.label }}</p>
                  <p class="mt-1 text-sm text-ink-muted">{{ token.description }}</p>
                  <p class="mt-2 font-mono text-xs text-ink-soft">{{ token.key }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <span
                    class="size-11 shrink-0 rounded-xl border border-border"
                    :style="{ backgroundColor: draft[token.key] }"
                  />
                  <input
                    :value="draft[token.key]"
                    type="color"
                    class="h-11 w-14 cursor-pointer rounded-lg border border-border bg-surface p-1"
                    @input="updateToken(token.key, ($event.target as HTMLInputElement).value)"
                  >
                  <input
                    :value="draft[token.key]"
                    type="text"
                    maxlength="7"
                    class="w-24 rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm font-semibold uppercase text-ink"
                    @change="updateToken(token.key, ($event.target as HTMLInputElement).value)"
                  >
                </div>
              </div>
            </div>
          </AppCard>
        </div>

        <AppCard wrapper-class="p-5 sm:p-6 xl:sticky xl:top-6 xl:self-start">
          <div class="flex items-center gap-2 text-ink-muted">
            <Palette class="size-4" :stroke-width="2.2" />
            <span class="text-xs font-semibold uppercase tracking-wide">Live preview</span>
          </div>
          <h2 class="mt-2 text-xl font-black text-ink">How it feels</h2>
          <p class="mt-1 text-sm text-ink-muted">Sample components using your draft palette.</p>

          <div
            ref="previewRoot"
            class="palette-preview mt-6 space-y-4 rounded-2xl border border-border p-5"
            :style="{
              background: 'linear-gradient(180deg, var(--flotory-bg-gradient-start) 0%, var(--flotory-bg-gradient-end) 100%)',
              color: 'var(--flotory-ink)',
            }"
          >
            <div
              class="rounded-2xl border p-4"
              :style="{
                backgroundColor: 'var(--flotory-surface)',
                borderColor: 'var(--flotory-border)',
              }"
            >
              <p class="text-xs font-bold uppercase tracking-wide" :style="{ color: 'var(--flotory-ink-soft)' }">
                Card title
              </p>
              <p class="mt-2 text-lg font-black" :style="{ color: 'var(--flotory-ink)' }">
                Demo Cafe loyalty
              </p>
              <p class="mt-1 text-sm" :style="{ color: 'var(--flotory-ink-muted)' }">
                Secondary copy and helper text.
              </p>
              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-xl px-4 py-2 text-sm font-bold"
                  :style="{ backgroundColor: 'var(--flotory-primary)', color: 'var(--flotory-primary-text)' }"
                >
                  Primary action
                </button>
                <button
                  type="button"
                  class="rounded-xl px-4 py-2 text-sm font-bold"
                  :style="{
                    backgroundColor: 'var(--flotory-accent-soft)',
                    color: 'var(--flotory-accent-active)',
                    border: '1px solid var(--flotory-accent-border)',
                  }"
                >
                  Accent action
                </button>
              </div>
            </div>

            <div
              class="rounded-2xl border p-4"
              :style="{
                backgroundColor: 'var(--flotory-campaign-bg)',
                borderColor: 'var(--flotory-campaign-border)',
              }"
            >
              <p class="text-xs font-bold uppercase tracking-wide" :style="{ color: 'var(--flotory-accent)' }">
                Active campaign
              </p>
              <p class="mt-2 text-lg font-black text-white">
                Double stamps weekend
              </p>
              <p class="mt-1 text-sm text-white/75">
                Earn 2× on every visit this Saturday and Sunday.
              </p>
            </div>

            <div
              class="rounded-2xl border p-4"
              :style="{
                backgroundColor: 'var(--flotory-surface)',
                borderColor: 'var(--flotory-border)',
                borderLeftWidth: '4px',
                borderLeftColor: 'var(--flotory-reward-ready-accent)',
              }"
            >
              <p class="text-xs font-bold uppercase tracking-wide" :style="{ color: 'var(--flotory-accent-active)' }">
                Reward ready
              </p>
              <p class="mt-2 text-lg font-black" :style="{ color: 'var(--flotory-ink)' }">
                Free flat white
              </p>
              <p class="mt-1 text-sm" :style="{ color: 'var(--flotory-ink-muted)' }">
                Show your QR at the counter to claim.
              </p>
            </div>

            <div class="h-3 overflow-hidden rounded-full" :style="{ backgroundColor: 'var(--flotory-progress-track)' }">
              <div class="h-full w-2/3 rounded-full" :style="{ backgroundColor: 'var(--flotory-progress-filled)' }" />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div
                class="rounded-xl px-3 py-2 text-sm font-semibold"
                :style="{
                  backgroundColor: 'var(--flotory-success-bg)',
                  color: 'var(--flotory-success-text)',
                  border: '1px solid var(--flotory-success-border)',
                }"
              >
                Success state
              </div>
              <div
                class="rounded-xl px-3 py-2 text-sm font-semibold"
                :style="{
                  backgroundColor: 'var(--flotory-danger-soft)',
                  color: 'var(--flotory-danger)',
                }"
              >
                Danger state
              </div>
            </div>

            <div
              class="rounded-xl px-3 py-2 text-sm font-bold"
              :style="{
                backgroundColor: 'var(--flotory-lavender)',
                color: 'var(--flotory-primary)',
                border: '1px solid var(--flotory-lavender-border)',
              }"
            >
              Analytics highlight
            </div>

            <p class="text-sm font-semibold" :style="{ color: 'var(--flotory-link)' }">
              Link style preview
            </p>

            <div class="h-16 rounded-xl" :style="{ backgroundColor: 'var(--flotory-chart)', opacity: 0.85 }" />
          </div>
        </AppCard>
      </div>
    </template>
  </AppShell>
</template>
