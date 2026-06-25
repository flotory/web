<script setup lang="ts">
import type { Component } from 'vue'
import { ArrowRight, BarChart3, Gift, Nfc, Smartphone, UsersRound } from '@lucide/vue'

type ShowcasePanel = {
  step: string
  testId: string
  icon: Component
  title: string
  copy: string
  accent?: boolean
  stat?: { value: string; label: string }
  metrics?: Array<{ icon: Component; value: string; label: string }>
}

const STAMP_COLLECTED = 5
const STAMP_TOTAL = 10
const MILESTONE_STAMPS = [5, 10]

function isMilestoneStamp(position: number): boolean {
  return MILESTONE_STAMPS.includes(position)
}

function isStampFilled(position: number): boolean {
  if (isMilestoneStamp(position)) return false
  if (position < MILESTONE_STAMPS[0]) return position <= STAMP_COLLECTED
  return position > MILESTONE_STAMPS[0] && position < STAMP_TOTAL && position <= STAMP_COLLECTED
}

function isMilestoneReached(position: number): boolean {
  return isMilestoneStamp(position) && position <= STAMP_COLLECTED
}

const panels: ShowcasePanel[] = [
  {
    step: '01',
    testId: 'landing-product-panel-guest',
    icon: Smartphone,
    title: 'Guest wallet',
    copy: 'Join from QR or discover venues. Track stamps and slide to redeem.',
    stat: { value: `${STAMP_COLLECTED}/${STAMP_TOTAL}`, label: 'stamps on card' },
  },
  {
    step: '02',
    testId: 'landing-product-panel-nfc',
    icon: Nfc,
    title: 'NFC at counter',
    copy: 'Each tap at the counter adds one stamp to the guest wallet. No POS and no staff scanner.',
    stat: { value: '+1', label: 'stamp per tap' },
    accent: true,
  },
  {
    step: '03',
    testId: 'landing-product-panel-owner',
    icon: BarChart3,
    title: 'Owner dashboard',
    copy: 'See visits, active members, and rewards claimed from flotory.com.',
    metrics: [
      { icon: BarChart3, value: '128', label: 'Visits' },
      { icon: UsersRound, value: '42', label: 'Members' },
      { icon: Gift, value: '17', label: 'Redeemed' },
    ],
  },
]
</script>

<template>
  <div class="showcase" data-testid="landing-product-showcase">
    <template v-for="(panel, index) in panels" :key="panel.testId">
      <article
        class="showcase-panel"
        :class="{ 'showcase-panel--accent': panel.accent }"
        :data-testid="panel.testId"
      >
        <div class="showcase-panel-head">
          <span class="showcase-step">{{ panel.step }}</span>
          <div
            class="showcase-icon"
            :class="{ 'showcase-icon--accent': panel.accent }"
            aria-hidden="true"
          >
            <component :is="panel.icon" :size="22" :stroke-width="2.2" />
          </div>
        </div>

        <h3 class="showcase-title">{{ panel.title }}</h3>
        <p class="showcase-copy">{{ panel.copy }}</p>

        <div v-if="panel.stat" class="showcase-stat">
          <div class="showcase-stamp-row" v-if="panel.step === '01'" aria-hidden="true">
            <template v-for="n in STAMP_TOTAL" :key="n">
              <span
                v-if="isMilestoneStamp(n)"
                class="showcase-stamp showcase-stamp--reward"
                :class="{ 'showcase-stamp--reward-reached': isMilestoneReached(n) }"
              >
                <Gift :size="11" :stroke-width="2.4" />
              </span>
              <span
                v-else
                class="showcase-stamp"
                :class="{ 'showcase-stamp--filled': isStampFilled(n) }"
              />
            </template>
          </div>
          <div v-else-if="panel.accent" class="showcase-nfc-pulse" aria-hidden="true">
            <span class="showcase-nfc-ring" />
            <span class="showcase-nfc-core" />
          </div>
          <p class="showcase-stat-value">{{ panel.stat.value }}</p>
          <p class="showcase-stat-label">{{ panel.stat.label }}</p>
        </div>

        <ul v-if="panel.metrics" class="showcase-metrics">
          <li
            v-for="metric in panel.metrics"
            :key="metric.label"
            class="showcase-metric"
          >
            <span class="showcase-metric-icon" aria-hidden="true">
              <component :is="metric.icon" :size="16" :stroke-width="2.2" />
            </span>
            <span class="showcase-metric-copy">
              <span class="showcase-metric-value">{{ metric.value }}</span>
              <span class="showcase-metric-label">{{ metric.label }}</span>
            </span>
          </li>
        </ul>
      </article>

      <div
        v-if="index < panels.length - 1"
        class="showcase-connector"
        aria-hidden="true"
      >
        <ArrowRight :size="18" :stroke-width="2.2" class="showcase-connector-icon showcase-connector-icon--desktop" />
        <ArrowRight :size="18" :stroke-width="2.2" class="showcase-connector-icon showcase-connector-icon--mobile" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.showcase {
  display: grid;
  gap: 0.85rem;
  max-width: 56rem;
  margin-inline: auto;
}

