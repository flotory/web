<script setup lang="ts">
import { Gift, ScanLine, UsersRound } from '@lucide/vue'

import backgroundSrc from '../../../images/marketing/hero-cafe-background.png'
import progressCardSrc from '../../../images/marketing/hero-progress-card.png'
import standSrc from '../../../images/marketing/hero-nfc-stand.png'

const ownerStats = [
  { label: 'Visits this month', value: '128', trend: '↑ 18%', icon: ScanLine },
  { label: 'Active members', value: '42', trend: '↑ 9%', icon: UsersRound },
  { label: 'Rewards claimed', value: '17', trend: null, icon: Gift },
]
</script>

<template>
  <div class="showcase-grid" data-testid="landing-product-showcase">
    <article class="showcase-panel" data-testid="landing-product-panel-guest">
      <p class="showcase-kicker">Guest wallet</p>
      <div class="wallet-scene">
        <img
          :src="progressCardSrc"
          alt=""
          class="wallet-card"
          tabindex="-1"
        >
        <div class="wallet-stamps" aria-hidden="true">
          <span
            v-for="n in 6"
            :key="n"
            class="wallet-stamp"
            :class="{ 'wallet-stamp--filled': n <= 4 }"
          />
        </div>
        <p class="wallet-caption">4 / 6 stamps · reward ready soon</p>
      </div>
    </article>

    <article class="showcase-panel showcase-panel--nfc" data-testid="landing-product-panel-nfc">
      <p class="showcase-kicker">NFC at counter</p>
      <div class="nfc-scene">
        <img
          :src="backgroundSrc"
          alt=""
          class="nfc-background"
          tabindex="-1"
        >
        <img
          :src="standSrc"
          alt=""
          class="nfc-stand"
          tabindex="-1"
        >
        <span class="nfc-glow" aria-hidden="true" />
      </div>
      <p class="showcase-caption">One tap per visit — no staff scanner</p>
    </article>

    <article class="showcase-panel" data-testid="landing-product-panel-owner">
      <p class="showcase-kicker">Owner dashboard</p>
      <div class="owner-stats">
        <div
          v-for="stat in ownerStats"
          :key="stat.label"
          class="owner-stat"
        >
          <div class="owner-stat-icon" aria-hidden="true">
            <component :is="stat.icon" :size="18" :stroke-width="2.2" />
          </div>
          <div class="owner-stat-copy">
            <p class="owner-stat-label">{{ stat.label }}</p>
            <div class="owner-stat-value-row">
              <p class="owner-stat-value">{{ stat.value }}</p>
              <p v-if="stat.trend" class="owner-stat-trend">{{ stat.trend }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="owner-chart" aria-hidden="true">
        <span class="owner-chart-bar owner-chart-bar--1" />
        <span class="owner-chart-bar owner-chart-bar--2" />
        <span class="owner-chart-bar owner-chart-bar--3" />
        <span class="owner-chart-bar owner-chart-bar--4" />
        <span class="owner-chart-bar owner-chart-bar--5" />
      </div>
      <p class="showcase-caption">Visits, members, and rewards in one place</p>
    </article>
  </div>
</template>

<style scoped>
.showcase-grid {
  display: grid;
  gap: 1.25rem;
}

@media (min-width: 768px) {
  .showcase-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.5rem;
  }
}

.showcase-panel {
  display: flex;
  flex-direction: column;
  border-radius: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--flotory-border) 75%, transparent);
  background: linear-gradient(
    165deg,
    var(--flotory-surface) 0%,
    color-mix(in srgb, var(--flotory-surface-muted) 35%, var(--flotory-surface)) 100%
  );
  padding: 1.35rem 1.2rem 1.2rem;
  box-shadow: 0 12px 30px color-mix(in srgb, var(--flotory-primary) 5%, transparent);
}

@media (min-width: 768px) {
  .showcase-panel {
    padding: 1.5rem 1.35rem 1.35rem;
  }
}

.showcase-panel--nfc {
  border-color: color-mix(in srgb, var(--flotory-accent-border) 40%, var(--flotory-border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--flotory-accent-soft) 30%, var(--flotory-surface)) 0%,
    var(--flotory-surface) 100%
  );
}

.showcase-kicker {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--flotory-accent-active);
}

.showcase-caption {
  margin-top: 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.45;
  color: var(--flotory-ink-muted);
}

.wallet-scene {
  margin-top: 0.9rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wallet-card {
  display: block;
  width: min(100%, 11.5rem);
  height: auto;
  filter: drop-shadow(0 10px 18px color-mix(in srgb, var(--flotory-primary) 12%, transparent));
}

.wallet-stamps {
  display: flex;
  justify-content: center;
  gap: 0.35rem;
  margin-top: 0.85rem;
}

.wallet-stamp {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 9999px;
  border: 1.5px solid color-mix(in srgb, var(--flotory-border) 90%, transparent);
}

.wallet-stamp--filled {
  border-color: var(--flotory-accent);
  background: var(--flotory-accent);
}

.wallet-caption {
  margin-top: 0.55rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--flotory-ink-muted);
}

.nfc-scene {
  position: relative;
  margin-top: 0.9rem;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 1.1rem;
  border: 1px solid color-mix(in srgb, var(--flotory-border) 70%, transparent);
}

.nfc-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nfc-stand {
  position: absolute;
  right: 14%;
  bottom: 8%;
  width: 42%;
  height: auto;
  filter: drop-shadow(0 8px 14px color-mix(in srgb, var(--flotory-primary) 18%, transparent));
}

.nfc-glow {
  position: absolute;
  left: 58%;
  top: 52%;
  width: 18%;
  aspect-ratio: 1;
  border-radius: 9999px;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--flotory-accent) 55%, transparent) 0%,
    transparent 72%
  );
  animation: nfc-glow-pulse 2.6s ease-in-out infinite;
}

.owner-stats {
  margin-top: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.owner-stat {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--flotory-border) 65%, transparent);
  background: color-mix(in srgb, var(--flotory-surface-elevated, var(--flotory-surface)) 90%, var(--flotory-surface));
  padding: 0.65rem 0.75rem;
}

.owner-stat-icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.7rem;
  background: var(--flotory-accent-soft);
  color: var(--flotory-accent-active);
  flex-shrink: 0;
}

.owner-stat-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--flotory-ink-muted);
}

.owner-stat-value-row {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
}

.owner-stat-value {
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--flotory-ink);
}

.owner-stat-trend {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--flotory-success, #1f8a4c);
}

.owner-chart {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.4rem;
  height: 3.25rem;
  margin-top: 0.85rem;
  padding-top: 0.35rem;
  border-top: 1px solid color-mix(in srgb, var(--flotory-border) 55%, transparent);
}

.owner-chart-bar {
  width: 0.55rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--flotory-accent) 70%, var(--flotory-ink-muted));
}

.owner-chart-bar--1 { height: 42%; }
.owner-chart-bar--2 { height: 68%; }
.owner-chart-bar--3 { height: 54%; }
.owner-chart-bar--4 { height: 88%; }
.owner-chart-bar--5 { height: 62%; }

@keyframes nfc-glow-pulse {
  0%,
  100% {
    opacity: 0.45;
    transform: scale(0.92);
  }

  50% {
    opacity: 0.95;
    transform: scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nfc-glow {
    animation: none;
    opacity: 0.6;
  }
}
</style>
