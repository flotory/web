<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  landingBenefitsMaxIndex,
  landingBenefitsSlidesPerView,
  landingOwnerBenefits,
  type LandingBenefit,
} from '@/lib/landingBenefits'

const props = withDefaults(
  defineProps<{
    benefits?: LandingBenefit[]
  }>(),
  {
    benefits: () => landingOwnerBenefits,
  },
)

const viewportRef = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
const slidesPerView = ref(1)
const isDragging = ref(false)

let dragStartX = 0
let dragStartScrollLeft = 0
let resizeObserver: ResizeObserver | null = null

const maxIndex = computed(() => landingBenefitsMaxIndex(props.benefits.length, slidesPerView.value))

const pageCount = computed(() => maxIndex.value + 1)

const canGoPrev = computed(() => activeIndex.value > 0)
const canGoNext = computed(() => activeIndex.value < maxIndex.value)

function updateSlidesPerView() {
  const width = viewportRef.value?.clientWidth ?? window.innerWidth
  slidesPerView.value = landingBenefitsSlidesPerView(width)
  activeIndex.value = Math.min(activeIndex.value, maxIndex.value)
}

function scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth') {
  const viewport = viewportRef.value
  if (!viewport || viewport.children.length === 0) {
    return
  }

  const clamped = Math.max(0, Math.min(index, maxIndex.value))
  const slide = viewport.children[clamped] as HTMLElement | undefined

  if (!slide) {
    return
  }

  activeIndex.value = clamped
  viewport.scrollTo({
    left: slide.offsetLeft,
    behavior,
  })
}

function goPrev() {
  scrollToIndex(activeIndex.value - 1)
}

function goNext() {
  scrollToIndex(activeIndex.value + 1)
}

function syncIndexFromScroll() {
  const viewport = viewportRef.value
  if (!viewport || viewport.children.length === 0) {
    return
  }

  const scrollLeft = viewport.scrollLeft
  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index <= maxIndex.value; index += 1) {
    const slide = viewport.children[index] as HTMLElement
    const distance = Math.abs(slide.offsetLeft - scrollLeft)

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  }

  activeIndex.value = nearestIndex
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goPrev()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    goNext()
  } else if (event.key === 'Home') {
    event.preventDefault()
    scrollToIndex(0)
  } else if (event.key === 'End') {
    event.preventDefault()
    scrollToIndex(maxIndex.value)
  }
}

function onPointerDown(event: PointerEvent) {
  const viewport = viewportRef.value
  if (!viewport || event.button !== 0) {
    return
  }

  isDragging.value = true
  dragStartX = event.clientX
  dragStartScrollLeft = viewport.scrollLeft
  viewport.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  const viewport = viewportRef.value
  if (!viewport || !isDragging.value) {
    return
  }

  const delta = event.clientX - dragStartX
  viewport.scrollLeft = dragStartScrollLeft - delta
}

function endDrag(event: PointerEvent) {
  const viewport = viewportRef.value
  if (!viewport || !isDragging.value) {
    return
  }

  isDragging.value = false

  if (viewport.hasPointerCapture(event.pointerId)) {
    viewport.releasePointerCapture(event.pointerId)
  }

  syncIndexFromScroll()
  scrollToIndex(activeIndex.value)
}

watch(slidesPerView, () => {
  scrollToIndex(activeIndex.value, 'auto')
})

