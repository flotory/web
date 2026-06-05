<script setup lang="ts">
import { computed, toValue, useAttrs, type MaybeRefOrGetter } from 'vue'

import { useAsyncAction } from '@/composables/useAsyncAction'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    loading?: MaybeRefOrGetter<boolean>
    success?: MaybeRefOrGetter<boolean>
    error?: MaybeRefOrGetter<boolean>
    action?: () => Promise<unknown> | unknown
    idleLabel: string
    loadingLabel?: string
    successLabel?: string
    errorLabel?: string
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    block?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    block: false,
    loadingLabel: undefined,
    successLabel: undefined,
    errorLabel: undefined,
  },
)

const attrs = useAttrs()
const internalAction = props.action ? useAsyncAction() : null

const isLoading = computed(() => (internalAction ? internalAction.loading.value : Boolean(toValue(props.loading))))
const isSuccess = computed(() => (internalAction ? internalAction.success.value : Boolean(toValue(props.success))))
const isError = computed(() => (internalAction ? internalAction.error.value : Boolean(toValue(props.error))))

const resolvedLoadingLabel = computed(() => props.loadingLabel ?? defaultLoadingLabel(props.idleLabel))
const resolvedSuccessLabel = computed(() => props.successLabel ?? defaultSuccessLabel(props.idleLabel))
const resolvedErrorLabel = computed(() => props.errorLabel ?? 'Failed')

const displayLabel = computed(() => {
  if (isLoading.value) return resolvedLoadingLabel.value
  if (isSuccess.value) return resolvedSuccessLabel.value
  if (isError.value) return resolvedErrorLabel.value
  return props.idleLabel
})

const widthAnchor = computed(() => {
  const labels = [
    props.idleLabel,
    resolvedLoadingLabel.value,
    resolvedSuccessLabel.value,
    resolvedErrorLabel.value,
  ]

  return labels.reduce((longest, label) => (label.length > longest.length ? label : longest), '')
})

const isBusy = computed(() => isLoading.value || isSuccess.value)

const classes = computed(() =>
  cn(
    'inline-grid cursor-pointer rounded-full font-semibold transition-[color,background-color,box-shadow,opacity] duration-500 ease-in-out disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50',
    props.block && 'w-full',
    {
      primary: 'bg-primary text-primary-text shadow-lg shadow-primary/15 hover:bg-primary-soft',
      secondary: 'bg-surface text-ink ring-1 ring-border hover:bg-surface-muted',
      ghost: 'bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
    }[props.variant],
    {
      sm: 'min-h-9 px-4 text-sm',
      md: 'min-h-11 px-5 text-sm',
      lg: 'min-h-12 px-6 text-base',
    }[props.size],
    isSuccess.value && props.variant === 'primary' && 'bg-primary-soft ring-1 ring-success/25',
    isError.value && 'ring-1 ring-danger/30',
    attrs.class as string | undefined,
  ),
)

function defaultLoadingLabel(idle: string): string {
  const lower = idle.toLowerCase()

  if (lower.includes('resend')) return 'Sending…'
  if (lower.includes('invite')) return 'Sending…'
  if (lower.includes('join')) return 'Joining…'
  if (lower.includes('create')) return 'Creating…'
  if (lower.includes('publish')) return 'Publishing…'
  if (lower.includes('update') || lower.includes('save')) return 'Saving…'
  if (lower.includes('redeem')) return 'Redeeming…'

  return 'Working…'
}

function defaultSuccessLabel(idle: string): string {
  const lower = idle.toLowerCase()

  if (lower.includes('resend')) return 'Sent ✓'
  if (lower.includes('invite')) return 'Sent ✓'
  if (lower.includes('join')) return 'Joined ✓'
  if (lower.includes('create')) return 'Created ✓'
  if (lower.includes('publish')) return 'Published ✓'
  if (lower.includes('redeem')) return 'Redeemed ✓'

  return 'Saved ✓'
}

async function handleClick(event: MouseEvent) {
  if (!props.action) return

  if (props.type === 'submit') {
    event.preventDefault()
  }

  if (isBusy.value || props.disabled) return

  try {
    await internalAction!.run(async () => {
      await props.action!()
    })
  } catch {
    // Button shows the error state; callers handle inline field errors separately.
  }
}
</script>

<template>
  <button
    :type="action ? 'button' : type"
    :class="classes"
    :disabled="disabled || isBusy"
    :aria-busy="isLoading"
    :aria-live="isSuccess || isError ? 'polite' : undefined"
    v-bind="{ ...attrs, class: undefined }"
    @click="action ? handleClick($event) : undefined"
  >
    <span class="invisible col-start-1 row-start-1 whitespace-nowrap px-0" aria-hidden="true">
      {{ widthAnchor }}
    </span>
    <span class="relative col-start-1 row-start-1 inline-flex min-h-[1.25em] items-center justify-center overflow-hidden">
      <Transition name="async-action-label">
        <span :key="displayLabel" class="inline-flex items-center justify-center whitespace-nowrap">
          {{ displayLabel }}
        </span>
      </Transition>
    </span>
  </button>
</template>

<style scoped>
.async-action-label-leave-active {
  transition: opacity 150ms ease-in;
  position: absolute;
  inset: 0;
  justify-content: center;
}

.async-action-label-enter-active {
  transition: opacity 280ms ease-out;
}

.async-action-label-enter-from,
.async-action-label-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .async-action-label-enter-active,
  .async-action-label-leave-active {
    transition: none;
  }
}
</style>
