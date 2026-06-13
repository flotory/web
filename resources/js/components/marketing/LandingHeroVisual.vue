<script setup lang="ts">
import backgroundSrc from '../../../images/marketing/hero-cafe-background.png'
import phoneSrc from '../../../images/marketing/hero-hand-phone-long.png'
import progressCardSrc from '../../../images/marketing/hero-progress-card.png'
import standSrc from '../../../images/marketing/hero-nfc-stand.png'

/** Full tap loop duration — keep FX layers on the same timing */
const TAP_CYCLE_S = 3.4
</script>

<template>
  <div class="hero-visual" aria-hidden="true">
    <div class="hero-visual-frame">
      <div
        class="hero-stage"
        :style="{ '--tap-cycle': `${TAP_CYCLE_S}s` }"
      >
        <img
          :src="backgroundSrc"
          alt=""
          class="hero-background"
          tabindex="-1"
        >

        <img
          :src="standSrc"
          alt=""
          class="hero-layer hero-stand"
        >

        <img
          :src="phoneSrc"
          alt=""
          class="hero-layer hero-phone"
        >

        <img
          :src="progressCardSrc"
          alt=""
          class="hero-layer hero-progress-card"
        >

        <div class="hero-fx hero-fx--bridge">
          <span class="bridge-wave bridge-wave--1" />
          <span class="bridge-wave bridge-wave--2" />
          <span class="bridge-wave bridge-wave--3" />
        </div>

        <div class="hero-fx hero-fx--contact">
          <span class="contact-flash" />
        </div>

        <div class="hero-fx hero-fx--tap">
          <span class="tap-ring tap-ring--1" />
          <span class="tap-ring tap-ring--2" />
        </div>

        <div class="hero-fx hero-fx--sparkles">
          <span class="sparkle sparkle--1" />
          <span class="sparkle sparkle--2" />
          <span class="sparkle sparkle--3" />
          <span class="sparkle sparkle--4" />
        </div>
      </div>
    </div>

    <img
      :src="phoneSrc"
      alt="Guest taps phone on Flotory NFC stand at the cafe counter"
      class="sr-only"
    >
  </div>
</template>

<style scoped>
.hero-visual {
  width: 100%;
}

.hero-visual-frame {
  overflow: hidden;
  border-radius: 2rem;
  border: 1px solid color-mix(in srgb, var(--flotory-accent-border) 30%, var(--flotory-border));
  background: linear-gradient(
    165deg,
    var(--flotory-surface) 0%,
    color-mix(in srgb, var(--flotory-surface-muted) 50%, var(--flotory-surface)) 100%
  );
  padding: 0.7rem;
  box-shadow:
    0 20px 44px color-mix(in srgb, var(--flotory-primary) 10%, transparent),
    0 8px 22px color-mix(in srgb, var(--flotory-accent) 14%, transparent);
}

.hero-stage {
  --tap-cycle: 3.4s;
  position: relative;
  aspect-ratio: 1024 / 682;
  overflow: hidden;
  border-radius: 1.5rem;
  isolation: isolate;
}

.hero-background {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  inset: 0;
  z-index: 0;
}

.hero-layer {
  position: absolute;
  display: block;
  height: auto;
  will-change: transform;
}

.hero-stand {
  z-index: 2;
  right: 10%;
  bottom: 7%;
  width: 34%;
  transform-origin: 50% 70%;
  animation: stand-tap-react var(--tap-cycle) cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.hero-phone {
  z-index: 3;
  left: -12%;
  bottom: -56%;
  width: 57%;
  transform-origin: 82% 26%;
  animation: phone-tap-cycle var(--tap-cycle) ease-in-out infinite;
}

.hero-progress-card {
  z-index: 1;
  left: 36%;
  top: 8%;
  width: 25%;
  transform-origin: 50% 100%;
  animation: rewards-on-tap var(--tap-cycle) ease-in-out infinite;
}

.hero-fx {
  position: absolute;
  pointer-events: none;
}

.hero-fx--bridge {
  z-index: 5;
  left: 37%;
  top: 43%;
  width: 26%;
  height: 22%;
}

.bridge-wave {
  position: absolute;
  left: 0;
  bottom: 8%;
  width: 100%;
  height: 72%;
  border: 2.5px solid transparent;
  border-top-color: color-mix(in srgb, var(--flotory-accent) 85%, white);
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  opacity: 0;
  transform-origin: 0% 100%;
  animation: bridge-wave-burst var(--tap-cycle) ease-out infinite;
}

.bridge-wave--2 {
  animation-delay: calc(var(--tap-cycle) * 0.02);
}

.bridge-wave--3 {
  animation-delay: calc(var(--tap-cycle) * 0.04);
}

.hero-fx--contact {
  z-index: 6;
  left: 59%;
  top: 48%;
  width: 7%;
  height: 10%;
}

.contact-flash {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--flotory-accent) 75%, white) 0%,
    transparent 68%
  );
  opacity: 0;
  animation: contact-flash var(--tap-cycle) ease-out infinite;
}