@media (min-width: 768px) {
  .showcase {
    grid-template-columns: 1fr auto 1fr auto 1fr;
    align-items: stretch;
    gap: 0.75rem;
  }
}

.showcase-panel {
  display: flex;
  flex-direction: column;
  border-radius: 1.35rem;
  border: 1px solid color-mix(in srgb, var(--flotory-border) 75%, transparent);
  background: linear-gradient(
    165deg,
    var(--flotory-surface) 0%,
    color-mix(in srgb, var(--flotory-surface-muted) 35%, var(--flotory-surface)) 100%
  );
  padding: 1.35rem 1.2rem 1.25rem;
  box-shadow: 0 12px 30px color-mix(in srgb, var(--flotory-primary) 5%, transparent);
}

@media (min-width: 768px) {
  .showcase-panel {
    padding: 1.5rem 1.35rem 1.35rem;
  }
}

.showcase-panel--accent {
  border-color: color-mix(in srgb, var(--flotory-accent-border) 42%, var(--flotory-border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--flotory-accent-soft) 32%, var(--flotory-surface)) 0%,
    var(--flotory-surface) 100%
  );
}

.showcase-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.showcase-step {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: var(--flotory-accent-active);
}

.showcase-icon {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--flotory-surface-muted) 65%, var(--flotory-surface));
  color: var(--flotory-ink);
}

.showcase-icon--accent {
  background: var(--flotory-accent-soft);
  color: var(--flotory-accent-active);
}

.showcase-title {
  margin-top: 1rem;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--flotory-ink);
}

.showcase-copy {
  margin-top: 0.45rem;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.55;
  color: var(--flotory-ink-muted);
}

.showcase-stat {
  margin-top: auto;
  padding-top: 1rem;
  text-align: center;
}

.showcase-stamp-row {
  display: grid;
  grid-template-columns: repeat(5, 1.15rem);
  justify-content: center;
  gap: 0.32rem;
  margin-bottom: 0.55rem;
}

.showcase-stamp {
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 9999px;
  border: 1.5px solid color-mix(in srgb, var(--flotory-border) 90%, transparent);
}

.showcase-stamp--filled {
  border-color: var(--flotory-accent);
  background: var(--flotory-accent);
}

.showcase-stamp--reward {
  display: grid;
  place-items: center;
  width: 1.15rem;
  height: 1.15rem;
  border-color: color-mix(in srgb, var(--flotory-accent-border) 55%, var(--flotory-border));
  background: color-mix(in srgb, var(--flotory-accent-soft) 55%, var(--flotory-surface));
  color: color-mix(in srgb, var(--flotory-accent-active) 65%, var(--flotory-ink-muted));
}

.showcase-stamp--reward-reached {
  border-color: color-mix(in srgb, var(--flotory-accent-border) 70%, var(--flotory-border));
  background: var(--flotory-accent-soft);
  color: var(--flotory-accent-active);
}

.showcase-nfc-pulse {
  position: relative;
  width: 2.5rem;
  height: 2.5rem;
  margin: 0 0 0.5rem;
  margin-inline: auto;
}

.showcase-nfc-ring {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  border: 2px solid color-mix(in srgb, var(--flotory-accent) 50%, transparent);
  animation: showcase-nfc-ring 2.4s ease-out infinite;
}

.showcase-nfc-core {
  position: absolute;
  inset: 0.5rem;
  border-radius: 9999px;
  background: var(--flotory-accent);
  opacity: 0.88;
}

.showcase-stat-value {
  font-size: 1.35rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--flotory-ink);
}

.showcase-stat-label {
  margin-top: 0.15rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--flotory-ink-muted);
}

.showcase-metrics {
  margin-top: auto;
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  padding-left: 0;
  margin-bottom: 0;
}

.showcase-metric {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-radius: 0.85rem;
  border: 1px solid color-mix(in srgb, var(--flotory-border) 65%, transparent);
  background: color-mix(in srgb, var(--flotory-surface-elevated, var(--flotory-surface)) 88%, var(--flotory-surface));
  padding: 0.5rem 0.6rem;
}

.showcase-metric-icon {
  display: grid;
  place-items: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 0.55rem;
  background: var(--flotory-accent-soft);
  color: var(--flotory-accent-active);
  flex-shrink: 0;
}

.showcase-metric-copy {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.showcase-metric-value {
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--flotory-ink);
}

.showcase-metric-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--flotory-ink-muted);
}

.showcase-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--flotory-accent-active);
  opacity: 0.75;
}

.showcase-connector-icon--mobile {
  transform: rotate(90deg);
}

.showcase-connector-icon--desktop {
  display: none;
}

@media (min-width: 768px) {
  .showcase-connector-icon--mobile {
    display: none;
  }

  .showcase-connector-icon--desktop {
    display: block;
  }
}

@keyframes showcase-nfc-ring {
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
  .showcase-nfc-ring {
    animation: none;
    opacity: 0.35;
  }
}
</style>