onMounted(() => {
  updateSlidesPerView()

  resizeObserver = new ResizeObserver(() => {
    updateSlidesPerView()
    scrollToIndex(activeIndex.value, 'auto')
  })

  if (viewportRef.value) {
    resizeObserver.observe(viewportRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <section
    class="landing-benefits-carousel"
    data-testid="landing-benefits-carousel"
    aria-roledescription="carousel"
    aria-label="Platform benefits for venue owners"
  >
    <div class="landing-benefits-controls">
      <button
        type="button"
        class="landing-benefits-nav"
        :disabled="!canGoPrev"
        aria-label="Show previous benefits"
        @click="goPrev"
      >
        <ChevronLeft class="size-5" stroke-width="2.25" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="landing-benefits-nav"
        :disabled="!canGoNext"
        aria-label="Show next benefits"
        @click="goNext"
      >
        <ChevronRight class="size-5" stroke-width="2.25" aria-hidden="true" />
      </button>
    </div>

    <div
      ref="viewportRef"
      class="landing-benefits-viewport"
      :class="{ 'is-dragging': isDragging }"
      tabindex="0"
      role="group"
      aria-label="Benefit cards"
      @keydown="onKeydown"
      @scroll.passive="syncIndexFromScroll"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
    >
      <article
        v-for="(benefit, index) in benefits"
        :key="benefit.id"
        class="landing-benefit-slide"
        :aria-hidden="index < activeIndex || index > activeIndex + slidesPerView - 1"
      >
        <div
          :id="`landing-benefit-${benefit.id}`"
          class="feature-card"
          :data-testid="`landing-benefit-${benefit.id}`"
        >
          <div class="feature-icon">
            <component :is="benefit.icon" :size="24" :stroke-width="2.2" aria-hidden="true" />
          </div>
          <h2 class="mt-5 text-lg font-bold text-ink sm:text-xl">{{ benefit.title }}</h2>
          <p class="mt-2 flex-1 text-sm leading-7 text-ink-muted sm:text-base sm:leading-7">{{ benefit.copy }}</p>
        </div>
      </article>
    </div>

    <div
      class="landing-benefits-dots"
      role="tablist"
      aria-label="Choose benefit slide"
    >
      <button
        v-for="index in pageCount"
        :key="index - 1"
        type="button"
        role="tab"
        class="landing-benefits-dot"
        :class="{ 'is-active': activeIndex === index - 1 }"
        :aria-selected="activeIndex === index - 1"
        :aria-controls="`landing-benefit-${benefits[Math.min(index - 1, benefits.length - 1)]?.id}`"
        :aria-label="`Go to benefit slide ${index} of ${pageCount}`"
        @click="scrollToIndex(index - 1)"
      />
    </div>
  </section>
</template>

<style scoped>
.landing-benefits-carousel {
  position: relative;
}

.landing-benefits-controls {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}

.landing-benefits-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, var(--flotory-border) 75%, transparent);
  background: color-mix(in srgb, var(--flotory-surface) 92%, transparent);
  color: var(--flotory-ink-muted);
  transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.landing-benefits-nav:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--flotory-accent-border) 45%, var(--flotory-border));
  background: var(--flotory-surface-muted);
  color: var(--flotory-ink);
}

.landing-benefits-nav:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--flotory-accent) 55%, transparent);
  outline-offset: 2px;
}

.landing-benefits-nav:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.landing-benefits-viewport {
  display: flex;
  align-items: stretch;
  gap: 1.25rem;
  overflow-x: auto;
  overflow-y: visible;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  cursor: grab;
  padding: 0.35rem 0.85rem 0.5rem;
  margin: -0.35rem -0.85rem -0.5rem;
  scroll-padding-inline: 0.85rem;
}

.landing-benefits-viewport::-webkit-scrollbar {
  display: none;
}

.landing-benefits-viewport.is-dragging {
  cursor: grabbing;
  scroll-snap-type: none;
  scroll-behavior: auto;
}

.landing-benefits-viewport:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--flotory-accent) 55%, transparent);
  outline-offset: 4px;
  border-radius: 1rem;
}

.landing-benefit-slide {
  display: flex;
  flex: 0 0 100%;
  min-width: 0;
  padding: 0.2rem 0.1rem 0.35rem;
  box-sizing: border-box;
  scroll-snap-align: start;
}

@media (min-width: 768px) {
  .landing-benefit-slide {
    flex-basis: calc((100% - 1.25rem) / 2);
  }
}

@media (min-width: 1024px) {
  .landing-benefit-slide {
    flex-basis: calc((100% - 2.5rem) / 3);
  }
}

.feature-card {
  display: flex;
  width: 100%;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  min-height: 16.75rem;
  border-radius: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--flotory-accent-border) 24%, var(--flotory-border));
  background:
    radial-gradient(ellipse 115% 70% at 50% -18%, color-mix(in srgb, var(--flotory-accent-soft) 52%, transparent), transparent 58%),
    linear-gradient(
      168deg,
      color-mix(in srgb, var(--flotory-surface) 99%, white) 0%,
      color-mix(in srgb, var(--flotory-surface-muted) 42%, var(--flotory-surface)) 100%
    );
  padding: 1.75rem 1.5rem;
}

@media (min-width: 768px) {
  .feature-card {
    min-height: 15.75rem;
    padding: 2rem 1.75rem;
  }
}

.feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
  background: var(--flotory-accent-soft);
  color: var(--flotory-accent-active);
}

.landing-benefits-dots {
  display: flex;
  justify-content: center;
  gap: 0.45rem;
  margin-top: 1.15rem;
}

.landing-benefits-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  border: none;
  background: color-mix(in srgb, var(--flotory-ink-soft) 45%, transparent);
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.landing-benefits-dot.is-active {
  transform: scale(1.15);
  background: var(--flotory-accent-active);
}

.landing-benefits-dot:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--flotory-accent) 55%, transparent);
  outline-offset: 2px;
}
</style>
