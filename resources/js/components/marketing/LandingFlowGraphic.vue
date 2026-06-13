<script setup lang="ts">
import { BarChart3, Nfc, Smartphone } from '@lucide/vue'
</script>

<template>
  <div class="loop-graphic" aria-hidden="true">
    <div class="loop-panel loop-panel--guest">
      <div class="loop-panel-icon">
        <Smartphone :size="24" :stroke-width="2.2" />
      </div>
      <p class="loop-panel-label">Guest app</p>
      <div class="stamp-row">
        <span v-for="n in 6" :key="n" class="stamp-dot" :class="{ 'stamp-dot--filled': n <= 4 }" />
      </div>
      <p class="loop-panel-meta">4 / 6 stamps</p>
    </div>

    <div class="loop-connector loop-connector--left" />

    <div class="loop-panel loop-panel--nfc">
      <div class="loop-panel-icon loop-panel-icon--accent">
        <Nfc :size="24" :stroke-width="2.2" />
      </div>
      <p class="loop-panel-label">Counter tap</p>
      <div class="nfc-pulse">
        <span class="nfc-pulse-ring" />
        <span class="nfc-pulse-core" />
      </div>
      <p class="loop-panel-meta">NFC stand</p>
    </div>

    <div class="loop-connector loop-connector--right" />

    <div class="loop-panel loop-panel--owner">
      <div class="loop-panel-icon">
        <BarChart3 :size="24" :stroke-width="2.2" />
      </div>
      <p class="loop-panel-label">Owner view</p>
      <div class="metric-bars">
        <span class="metric-bar metric-bar--1" />
        <span class="metric-bar metric-bar--2" />
        <span class="metric-bar metric-bar--3" />
      </div>
      <p class="loop-panel-meta">Visits & rewards</p>
    </div>
  </div>
</template>

<style scoped>
.loop-graphic {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: center;
  gap: 0.85rem;
  width: 100%;
  max-width: 52rem;
  margin-inline: auto;
}

.loop-panel {
  border-radius: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--flotory-border) 80%, transparent);
  background: linear-gradient(
    165deg,
    var(--flotory-surface) 0%,
    color-mix(in srgb, var(--flotory-surface-muted) 40%, var(--flotory-surface)) 100%
  );
  padding: 1.5rem 1.15rem;
  text-align: center;
  box-shadow: 0 12px 32px color-mix(in srgb, var(--flotory-primary) 6%, transparent);
}

@media (min-width: 768px) {
  .loop-panel {
    padding: 1.85rem 1.35rem;
  }
}

.loop-panel--nfc {
  border-color: color-mix(in srgb, var(--flotory-accent-border) 45%, var(--flotory-border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--flotory-accent-soft) 35%, var(--flotory-surface)) 0%,
    var(--flotory-surface) 100%
  );
}

.loop-panel-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-inline: auto;
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--flotory-surface-muted) 70%, var(--flotory-surface));
  color: var(--flotory-ink);
}

.loop-panel-icon--accent {
  background: var(--flotory-accent-soft);
  color: var(--flotory-accent-active);
}

.loop-panel-label {
  margin-top: 0.85rem;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--flotory-ink);
}

.loop-panel-meta {
  margin-top: 0.55rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--flotory-ink-muted);
}

.stamp-row {
  display: flex;
  justify-content: center;
  gap: 0.3rem;
  margin-top: 0.7rem;
}

.stamp-dot {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 9999px;
  border: 1.5px solid color-mix(in srgb, var(--flotory-border) 90%, transparent);
  background: transparent;
}

.stamp-dot--filled {
  border-color: var(--flotory-accent);
  background: var(--flotory-accent);
}

.nfc-pulse {
  position: relative;
  width: 3rem;
  height: 3rem;
  margin: 0.85rem auto 0;
}

.nfc-pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  border: 2px solid color-mix(in srgb, var(--flotory-accent) 50%, transparent);
  animation: nfc-ring 2.4s ease-out infinite;
}

.nfc-pulse-core {
  position: absolute;
  inset: 0.55rem;
  border-radius: 9999px;
  background: var(--flotory-accent);
  opacity: 0.85;
}

.metric-bars {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.4rem;
  height: 2.75rem;
  margin-top: 0.85rem;
}

.metric-bar {
  width: 0.55rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--flotory-accent) 75%, var(--flotory-ink-muted));
}

.metric-bar--1 {
  height: 45%;
}

.metric-bar--2 {
  height: 80%;
}

.metric-bar--3 {
  height: 60%;
}

.loop-connector {
  width: 1.75rem;
  height: 2px;
  border-radius: 9999px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--flotory-border) 50%, transparent),
    var(--flotory-accent),
    color-mix(in srgb, var(--flotory-border) 50%, transparent)
  );
}

@keyframes nfc-ring {
  0% {
    transform: scale(0.75);
    opacity: 0.9;
  }
  100% {
    transform: scale(1.45);
    opacity: 0;
  }
}

@media (max-width: 640px) {
  .loop-graphic {
    grid-template-columns: 1fr;
    gap: 0.85rem;
    max-width: 16rem;
  }

  .loop-connector {
    width: 2px;
    height: 1.25rem;
    margin-inline: auto;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--flotory-border) 50%, transparent),
      var(--flotory-accent),
      color-mix(in srgb, var(--flotory-border) 50%, transparent)
    );
  }
}

@media (prefers-reduced-motion: reduce) {
  .nfc-pulse-ring {
    animation: none;
    opacity: 0.35;
  }
}
</style>
