<script setup lang="ts">
import { Clock3, Pause, Pencil, Trash2 } from '@lucide/vue'
import { computed } from 'vue'

import CampaignIcon from '@/components/campaigns/CampaignIcon.vue'
import AppButton from '@/components/ui/AppButton.vue'
import {
  campaignActiveDays,
  campaignCriteriaChips,
  campaignMultiplier,
  campaignShowsDayRow,
  campaignTargetLabel,
  campaignTemplateIcon,
  campaignTemplateTone,
  campaignTimeRange,
  WEEKDAYS,
  type Campaign,
} from '@/lib/campaignTemplates'

const props = defineProps<{
  campaign: Campaign
}>()

const emit = defineEmits<{
  pause: []
  edit: []
  end: []
}>()

const activeDays = computed(() => campaignActiveDays(props.campaign))
const showDayRow = computed(() => campaignShowsDayRow(props.campaign))
const timeRange = computed(() => campaignTimeRange(props.campaign))
const criteriaChips = computed(() => campaignCriteriaChips(props.campaign))
const targetLabel = computed(() => campaignTargetLabel(props.campaign))
const multiplier = computed(() => campaignMultiplier(props.campaign))
</script>

<template>
  <article
    class="flex h-full flex-col rounded-2xl border p-4 shadow-sm"
    :style="{
      backgroundColor: 'var(--flotory-campaign-bg)',
      borderColor: 'var(--flotory-campaign-border)',
      color: 'var(--flotory-primary-text)',
    }"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <CampaignIcon
          :icon="campaignTemplateIcon(campaign.template_id)"
          :tone="campaignTemplateTone(campaign.template_id)"
          size="md"
        />
        <h3 class="truncate text-base font-bold text-white">
          {{ campaign.name }}
        </h3>
      </div>
      <span
        class="shrink-0 text-xs font-bold"
        :style="{ color: 'var(--flotory-accent)' }"
      >
        Active
      </span>
    </div>

    <div class="mt-4 flex flex-1 items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <div v-if="showDayRow" class="flex flex-wrap gap-1">
          <span
            v-for="day in WEEKDAYS"
            :key="day.iso"
            class="rounded-md px-2 py-0.5 text-xs font-semibold"
            :class="activeDays.includes(day.iso) ? 'text-white' : 'text-white/40'"
            :style="
              activeDays.includes(day.iso)
                ? { backgroundColor: 'rgba(255,255,255,0.14)' }
                : undefined
            "
          >
            {{ day.short }}
          </span>
        </div>

        <p
          v-if="timeRange"
          class="mt-2 flex items-center gap-1.5 text-xs font-medium text-white/70"
        >
          <Clock3 class="size-3.5 shrink-0" aria-hidden="true" />
          {{ timeRange }}
        </p>

        <div v-if="criteriaChips.length" class="space-y-1.5">
          <p class="text-xs font-medium text-white/70">Customers with</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="chip in criteriaChips"
              :key="chip"
              class="rounded-md px-2 py-0.5 text-xs font-semibold text-white/90 ring-1 ring-white/15"
              :style="{ backgroundColor: 'rgba(255,255,255,0.08)' }"
            >
              {{ chip }}
            </span>
          </div>
        </div>

        <p
          v-if="!showDayRow && !timeRange && !criteriaChips.length && campaign.schedule_summary"
          class="text-xs font-medium leading-relaxed text-white/75"
        >
          {{ campaign.schedule_summary }}
        </p>
      </div>

      <div class="shrink-0 text-right">
        <p
          class="text-3xl font-black leading-none tabular-nums"
          :style="{ color: 'var(--flotory-accent)' }"
        >
          {{ multiplier }}×
        </p>
        <p class="mt-0.5 text-xs font-semibold text-white/65">stamps</p>
      </div>
    </div>

    <div
      class="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
      :style="{ borderColor: 'rgba(255,255,255,0.12)' }"
    >
      <p class="text-sm text-white/75">
        <span class="font-semibold text-white/90">Targets:</span>
        {{ targetLabel }}
      </p>

      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" size="sm" class="gap-1.5" @click="emit('pause')">
          <Pause class="size-3.5" aria-hidden="true" />
          Pause
        </AppButton>
        <AppButton variant="secondary" size="sm" class="gap-1.5" @click="emit('edit')">
          <Pencil class="size-3.5" aria-hidden="true" />
          Edit
        </AppButton>
        <AppButton variant="ghost" size="sm" class="gap-1.5 text-danger/70 hover:bg-surface/10 hover:text-danger/60" @click="emit('end')">
          <Trash2 class="size-3.5" aria-hidden="true" />
          End
        </AppButton>
      </div>
    </div>
  </article>
</template>
