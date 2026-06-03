<script setup lang="ts">
import CampaignIcon from '@/components/campaigns/CampaignIcon.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { campaignTemplateIcon, campaignTemplateTone, type Campaign } from '@/lib/campaignTemplates'

defineProps<{
  campaign: Campaign
}>()

const emit = defineEmits<{
  pause: []
  edit: []
  end: []
}>()
</script>

<template>
  <article
    class="flex h-full flex-col overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/70 shadow-lg shadow-emerald-950/5 ring-1 ring-emerald-100"
  >
    <div class="flex items-start gap-4 border-b border-emerald-100/80 px-6 py-5">
      <div class="flex min-w-0 flex-1 items-start gap-4">
        <CampaignIcon
          :icon="campaignTemplateIcon(campaign.template_id)"
          :tone="campaignTemplateTone(campaign.template_id)"
          size="lg"
        />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <AppBadge tone="green">{{ campaign.status_label ?? 'Running' }}</AppBadge>
            <AppBadge tone="slate">{{ campaign.audience_count }} customers</AppBadge>
          </div>
          <h3 class="mt-2 line-clamp-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
            {{ campaign.name }}
          </h3>
          <p v-if="campaign.summary" class="mt-1 line-clamp-2 text-sm text-slate-600">
            {{ campaign.summary }}
          </p>
        </div>
      </div>
      <div
        class="grid size-[4.5rem] shrink-0 place-items-center rounded-2xl bg-slate-950 text-center text-white shadow-lg sm:size-20"
      >
        <div>
          <p class="text-2xl font-black leading-none sm:text-3xl">
            {{ campaign.multiplier ?? campaign.config.stamp_multiplier ?? 2 }}×
          </p>
          <p class="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 sm:text-xs">stamps</p>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4 px-6 py-5">
      <div v-if="campaign.schedule_chips?.length" class="flex min-h-[1.75rem] flex-wrap gap-2">
        <span
          v-for="chip in campaign.schedule_chips"
          :key="chip"
          class="inline-flex items-center justify-center rounded-full bg-white px-3 py-1 text-center text-xs font-bold leading-none text-slate-700 ring-1 ring-slate-200"
        >
          {{ chip }}
        </span>
      </div>
      <p v-else-if="campaign.schedule_summary" class="min-h-[1.75rem] text-sm font-semibold text-slate-600">
        {{ campaign.schedule_summary }}
      </p>
      <div v-else class="min-h-[1.75rem]" aria-hidden="true" />

      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" size="sm" @click="emit('pause')">Pause</AppButton>
        <AppButton variant="ghost" size="sm" @click="emit('edit')">Edit</AppButton>
        <AppButton variant="ghost" size="sm" @click="emit('end')">End</AppButton>
      </div>
    </div>
  </article>
</template>
