<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import {
  DASHBOARD_PERIOD_PRESETS,
  type DashboardPeriodSelection,
  todayIsoDate,
} from '@/lib/dashboardPeriod'

const props = defineProps<{
  modelValue: DashboardPeriodSelection
  periodLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DashboardPeriodSelection]
}>()

const showCustom = ref(props.modelValue.preset === 'custom')
const customFrom = ref(props.modelValue.from ?? '')
const customTo = ref(props.modelValue.to ?? todayIsoDate())

watch(
  () => props.modelValue,
  (value) => {
    if (value.preset === 'custom') {
      showCustom.value = true
      customFrom.value = value.from ?? customFrom.value
      customTo.value = value.to ?? customTo.value
    }
  },
  { deep: true },
)

const presetOptions = computed(() => DASHBOARD_PERIOD_PRESETS)

const pillClass = (active: boolean) => [
  'rounded-lg px-2 py-1 text-xs font-semibold transition',
  active
    ? 'bg-primary text-primary-text shadow-sm'
    : 'bg-surface-muted text-ink-muted hover:bg-surface hover:text-ink',
]

function selectPreset(preset: DashboardPeriodSelection['preset']) {
  if (preset === 'custom') {
    showCustom.value = true
    if (!customFrom.value) {
      customFrom.value = customTo.value
    }
    return
  }

  showCustom.value = false
  emit('update:modelValue', { preset })
}

function applyCustomRange() {
  if (!customFrom.value || !customTo.value || customFrom.value > customTo.value) {
    return
  }

  emit('update:modelValue', {
    preset: 'custom',
    from: customFrom.value,
    to: customTo.value,
  })
}

const customRangeInvalid = computed(() => {
  return Boolean(customFrom.value && customTo.value && customFrom.value > customTo.value)
})
</script>

<template>
  <div class="rounded-2xl border border-border bg-surface px-3 py-2.5 sm:px-3.5">
    <div class="flex flex-wrap items-center gap-x-2.5 gap-y-2">
      <p v-if="periodLabel" class="shrink-0 text-xs font-semibold text-ink-muted">
        <span class="font-bold uppercase tracking-wide text-ink-soft">Range</span>
        {{ periodLabel }}
      </p>
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        <button
          v-for="option in presetOptions"
          :key="option.id"
          type="button"
          :class="pillClass(modelValue.preset === option.id)"
          @click="selectPreset(option.id)"
        >
          {{ option.shortLabel }}
        </button>
        <button
          type="button"
          :class="pillClass(modelValue.preset === 'custom')"
          @click="selectPreset('custom')"
        >
          Custom
        </button>
      </div>
    </div>

    <div
      v-if="showCustom || modelValue.preset === 'custom'"
      class="mt-2 flex flex-wrap items-center gap-2 border-t border-border/70 pt-2"
    >
      <input
        v-model="customFrom"
        type="date"
        aria-label="From date"
        :max="customTo || todayIsoDate()"
        class="h-8 min-w-0 flex-1 rounded-lg border border-border bg-surface-muted px-2 text-xs font-medium text-ink outline-none focus:border-ink-soft sm:max-w-[9.5rem]"
      >
      <span class="text-xs font-semibold text-ink-soft">to</span>
      <input
        v-model="customTo"
        type="date"
        aria-label="To date"
        :min="customFrom || undefined"
        :max="todayIsoDate()"
        class="h-8 min-w-0 flex-1 rounded-lg border border-border bg-surface-muted px-2 text-xs font-medium text-ink outline-none focus:border-ink-soft sm:max-w-[9.5rem]"
      >
      <button
        type="button"
        class="h-8 shrink-0 rounded-lg bg-primary px-3 text-xs font-bold text-primary-text transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!customFrom || !customTo || customRangeInvalid"
        @click="applyCustomRange"
      >
        Apply
      </button>
      <p v-if="customRangeInvalid" class="w-full text-xs font-medium text-accent-active">
        Start must be on or before end.
      </p>
    </div>
  </div>
</template>