.hero-fx--tap {
  z-index: 6;
  left: 63%;
  top: 43%;
  width: 11%;
  height: 17%;
}

.tap-ring {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  border: 2px solid color-mix(in srgb, var(--flotory-accent) 70%, transparent);
  opacity: 0;
  animation: tap-ring-burst var(--tap-cycle) ease-out infinite;
}

.tap-ring--2 {
  animation-delay: calc(var(--tap-cycle) * 0.035);
}

.hero-fx--sparkles {
  inset: 0;
  z-index: 7;
}

.sparkle {
  position: absolute;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 9999px;
  background: var(--flotory-accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--flotory-accent) 80%, transparent);
  opacity: 0;
  animation: sparkle-on-tap var(--tap-cycle) ease-in-out infinite;
}

.sparkle--1 {
  left: 43%;
  top: 8%;
}

.sparkle--2 {
  left: 57%;
  top: 10%;
  animation-delay: calc(var(--tap-cycle) * 0.02);
}

.sparkle--3 {
  left: 48%;
  top: 25%;
  animation-delay: calc(var(--tap-cycle) * 0.04);
}

.sparkle--4 {
  left: 62%;
  top: 21%;
  animation-delay: calc(var(--tap-cycle) * 0.06);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Phone: one fluid reach → tap → return, with a tiny recoil at contact. */
@keyframes phone-tap-cycle {
  0%,
  16% {
    transform: translate3d(0%, 0%, 0) rotate(-6deg) scale(1);
    animation-timing-function: cubic-bezier(0.32, 0, 0.18, 1);
  }

  42% {
    transform: translate3d(34%, -3%, 0) rotate(-1deg) scale(1.01);
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }

  47% {
    transform: translate3d(31%, -2.5%, 0) rotate(-2.5deg) scale(1.006);
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  68% {
    transform: translate3d(0%, 0%, 0) rotate(-6deg) scale(1);
  }

  100% {
    transform: translate3d(0%, 0%, 0) rotate(-6deg) scale(1);
  }
}

@keyframes stand-tap-react {
  0%,
  44% {
    transform: scale(1);
    filter: brightness(1);
  }

  48% {
    transform: scale(1.025);
    filter: brightness(1.12);
  }

  52% {
    transform: scale(0.992);
    filter: brightness(1.04);
  }

  58%,
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}

@keyframes rewards-on-tap {
  0%,
  44% {
    transform: translateY(0) rotate(-2deg) scale(1);
  }

  48% {
    transform: translateY(-12px) rotate(-2deg) scale(1.05);
  }

  56% {
    transform: translateY(-8px) rotate(-2deg) scale(1.02);
  }

  68%,
  100% {
    transform: translateY(0) rotate(-2deg) scale(1);
  }
}

@keyframes bridge-wave-burst {
  0%,
  42% {
    opacity: 0;
    transform: scale(0.35) rotate(-6deg);
  }

  46% {
    opacity: 0.95;
    transform: scale(0.55) rotate(-2deg);
  }

  54% {
    opacity: 0;
    transform: scale(1.05) rotate(2deg);
  }

  100% {
    opacity: 0;
    transform: scale(1.05) rotate(2deg);
  }
}

@keyframes contact-flash {
  0%,
  45% {
    opacity: 0;
    transform: scale(0.4);
  }

  48% {
    opacity: 0.9;
    transform: scale(1);
  }

  54% {
    opacity: 0;
    transform: scale(1.45);
  }

  100% {
    opacity: 0;
    transform: scale(1.45);
  }
}

@keyframes tap-ring-burst {
  0%,
  44% {
    opacity: 0;
    transform: scale(0.5);
  }

  47% {
    opacity: 0.85;
    transform: scale(0.72);
  }

  56% {
    opacity: 0;
    transform: scale(1.5);
  }

  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

@keyframes sparkle-on-tap {
  0%,
  44% {
    opacity: 0;
    transform: scale(0.4);
  }

  48% {
    opacity: 1;
    transform: scale(1.15);
  }

  58% {
    opacity: 0;
    transform: scale(0.7) translateY(-6px);
  }

  100% {
    opacity: 0;
    transform: scale(0.4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-layer--rewards,
  .hero-layer--phone,
  .hero-layer--stand,
  .bridge-wave,
  .contact-flash,
  .tap-ring,
  .sparkle {
    animation: none;
  }
}
</style>
