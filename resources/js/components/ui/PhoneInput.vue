<script setup lang="ts">
import { AsYouType, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  countryDialCode,
  detectDefaultPhoneCountry,
  listPhoneCountries,
  type PhoneCountryOption,
} from '@/lib/phoneCountries'

const props = withDefaults(
  defineProps<{
    id?: string
    label?: string
    required?: boolean
    defaultCountry?: CountryCode
  }>(),
  {
    required: false,
  },
)

const model = defineModel<string>({ default: '' })

const countries = listPhoneCountries()
const countryCode = ref<CountryCode>(props.defaultCountry ?? detectDefaultPhoneCountry())
const nationalDisplay = ref('')
const dropdownOpen = ref(false)
const countryQuery = ref('')
const rootRef = ref<HTMLElement | null>(null)
let syncingFromModel = false

const selectedCountry = computed(
  () => countries.find((item) => item.code === countryCode.value) ?? countries[0],
)

const filteredCountries = computed(() => {
  const query = countryQuery.value.trim().toLowerCase()
  if (!query) {
    return countries
  }

  return countries.filter(
    (item) =>
      item.name.toLowerCase().includes(query) ||
      item.code.toLowerCase().includes(query) ||
      item.dialCode.includes(query),
  )
})

function formatNationalInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) {
    return ''
  }

  return new AsYouType(countryCode.value).input(digits)
}

function nationalDigits(): string {
  return nationalDisplay.value.replace(/\D/g, '')
}

function emitModelValue() {
  const digits = nationalDigits()
  if (!digits) {
    model.value = ''
    return
  }

  const parsed = parsePhoneNumberFromString(digits, countryCode.value)
  if (parsed?.isValid()) {
    model.value = parsed.format('E.164')
    return
  }

  // Incomplete — keep national digits in the input only; +374 already shows on the country picker.
}

function nationalDigitsFromStoredValue(value: string, code: CountryCode): string {
  const parsed = parsePhoneNumberFromString(value)
  if (parsed) {
    return parsed.nationalNumber.toString()
  }

  const digits = value.replace(/\D/g, '')
  const dialDigits = countryDialCode(code).replace(/\D/g, '')
  if (dialDigits && digits.startsWith(dialDigits)) {
    return digits.slice(dialDigits.length)
  }

  return digits
}

function applyModelValue(value: string) {
  syncingFromModel = true

  if (!value.trim()) {
    nationalDisplay.value = ''
    syncingFromModel = false
    return
  }

  const parsed = parsePhoneNumberFromString(value)
  if (parsed) {
    if (parsed.country) {
      countryCode.value = parsed.country
    }
    nationalDisplay.value = formatNationalInput(parsed.nationalNumber.toString())
    syncingFromModel = false
    return
  }

  nationalDisplay.value = formatNationalInput(nationalDigitsFromStoredValue(value, countryCode.value))
  syncingFromModel = false
}

function onNationalInput(event: Event) {
  const input = event.target as HTMLInputElement
  nationalDisplay.value = formatNationalInput(input.value)
  emitModelValue()
}

async function selectCountry(option: PhoneCountryOption) {
  syncingFromModel = true
  countryCode.value = option.code
  dropdownOpen.value = false
  countryQuery.value = ''

  if (nationalDigits()) {
    nationalDisplay.value = formatNationalInput(nationalDigits())
    emitModelValue()
  }

  await nextTick()
  syncingFromModel = false
}

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
  if (dropdownOpen.value) {
    countryQuery.value = ''
  }
}

function onDocumentClick(event: MouseEvent) {
  if (!dropdownOpen.value) return
  const target = event.target as Node | null
  if (rootRef.value && target && !rootRef.value.contains(target)) {
    dropdownOpen.value = false
  }
}

watch(
  () => model.value,
  (value) => {
    if (syncingFromModel) return
    applyModelValue(value ?? '')
  },
  { immediate: true },
)

watch(countryCode, () => {
  if (syncingFromModel || !nationalDigits()) return
  nationalDisplay.value = formatNationalInput(nationalDigits())
  emitModelValue()
})

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <div ref="rootRef">
    <label v-if="label" class="text-sm font-bold text-ink-muted" :for="id">
      {{ label }}<span v-if="required" class="text-danger" aria-hidden="true"> *</span>
    </label>

    <div class="relative mt-2">
      <div
        class="flex h-12 items-center rounded-2xl border border-border bg-surface focus-within:border-ink-soft"
      >
        <button
          type="button"
          class="flex h-auto shrink-0 items-center gap-1.5 self-center rounded-l-2xl border-r border-border bg-transparent px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-muted/80"
          :aria-expanded="dropdownOpen"
          aria-haspopup="listbox"
          @click.stop="toggleDropdown"
        >
          <span class="text-base leading-none" aria-hidden="true">{{ selectedCountry.flag }}</span>
          <span>{{ selectedCountry.dialCode }}</span>
          <span class="text-xs text-ink-soft" aria-hidden="true">▾</span>
        </button>

        <input
          :id="id"
          :value="nationalDisplay"
          type="tel"
          inputmode="tel"
          autocomplete="tel-national"
          class="h-12 min-w-0 flex-1 rounded-r-2xl bg-transparent px-4 text-sm font-medium text-ink outline-none placeholder:text-ink-soft"
          :placeholder="countryCode === 'AM' ? '77 123 456' : countryCode === 'PL' ? '123 456 789' : 'Phone number'"
          @input="onNationalInput"
        >
      </div>

      <div
        v-if="dropdownOpen"
        class="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-72 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-border/80"
        role="listbox"
      >
        <div class="border-b border-border p-2">
          <input
            v-model="countryQuery"
            type="search"
            class="h-9 w-full rounded-xl border border-border bg-surface px-3 text-sm font-medium text-ink outline-none focus:border-ink-soft"
            placeholder="Search country"
            @click.stop
          >
        </div>
        <ul class="max-h-56 overflow-y-auto py-1">
          <li v-for="option in filteredCountries" :key="option.code">
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted"
              :class="option.code === countryCode ? 'bg-surface-muted font-bold text-ink' : 'font-medium text-ink-muted'"
              role="option"
              :aria-selected="option.code === countryCode"
              @mousedown.prevent
              @click.stop="selectCountry(option)"
            >
              <span class="text-base leading-none">{{ option.flag }}</span>
              <span class="min-w-0 flex-1 truncate">{{ option.name }}</span>
              <span class="shrink-0 text-ink-muted">{{ option.dialCode }}</span>
            </button>
          </li>
          <li v-if="!filteredCountries.length" class="px-3 py-2 text-sm font-medium text-ink-muted">
            No countries found
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
