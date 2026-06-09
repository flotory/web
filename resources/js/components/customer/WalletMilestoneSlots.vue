<script setup lang="ts">
import { Check, Gift } from '@lucide/vue'
import { computed } from 'vue'

const props = defineProps<{
  filled: number
  milestoneStamp: number
  maxVisible?: number
}>()

const slots = computed(() => Math.min(Math.max(props.milestoneStamp, 1), props.maxVisible ?? 10))
const filledCount = computed(() => Math.min(Math.max(props.filled, 0), slots.value))
</script>

<template>
  <div class="mt-2 flex gap-1">
    <span
      v-for="stamp in slots"
      :key="stamp"
      class="grid size-5 place-items-center rounded-full border text-[10px] font-extrabold"
      :class="[
        stamp === milestoneStamp
          ? filledCount >= stamp
            ? 'border-accent-border bg-accent-soft text-accent-active'
            : 'border-accent-border/70 bg-white/10 text-accent'
          : stamp <= filledCount
            ? 'border-accent bg-accent text-campaign'
            : 'border-white/25 bg-white/10 text-white/50',
      ]"
    >
      <Check
        v-if="stamp !== milestoneStamp && stamp <= filledCount"
        class="size-3"
      />
      <Gift
        v-else-if="stamp === milestoneStamp"
        class="size-3"
      />
    </span>
  </div>
</template>
