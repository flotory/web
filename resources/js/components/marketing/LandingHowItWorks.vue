<script setup lang="ts">
import type { Component } from 'vue'
import { ArrowRight, ChevronsRight, Gift, Nfc, QrCode, UserRound } from '@lucide/vue'

type FlowStep = {
  step: string
  testId: string
  icon: Component
  title: string
  copy: string
  detail: string
  accent?: boolean
}

const steps: FlowStep[] = [
  {
    step: '01',
    testId: 'landing-flow-step-join',
    icon: QrCode,
    title: 'Join the venue',
    copy: 'Scan the counter QR or open the invite link. Browse venues before creating an account.',
    detail: 'QR · invite link',
  },
  {
    step: '02',
    testId: 'landing-flow-step-stamp',
    icon: Nfc,
    title: 'Tap for a stamp',
    copy: 'On every return visit, hold the phone on the NFC stand at the counter.',
    detail: '+1 stamp per tap',
    accent: true,
  },
  {
    step: '03',
    testId: 'landing-flow-step-milestone',
    icon: Gift,
    title: 'Reach a milestone',
    copy: 'Stamps fill the card in Wallet. Gift milestones unlock when the target is reached.',
    detail: 'Progress on Home & Wallet',
  },
  {
    step: '04',
    testId: 'landing-flow-step-redeem',
    icon: ChevronsRight,
    title: 'Slide to redeem',
    copy: 'When a reward is ready, slide to confirm in the app. No staff scanner required.',
    detail: 'Guest self-redeem',
  },
]
</script>

<template>
  <div class="flow" data-testid="landing-how-it-works-flow">
    <template v-for="(step, index) in steps" :key="step.testId">
      <article
        class="flow-step"
        :class="{ 'flow-step--accent': step.accent }"
        :data-testid="step.testId"
      >
        <div class="flow-step-head">
          <span class="flow-step-number">{{ step.step }}</span>
          <div
            class="flow-step-icon"
            :class="{ 'flow-step-icon--accent': step.accent }"
            aria-hidden="true"
          >
            <component :is="step.icon" :size="20" :stroke-width="2.2" />
          </div>
        </div>

        <h3 class="flow-step-title">{{ step.title }}</h3>
        <p class="flow-step-copy">{{ step.copy }}</p>

        <p class="flow-step-detail">
          <UserRound
            v-if="step.step === '01'"
            :size="13"
            :stroke-width="2.2"
            class="flow-step-detail-icon"
            aria-hidden="true"
          />
          <component
            v-else
            :is="step.icon"
            :size="13"
            :stroke-width="2.2"
            class="flow-step-detail-icon"
            aria-hidden="true"
          />
          {{ step.detail }}
        </p>

        <div v-if="step.accent" class="flow-nfc-pulse" aria-hidden="true">
          <span class="flow-nfc-ring" />
          <span class="flow-nfc-core" />
        </div>
      </article>

      <div
        v-if="index < steps.length - 1"
        class="flow-connector"
        aria-hidden="true"
      >
        <ArrowRight :size="16" :stroke-width="2.2" class="flow-connector-icon flow-connector-icon--horizontal" />
        <ArrowRight :size="16" :stroke-width="2.2" class="flow-connector-icon flow-connector-icon--vertical" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.flow {
  display: grid;
  gap: 0.85rem;
  max-width: 58rem;
  margin-inline: auto;
}

@media (min-width: 768px) {
  .flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem 0.75rem;
  }

  .flow-connector {
    display: none;
  }

  .flow-connector--after-col-2 {
    display: none;
  }
}

@media (min-width: 1100px) {
  .flow {
    grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
    align-items: stretch;
    gap: 0.65rem;
  }

  .flow-connector {
    display: flex;
  }
}

.flow-step {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--flotory-border) 75%, transparent);
  background: linear-gradient(
    165deg,
    var(--flotory-surface) 0%,
    color-mix(in srgb, var(--flotory-surface-muted) 35%, var(--flotory-surface)) 100%
  );
  padding: 1.25rem 1.15rem 1.15rem;
  box-shadow: 0 10px 28px color-mix(in srgb, var(--flotory-primary) 5%, transparent);
}

@media (min-width: 768px) {
  .flow-step {
    padding: 1.35rem 1.2rem 1.2rem;
  }
}

.flow-step--accent {
  border-color: color-mix(in srgb, var(--flotory-accent-border) 42%, var(--flotory-border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--flotory-accent-soft) 30%, var(--flotory-surface)) 0%,
    var(--flotory-surface) 100%
  );
}

.flow-step-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flow-step-number {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: var(--flotory-accent-active);
}

.flow-step-icon {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--flotory-surface-muted) 65%, var(--flotory-surface));
  color: var(--flotory-ink);
}

.flow-step-icon--accent {
  background: var(--flotory-accent-soft);
  color: var(--flotory-accent-active);
}

.flow-step-title {
  margin-top: 0.85rem;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--flotory-ink);
}

.flow-step-copy {
  margin-top: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.55;
  color: var(--flotory-ink-muted);
}

.flow-step-detail {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: auto;
  padding-top: 0.85rem;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--flotory-accent-active);
}

.flow-step-detail-icon {
  flex-shrink: 0;
  opacity: 0.9;
}

.flow-nfc-pulse {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  width: 2rem;
  height: 2rem;
  opacity: 0.55;
}

.flow-nfc-ring {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  border: 2px solid color-mix(in srgb, var(--flotory-accent) 45%, transparent);
  animation: flow-nfc-ring 2.4s ease-out infinite;
}

.flow-nfc-core {
  position: absolute;
  inset: 0.42rem;
  border-radius: 9999px;
  background: var(--flotory-accent);
  opacity: 0.75;
}

.flow-connector {
  align-items: center;
  justify-content: center;
  color: var(--flotory-accent-active);
  opacity: 0.7;
}

.flow-connector-icon--vertical {
  display: none;
  transform: rotate(90deg);
}

.flow-connector-icon--horizontal {
  display: block;
}

@media (max-width: 1099px) {
  .flow-connector {
    display: flex;
    min-height: 1.25rem;
  }

  .flow-connector-icon--horizontal {
    display: none;
  }

  .flow-connector-icon--vertical {
    display: block;
  }
}

@keyframes flow-nfc-ring {
  0% {
    transform: scale(0.78);
    opacity: 0.9;
  }

  100% {
    transform: scale(1.45);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flow-nfc-ring {
    animation: none;
    opacity: 0.35;
  }
}
</style>
