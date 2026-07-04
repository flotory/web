<script setup lang="ts">
import { computed } from 'vue'

import {
  ONBOARDING_STEPS,
  type OnboardingStep,
  onboardingStepIndex,
} from '@/lib/ownerOnboarding'

const props = defineProps<{
  current: OnboardingStep
}>()

const currentIndex = computed(() => onboardingStepIndex(props.current))

const visibleSteps = computed(() => ONBOARDING_STEPS.filter((step) => step !== 'welcome'))
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
      <span>Step {{ currentIndex + 1 }} of {{ ONBOARDING_STEPS.length }}</span>
      <span>{{ Math.round(((currentIndex + 1) / ONBOARDING_STEPS.length) * 100) }}%</span>
    </div>
    <div class="grid grid-cols-5 gap-1.5">
      <div
        v-for="step in visibleSteps"
        :key="step"
        class="h-1.5 rounded-full transition"
        :class="onboardingStepIndex(step) <= currentIndex ? 'bg-accent' : 'bg-border'"
      />
    </div>
  </div>
</template>
