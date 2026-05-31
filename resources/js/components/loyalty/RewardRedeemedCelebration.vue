<script setup lang="ts">
defineProps<{
  visible: boolean
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <Transition name="celebrate">
    <div
      v-if="visible"
      class="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 px-6 backdrop-blur-[2px]"
      aria-live="polite"
    >
      <div class="celebrate-card relative rounded-[2rem] bg-white px-8 py-7 text-center shadow-2xl ring-1 ring-emerald-200">
        <div class="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100 text-4xl">✓</div>
        <p class="mt-4 text-xl font-black text-slate-950">Reward used!</p>
        <p v-if="title" class="mt-1 text-sm font-semibold text-slate-700">{{ title }}</p>
        <p v-if="subtitle" class="mt-2 text-sm font-medium text-slate-500">{{ subtitle }}</p>
        <div class="celebrate-sparkles" aria-hidden="true">
          <span v-for="index in 6" :key="index" class="celebrate-sparkle">★</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes celebrate-card {
  0% {
    opacity: 0;
    transform: scale(0.82) translateY(12px);
  }

  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes celebrate-sparkle {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.4);
  }

  35% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.1);
  }
}

.celebrate-card {
  animation: celebrate-card 0.45s ease-out;
}

.celebrate-sparkles {
  position: absolute;
  inset: 0;
}

.celebrate-sparkle {
  position: absolute;
  left: 50%;
  top: 50%;
  color: rgb(52 211 153);
  font-size: 1rem;
  animation: celebrate-sparkle 0.9s ease-out forwards;
}

.celebrate-sparkle:nth-child(1) {
  --x: -72px;
  --y: -28px;
  animation-delay: 0.05s;
}

.celebrate-sparkle:nth-child(2) {
  --x: 72px;
  --y: -24px;
  animation-delay: 0.1s;
}

.celebrate-sparkle:nth-child(3) {
  --x: -56px;
  --y: 36px;
  animation-delay: 0.15s;
}

.celebrate-sparkle:nth-child(4) {
  --x: 58px;
  --y: 34px;
  animation-delay: 0.2s;
}

.celebrate-sparkle:nth-child(5) {
  --x: 0px;
  --y: -56px;
  animation-delay: 0.08s;
}

.celebrate-sparkle:nth-child(6) {
  --x: 0px;
  --y: 56px;
  animation-delay: 0.12s;
}

.celebrate-enter-active,
.celebrate-leave-active {
  transition: opacity 0.25s ease;
}

.celebrate-enter-from,
.celebrate-leave-to {
  opacity: 0;
}
</style>
