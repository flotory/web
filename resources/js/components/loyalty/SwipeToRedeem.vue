<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    state?: 'locked' | 'available' | 'redeeming' | 'redeemed'
    theme?: 'dark' | 'light'
    lockedLabel?: string
    availableLabel?: string
    redeemingLabel?: string
    redeemedLabel?: string
  }>(),
  {
    disabled: false,
    state: 'available',
    theme: 'dark',
    lockedLabel: 'Reward locked',
    availableLabel: 'Swipe to redeem',
    redeemingLabel: 'Redeeming...',
    redeemedLabel: 'Redeemed',
  },
)

const emit = defineEmits<{
  confirm: []
}>()

const track = ref<HTMLElement | null>(null)
const dragging = ref(false)
const startX = ref(0)
const dragX = ref(0)

const maxDrag = computed(() => Math.max((track.value?.clientWidth ?? 0) - 60, 0))
const progress = computed(() => (maxDrag.value ? dragX.value / maxDrag.value : 0))
const isInteractive = computed(() => props.state === 'available' && !props.disabled)
const isLight = computed(() => props.theme === 'light')

const label = computed(() => {
  if (props.state === 'locked') return props.lockedLabel
  if (props.state === 'redeeming') return props.redeemingLabel
  if (props.state === 'redeemed') return props.redeemedLabel
  return props.availableLabel
})

function startDrag(event: PointerEvent) {
  if (!isInteractive.value) return

  dragging.value = true
  startX.value = event.clientX - dragX.value
  event.currentTarget instanceof HTMLElement && event.currentTarget.setPointerCapture(event.pointerId)
}

function moveDrag(event: PointerEvent) {
  if (!dragging.value || !isInteractive.value) return

  const nextX = event.clientX - startX.value
  dragX.value = Math.min(Math.max(nextX, 0), maxDrag.value)
}

function endDrag() {
  if (!dragging.value) return

  dragging.value = false

  if (progress.value >= 0.82) {
    dragX.value = maxDrag.value
    emit('confirm')
    return
  }

  dragX.value = 0
}
</script>

<template>
  <div
    ref="track"
    :class="[
      'relative h-16 overflow-hidden rounded-full p-1.5 shadow-inner',
      isLight ? 'bg-slate-950 ring-1 ring-slate-950' : 'bg-white/15 ring-1 ring-white/20',
      !isInteractive && 'opacity-80',
    ]"
  >
    <div
      :class="[
        'absolute inset-y-1.5 left-1.5 rounded-full transition-[width]',
        isLight ? 'bg-white/15' : 'bg-white/20',
      ]"
      :style="{ width: `${Math.max(progress * 100, state === 'redeemed' ? 100 : 0)}%` }"
    />
    <p
      :class="[
        'absolute inset-0 grid place-items-center pr-3 text-sm font-black uppercase tracking-[0.18em]',
        isLight ? 'text-white/80' : 'text-white/75',
      ]"
    >
      {{ label }}
    </p>
    <button
      type="button"
      class="absolute left-1.5 top-1.5 grid size-12 touch-none place-items-center rounded-full bg-white text-2xl font-black text-slate-950 shadow-2xl transition-transform"
      :class="dragging ? 'duration-0' : 'duration-300'"
      :style="{ transform: `translateX(${state === 'redeemed' ? maxDrag : dragX}px)` }"
      :disabled="!isInteractive"
      @pointerdown="startDrag"
      @pointermove="moveDrag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
    >
      <span v-if="state === 'redeemed'">✓</span>
      <span v-else>›</span>
    </button>
  </div>
</template>
