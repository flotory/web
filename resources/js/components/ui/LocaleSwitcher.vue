<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useLocaleSwitcher } from '@/composables/useLocaleSwitcher'
import { localeOptions, type AppLocale } from '@/i18n'
import { useLocaleStore } from '@/stores/locale'

withDefaults(
  defineProps<{
    id?: string
    wrapperClass?: string
  }>(),
  {
    id: 'locale-switcher',
    wrapperClass: '',
  },
)

const { t } = useI18n()
const localeStore = useLocaleStore()
const { loading, setAppLocale } = useLocaleSwitcher()

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)

const activeOption = computed(() => localeOptions.find((option) => option.value === localeStore.locale))

function toggleOpen() {
  if (loading.value) {
    return
  }

  open.value = !open.value
}

function close() {
  open.value = false
}

async function selectLocale(locale: AppLocale) {
  close()
  await setAppLocale(locale)
}

function onDocumentClick(event: MouseEvent) {
  if (!rootRef.value?.contains(event.target as Node)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <div
    ref="rootRef"
    :class="wrapperClass"
    class="relative"
    data-testid="locale-switcher"
  >
    <button
      :id="id"
      type="button"
      :disabled="loading"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-label="`${t('common.language')}: ${activeOption?.label ?? ''}`"
      class="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface leading-none transition hover:border-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
      @click.stop="toggleOpen"
    >
      <span class="pointer-events-none select-none text-[1.375rem] leading-none" aria-hidden="true">{{ activeOption?.flag }}</span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-[calc(100%+0.35rem)] z-50 min-w-[10.5rem] overflow-hidden rounded-2xl border border-border bg-surface p-1 shadow-xl shadow-border/80"
      role="listbox"
      :aria-label="t('common.language')"
    >
      <button
        v-for="option in localeOptions"
        :key="option.value"
        type="button"
        role="option"
        :aria-selected="option.value === localeStore.locale"
        class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-surface-muted"
        :class="option.value === localeStore.locale ? 'bg-surface-muted font-bold text-ink' : 'font-medium text-ink-muted'"
        @mousedown.prevent
        @click.stop="selectLocale(option.value)"
      >
        <span class="text-[1.375rem] leading-none" aria-hidden="true">{{ option.flag }}</span>
        <span>{{ option.nativeLabel }}</span>
      </button>
    </div>
  </div>
</template>
