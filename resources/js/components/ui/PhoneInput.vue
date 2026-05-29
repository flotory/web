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
    optional?: boolean
    defaultCountry?: CountryCode
  }>(),
  {
    optional: true,
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

  model.value = `${countryDialCode(countryCode.value)}${digits}`
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

  const digits = value.replace(/\D/g, '')
  nationalDisplay.value = formatNationalInput(digits)
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
    <label v-if="label" class="text-sm font-bold text-slate-600" :for="id">
      {{ label }}<span v-if="optional" class="font-semibold text-slate-400"> optional</span>
    </label>

    <div class="relative mt-2">
      <div
        class="flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-slate-400 focus-within:bg-white"
      >
        <button
          type="button"
          class="flex h-auto shrink-0 items-center gap-1.5 self-center rounded-l-2xl border-r border-slate-200 bg-transparent px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100/80"
          :aria-expanded="dropdownOpen"
          aria-haspopup="listbox"
          @click.stop="toggleDropdown"
        >
          <span class="text-base leading-none" aria-hidden="true">{{ selectedCountry.flag }}</span>
          <span>{{ selectedCountry.dialCode }}</span>
          <span class="text-xs text-slate-400" aria-hidden="true">▾</span>
        </button>

        <input
          :id="id"
          :value="nationalDisplay"
          type="tel"
          inputmode="tel"
          autocomplete="tel-national"
          class="h-12 min-w-0 flex-1 rounded-r-2xl bg-transparent px-4 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
          :placeholder="countryCode === 'PL' ? '123 456 789' : 'Phone number'"
          @input="onNationalInput"
        >
      </div>

      <div
        v-if="dropdownOpen"
        class="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80"
        role="listbox"
      >
        <div class="border-b border-slate-100 p-2">
          <input
            v-model="countryQuery"
            type="search"
            class="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white"
            placeholder="Search country"
            @click.stop
          >
        </div>
        <ul class="max-h-56 overflow-y-auto py-1">
          <li v-for="option in filteredCountries" :key="option.code">
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              :class="option.code === countryCode ? 'bg-slate-50 font-bold text-slate-950' : 'font-medium text-slate-700'"
              role="option"
              :aria-selected="option.code === countryCode"
              @mousedown.prevent
              @click.stop="selectCountry(option)"
            >
              <span class="text-base leading-none">{{ option.flag }}</span>
              <span class="min-w-0 flex-1 truncate">{{ option.name }}</span>
              <span class="shrink-0 text-slate-500">{{ option.dialCode }}</span>
            </button>
          </li>
          <li v-if="!filteredCountries.length" class="px-3 py-2 text-sm font-medium text-slate-500">
            No countries found
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
