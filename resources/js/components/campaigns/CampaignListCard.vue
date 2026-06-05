<script setup lang="ts">
import CampaignIcon from '@/components/campaigns/CampaignIcon.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import {
  campaignStatusLabel,
  campaignStatusTone,
  campaignTemplateIcon,
  campaignTemplateTone,
  type Campaign,
} from '@/lib/campaignTemplates'

defineProps<{
  campaign: Campaign
  showActivate?: boolean
}>()

const emit = defineEmits<{
  activate: []
  pause: []
  edit: []
  end: []
}>()
</script>

<template>
  <article class="rounded-2xl border border-border bg-surface p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-3">
        <CampaignIcon
          :icon="campaignTemplateIcon(campaign.template_id)"
          :tone="campaignTemplateTone(campaign.template_id)"
          size="md"
        />
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <AppBadge :tone="campaignStatusTone(campaign.status)">
              {{ campaign.status_label ?? campaignStatusLabel(campaign.status) }}
            </AppBadge>
            <span class="text-sm font-bold text-ink-muted">{{ campaign.audience_count }} customers</span>
            <span class="text-sm font-black text-ink">{{ campaign.multiplier ?? 2 }}×</span>
          </div>
          <h3 class="mt-2 font-bold text-ink">{{ campaign.name }}</h3>
          <div v-if="campaign.schedule_chips?.length" class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="chip in campaign.schedule_chips"
              :key="chip"
              class="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-ink-muted"
            >
              {{ chip }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <AppButton v-if="showActivate" size="sm" @click="emit('activate')">Activate</AppButton>
        <AppButton v-if="campaign.status === 'active'" variant="secondary" size="sm" @click="emit('pause')">
          Pause
        </AppButton>
        <AppButton variant="ghost" size="sm" @click="emit('edit')">Edit</AppButton>
        <AppButton v-if="campaign.status !== 'ended'" variant="ghost" size="sm" @click="emit('end')">End</AppButton>
      </div>
    </div>
  </article>
</template>
