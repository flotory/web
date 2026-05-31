<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  stamps: number
  required: number
  highlightedStamp?: number | null
}>()

const remaining = computed(() => Math.max(props.required - props.stamps, 0))
const slots = computed(() => Array.from({ length: props.required }, (_, index) => index < props.stamps))
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2">
      <span
        v-for="(filled, index) in slots"
        :key="index"
        :class="[
          'grid size-9 place-items-center rounded-full text-lg shadow-sm transition',
          filled ? 'bg-amber-400 text-white shadow-amber-200' : 'bg-slate-100 text-slate-300',
          highlightedStamp === index + 1 && 'animate-bounce ring-4 ring-amber-200',
        ]"
        aria-hidden="true"
      >
        ★
      </span>
    </div>
    <p class="text-sm font-medium text-slate-500">
      <span v-if="remaining === 0">Reward unlocked — ready to claim.</span>
      <span v-else>{{ remaining }} more {{ remaining === 1 ? 'stamp' : 'stamps' }} to unlock</span>
    </p>
  </div>
</template>
