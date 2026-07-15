<script setup lang="ts">
import { cn } from '@/lib/utils'

import { formFieldClass, formFieldClassSm } from '@/lib/authForm'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    compact?: boolean
    id?: string
    type?: string
  }>(),
  {
    modelValue: '',
    compact: false,
    type: 'text',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputClass = props.compact ? formFieldClassSm : formFieldClass
</script>

<template>
  <input
    :id="id"
    :type="type"
    :class="cn(inputClass, $attrs.class)"
    :value="modelValue ?? ''"
    v-bind="{ ...$attrs, class: undefined }"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
