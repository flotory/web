<script setup lang="ts">
import { cn } from '@/lib/utils'

import { formTextareaClass } from '@/lib/authForm'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    id?: string
    rows?: number
  }>(),
  {
    modelValue: '',
    rows: 4,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <textarea
    :id="id"
    :rows="rows"
    :class="cn(formTextareaClass, $attrs.class)"
    :value="modelValue ?? ''"
    v-bind="{ ...$attrs, class: undefined }"
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
