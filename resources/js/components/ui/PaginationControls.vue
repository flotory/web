<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'

defineProps<{
  page: number
  lastPage: number
  showPageLabel?: boolean
}>()

const emit = defineEmits<{
  'update:page': [value: number]
}>()
</script>

<template>
  <div v-if="lastPage > 1" class="flex items-center justify-center gap-2">
    <AppButton
      variant="ghost"
      size="sm"
      :disabled="page <= 1"
      @click="emit('update:page', page - 1)"
    >
      Previous
    </AppButton>
    <span v-if="showPageLabel" class="text-sm font-semibold text-ink-muted">Page {{ page }} of {{ lastPage }}</span>
    <AppButton
      variant="ghost"
      size="sm"
      :disabled="page >= lastPage"
      @click="emit('update:page', page + 1)"
    >
      Next
    </AppButton>
  </div>
</template>
