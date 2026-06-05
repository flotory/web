<script setup lang="ts">
import { ChevronRight, MoreVertical, Pause, Play } from '@lucide/vue'
import { onMounted, onUnmounted, ref } from 'vue'

import CampaignIcon from '@/components/campaigns/CampaignIcon.vue'
import { campaignMetaParts, campaignTimelineLabel } from '@/lib/campaignHistory'
import {
  campaignStatusLabel,
  campaignTemplateIcon,
  campaignTemplateTone,
  type Campaign,
} from '@/lib/campaignTemplates'
import { cn } from '@/lib/utils'

defineProps<{
  campaign: Campaign
}>()

const emit = defineEmits<{
  pause: []
  activate: []
  edit: []
  end: []
}>()

const menuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)

function statusBadgeClass(status: Campaign['status']) {
  return cn(
    'inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold leading-none',
    status === 'active' && 'bg-success-bg text-success-text',
    status === 'paused' && 'bg-accent-soft text-accent-active',
    status === 'ended' && 'bg-surface-muted text-ink-muted',
    status === 'draft' && 'bg-accent-soft text-primary',
  )
}

function closeMenu() {
  menuOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!menuRoot.value?.contains(event.target as Node)) {
    closeMenu()
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div
    class="flex min-h-[4.75rem] items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted/90"
  >
    <CampaignIcon
      :icon="campaignTemplateIcon(campaign.template_id)"
      :tone="campaignTemplateTone(campaign.template_id)"
      size="md"
      class="shrink-0 self-center"
    />

    <div class="min-w-0 flex-1 self-center">
      <span :class="statusBadgeClass(campaign.status)">
        {{ campaign.status_label ?? campaignStatusLabel(campaign.status) }}
      </span>
      <h3 class="mt-1.5 truncate text-[15px] font-bold leading-tight text-ink">
        {{ campaign.name }}
      </h3>
      <p class="mt-1 truncate text-sm leading-snug text-ink-muted">
        <template v-for="(part, index) in campaignMetaParts(campaign)" :key="part">
          <span v-if="index > 0" class="text-ink-soft"> · </span>{{ part }}
        </template>
      </p>
      <p class="mt-1.5 text-xs font-medium text-ink-soft sm:hidden">
        {{ campaignTimelineLabel(campaign) }}
      </p>
    </div>

    <p class="hidden w-32 shrink-0 text-right text-sm font-medium text-ink-soft sm:block">
      {{ campaignTimelineLabel(campaign) }}
    </p>

    <div class="flex shrink-0 items-center gap-1.5 self-center">
      <button
        v-if="campaign.status === 'paused'"
        type="button"
        class="grid size-10 place-items-center rounded-xl border border-border/80 bg-surface text-ink-muted shadow-sm transition hover:border-border hover:bg-surface-muted"
        aria-label="Resume campaign"
        @click="emit('activate')"
      >
        <Play class="size-4 fill-current" />
      </button>
      <button
        v-else-if="campaign.status === 'active'"
        type="button"
        class="grid size-10 place-items-center rounded-xl border border-border/80 bg-surface text-ink-muted shadow-sm transition hover:border-border hover:bg-surface-muted"
        aria-label="Pause campaign"
        @click="emit('pause')"
      >
        <Pause class="size-4" />
      </button>
      <button
        v-else
        type="button"
        class="grid size-10 place-items-center rounded-xl border border-border/80 bg-surface text-ink-muted shadow-sm transition hover:border-border hover:bg-surface-muted"
        aria-label="View campaign"
        @click="emit('edit')"
      >
        <ChevronRight class="size-4" />
      </button>

      <div ref="menuRoot" class="relative">
        <button
          type="button"
          class="grid size-10 place-items-center rounded-xl text-ink-soft transition hover:bg-surface-muted hover:text-ink-muted"
          aria-label="More options"
          @click.stop="menuOpen = !menuOpen"
        >
          <MoreVertical class="size-4" />
        </button>
        <div
          v-if="menuOpen"
          class="absolute right-0 z-20 mt-1 w-44 rounded-2xl border border-border bg-surface p-1.5 shadow-xl"
        >
          <button
            type="button"
            class="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink-muted hover:bg-surface-muted"
            @click="emit('edit'); closeMenu()"
          >
            Edit
          </button>
          <button
            v-if="campaign.status === 'active'"
            type="button"
            class="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink-muted hover:bg-surface-muted"
            @click="emit('pause'); closeMenu()"
          >
            Pause
          </button>
          <button
            v-if="campaign.status === 'paused'"
            type="button"
            class="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink-muted hover:bg-surface-muted"
            @click="emit('activate'); closeMenu()"
          >
            Resume
          </button>
          <button
            v-if="campaign.status !== 'ended'"
            type="button"
            class="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger-soft"
            @click="emit('end'); closeMenu()"
          >
            End campaign
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
