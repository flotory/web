<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'

import CampaignIcon from '@/components/campaigns/CampaignIcon.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { api, apiErrorMessage } from '@/lib/api'
import {
  WEEKDAYS,
  campaignTemplateIcon,
  campaignTemplateMeta,
  campaignTemplateTone,
  defaultConfigFor,
  defaultNameFor,
  multiplierLabel,
  toggleDay,
  type Campaign,
  type CampaignConfig,
  type CampaignPreview,
  type CampaignTemplate,
  type CampaignTemplateId,
} from '@/lib/campaignTemplates'
import { toast } from '@/lib/toast'

const props = defineProps<{
  open: boolean
  venueId: number
  templateId: CampaignTemplateId
  templates: CampaignTemplate[]
  editing?: Campaign | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const step = ref<'configure' | 'review'>('configure')
const saving = ref(false)
const loadingPreview = ref(false)
const name = ref('')
const config = ref<CampaignConfig>({})
const pushEnabled = ref(true)
const preview = ref<CampaignPreview | null>(null)

const templateMeta = computed(() => campaignTemplateMeta[props.templateId])

function resetForm() {
  if (props.editing) {
    name.value = props.editing.name
    config.value = { ...props.editing.config }
    pushEnabled.value = props.editing.push_enabled
  } else {
    name.value = defaultNameFor(props.templateId, props.templates)
    config.value = defaultConfigFor(props.templateId)
    pushEnabled.value = true
  }
  preview.value = null
  step.value = 'configure'
}

watch(
  () => [props.open, props.templateId, props.editing?.id],
  () => {
    if (props.open) {
      resetForm()
    }
  },
  { immediate: true },
)

async function loadPreview() {
  loadingPreview.value = true
  try {
    const response = await api<{ preview: CampaignPreview }>(`/venues/${props.venueId}/campaigns/preview`, {
      method: 'POST',
      body: {
        template_id: props.templateId,
        name: name.value,
        config: config.value,
      },
    })
    preview.value = response.preview
    step.value = 'review'
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not load preview.'))
  } finally {
    loadingPreview.value = false
  }
}

async function activate() {
  saving.value = true
  try {
    if (props.editing) {
      const body: Record<string, unknown> = {
        name: name.value,
        config: config.value,
        push_enabled: pushEnabled.value,
      }
      if (props.editing.status !== 'active') {
        body.status = 'active'
      }
      await api(`/venues/${props.venueId}/campaigns/${props.editing.id}`, {
        method: 'PATCH',
        body,
      })
      toast.success('Campaign updated')
    } else {
      await api(`/venues/${props.venueId}/campaigns`, {
        method: 'POST',
        body: {
          template_id: props.templateId,
          name: name.value,
          config: config.value,
          push_enabled: pushEnabled.value,
          activate: true,
        },
      })
      toast.success('Campaign is live')
    }
    emit('saved')
    emit('close')
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not activate campaign.'))
  } finally {
    saving.value = false
  }
}

function setMultiplier(value: number) {
  config.value = { ...config.value, stamp_multiplier: value }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-end justify-center bg-primary/50 p-0 sm:items-center sm:p-4"
    @click.self="emit('close')"
  >
    <div
      class="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl"
      role="dialog"
      aria-modal="true"
    >
      <header class="flex items-center justify-between border-b border-border px-5 py-4">
        <div class="flex items-center gap-3">
          <CampaignIcon :icon="campaignTemplateIcon(templateId)" :tone="campaignTemplateTone(templateId)" size="md" />
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">
              {{ step === 'configure' ? 'Configure' : 'Review' }}
            </p>
            <h2 class="text-lg font-black text-ink">{{ name }}</h2>
          </div>
        </div>
        <button
          type="button"
          class="grid size-10 place-items-center rounded-full text-ink-muted hover:bg-surface-muted"
          @click="emit('close')"
        >
          <X class="size-5" />
        </button>
      </header>

      <div class="flex-1 overflow-y-auto px-5 py-5">
        <template v-if="step === 'configure'">
          <label class="block">
            <span class="text-xs font-bold uppercase tracking-wide text-ink-muted">Campaign name</span>
            <input
              v-model="name"
              type="text"
              class="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-accent focus:outline-none"
            />
          </label>

          <div class="mt-6 space-y-5">
            <div v-if="templateId === 'bring_back_customers'" class="space-y-4">
              <label class="block">
                <span class="text-xs font-bold uppercase tracking-wide text-ink-muted">Inactive days</span>
                <input
                  v-model.number="config.inactive_days"
                  type="number"
                  min="7"
                  max="180"
                  class="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold"
                />
              </label>
              <label class="block">
                <span class="text-xs font-bold uppercase tracking-wide text-ink-muted">Campaign duration (days)</span>
                <input
                  v-model.number="config.duration_days"
                  type="number"
                  min="1"
                  max="90"
                  class="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold"
                />
              </label>
            </div>

            <div v-if="templateId === 'quiet_day_promotion'" class="space-y-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-wide text-ink-muted">Days of week</p>
                <p class="mt-1 text-sm text-ink-muted">Choose the days you want to boost.</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button
                    v-for="day in WEEKDAYS"
                    :key="day.iso"
                    type="button"
                    class="rounded-full px-3 py-2 text-sm font-bold transition"
                    :class="
                      (config.days_of_week ?? []).includes(day.iso)
                        ? 'bg-primary-soft text-white'
                        : 'bg-surface-muted text-ink-muted border border-border'
                    "
                    @click="config.days_of_week = toggleDay(config.days_of_week ?? [], day.iso)"
                  >
                    {{ day.short }}
                  </button>
                </div>
              </div>
              <label class="block">
                <span class="text-xs font-bold uppercase tracking-wide text-ink-muted">Campaign duration (days)</span>
                <input
                  v-model.number="config.duration_days"
                  type="number"
                  min="1"
                  max="90"
                  class="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold"
                />
              </label>
            </div>

            <div v-if="templateId === 'happy_hour'" class="space-y-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-wide text-ink-muted">Days of week</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button
                    v-for="day in WEEKDAYS"
                    :key="day.iso"
                    type="button"
                    class="rounded-full px-3 py-2 text-sm font-bold transition"
                    :class="
                      (config.days_of_week ?? []).includes(day.iso)
                        ? 'bg-sky-600 text-white'
                        : 'bg-surface-muted text-ink-muted border border-border'
                    "
                    @click="config.days_of_week = toggleDay(config.days_of_week ?? [], day.iso)"
                  >
                    {{ day.short }}
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <label class="block">
                  <span class="text-xs font-bold uppercase tracking-wide text-ink-muted">Start</span>
                  <input
                    v-model="config.start_time"
                    type="time"
                    class="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold"
                  />
                </label>
                <label class="block">
                  <span class="text-xs font-bold uppercase tracking-wide text-ink-muted">End</span>
                  <input
                    v-model="config.end_time"
                    type="time"
                    class="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold"
                  />
                </label>
              </div>
            </div>

            <div v-if="templateId === 'vip_rewards'" class="space-y-4">
              <label class="block">
                <span class="text-xs font-bold uppercase tracking-wide text-ink-muted">Minimum visits</span>
                <input
                  v-model.number="config.min_visits"
                  type="number"
                  min="1"
                  class="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold"
                />
              </label>
              <label class="block">
                <span class="text-xs font-bold uppercase tracking-wide text-ink-muted">Minimum rewards claimed</span>
                <input
                  v-model.number="config.min_rewards_claimed"
                  type="number"
                  min="0"
                  class="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold"
                />
              </label>
              <p class="text-xs text-ink-muted">Customer qualifies if either condition is met.</p>
            </div>

            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-ink-muted">Multiplier</p>
              <div class="mt-2 flex gap-2">
                <button
                  v-for="value in [2, 3]"
                  :key="value"
                  type="button"
                  class="flex-1 rounded-2xl py-3 text-sm font-black transition"
                  :class="
                    (config.stamp_multiplier ?? 2) === value
                      ? 'bg-primary text-white'
                      : 'bg-surface-muted text-ink-muted border border-border'
                  "
                  @click="setMultiplier(value)"
                >
                  {{ value }}× stamps
                </button>
              </div>
            </div>

            <label class="flex items-center gap-3 rounded-2xl bg-surface-muted px-4 py-3 border border-border">
              <input v-model="pushEnabled" type="checkbox" class="size-4 rounded border-border" />
              <span class="text-sm font-semibold text-ink-muted">Notify customers via mobile push when available</span>
            </label>
          </div>
        </template>

        <template v-else-if="preview">
          <div class="space-y-4">
            <div class="rounded-2xl bg-primary p-5 text-white">
              <p class="text-xs font-bold uppercase tracking-wider text-ink-soft">Multiplier</p>
              <p class="mt-1 text-4xl font-black">{{ preview.multiplier }}×</p>
              <p class="text-sm text-ink-soft">Highest eligible bonus — campaigns never stack</p>
            </div>

            <div class="rounded-2xl border border-border p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">Estimated reach</p>
              <p class="mt-1 text-2xl font-black text-ink">{{ preview.audience_count }} customers</p>
            </div>

            <div class="rounded-2xl border border-border p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">Schedule</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <AppBadge v-for="chip in preview.schedule_chips" :key="chip" tone="slate">{{ chip }}</AppBadge>
              </div>
              <p class="mt-2 text-sm text-ink-muted">{{ preview.summary }}</p>
            </div>
          </div>
        </template>
      </div>

      <footer class="flex gap-2 border-t border-border px-5 py-4">
        <AppButton v-if="step === 'review'" variant="secondary" class="flex-1" @click="step = 'configure'">Back</AppButton>
        <AppButton
          v-if="step === 'configure'"
          class="flex-1"
          :disabled="loadingPreview"
          @click="loadPreview"
        >
          {{ loadingPreview ? 'Loading…' : 'Review' }}
        </AppButton>
        <AppButton v-else class="flex-1" :disabled="saving" @click="activate">
          {{ saving ? 'Activating…' : editing ? 'Save & activate' : 'Activate' }}
        </AppButton>
      </footer>
    </div>
  </div>
</template>
