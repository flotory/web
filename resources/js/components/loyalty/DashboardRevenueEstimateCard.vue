<script setup lang="ts">
import { DollarSign } from '@lucide/vue'
import { computed, ref, watch } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { api, ApiError } from '@/lib/api'
import { currencySymbol, formatCurrency } from '@/lib/currency'
import { moneyAmountsEqual, parseMoneyAmount } from '@/lib/money'
import { useCurrencyStore } from '@/stores/currency'
import { useLocaleStore } from '@/stores/locale'
import type { Venue } from '@/types'

export interface RevenueEstimate {
  average_check_amount: number | null
  visits_last_28_days: number
  total_visits: number
  estimated_revenue_last_28_days: number | null
  estimated_revenue_total: number | null
}

const props = defineProps<{
  venue: Pick<Venue, 'id' | 'name'> | null
  estimate: RevenueEstimate | null | undefined
  editable?: boolean
  periodLabel?: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const currencyStore = useCurrencyStore()
const localeStore = useLocaleStore()

const averageCheckDraft = ref('')
const saving = ref(false)
const saveError = ref('')

watch(
  () => props.estimate?.average_check_amount,
  (amount) => {
    averageCheckDraft.value = amount === null || amount === undefined ? '' : String(amount)
  },
  { immediate: true },
)

const parsedAverageCheck = computed(() => parseMoneyAmount(averageCheckDraft.value))

function formatAmount(amount: number): string {
  return formatCurrency(amount, currencyStore.currency, localeStore.locale)
}

const totalRevenueLabel = computed(() => {
  if (!props.estimate) {
    return null
  }

  if (!props.editable && props.estimate.estimated_revenue_total !== null) {
    return formatAmount(props.estimate.estimated_revenue_total)
  }

  if (parsedAverageCheck.value === null) {
    return null
  }

  return formatAmount(props.estimate.total_visits * parsedAverageCheck.value)
})

const rollingRevenueLabel = computed(() => {
  if (!props.estimate) {
    return null
  }

  if (!props.editable && props.estimate.estimated_revenue_last_28_days !== null) {
    return formatAmount(props.estimate.estimated_revenue_last_28_days)
  }

  if (parsedAverageCheck.value === null) {
    return null
  }

  return formatAmount(props.estimate.visits_last_28_days * parsedAverageCheck.value)
})

const averageCheckDisplay = computed(() => {
  if (!props.estimate) {
    return formatAmount(0)
  }

  if (!props.editable && props.estimate.average_check_amount !== null) {
    return formatAmount(props.estimate.average_check_amount)
  }

  return formatAmount(parsedAverageCheck.value ?? 0)
})

const currencyPrefix = computed(() => currencySymbol(currencyStore.currency))

const exampleAverageCheck = computed(() => (currencyStore.currency === 'AMD' ? 1600 : 4))

const exampleRevenue = computed(() => formatAmount(280 * exampleAverageCheck.value))

const canShowEstimate = computed(() => {
  if (!props.estimate) {
    return false
  }

  if (!props.editable && props.estimate.estimated_revenue_total !== null) {
    return true
  }

  return parsedAverageCheck.value !== null
})

const hasChanges = computed(() => {
  return !moneyAmountsEqual(parsedAverageCheck.value, props.estimate?.average_check_amount ?? null)
})

const canSave = computed(() => props.editable && parsedAverageCheck.value !== null && hasChanges.value && !saving.value)

async function saveAverageCheck() {
  if (!props.editable || !props.venue || !hasChanges.value) {
    return
  }

  saving.value = true
  saveError.value = ''

  try {
    await api(`/venues/${props.venue.id}`, {
      method: 'PUT',
      body: {
        name: props.venue.name,
        average_check_amount: parsedAverageCheck.value,
      },
    })
    emit('saved')
  } catch (error) {
    saveError.value = error instanceof ApiError ? error.message : 'Could not save average check.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppCard wrapper-class="p-5 sm:p-6">
    <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-xl bg-success-bg text-success-text">
            <DollarSign class="size-5" stroke-width="2.25" />
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">Revenue estimate</p>
            <h2 class="text-lg font-bold text-ink">Sales from Flotory visits</h2>
          </div>
        </div>

        <p class="mt-3 max-w-2xl text-sm text-ink-muted">
          Enter your average check amount to estimate how much revenue came through stamped visits.
        </p>

        <div v-if="editable && venue" class="mt-4 max-w-md">
          <label for="average-check-amount" class="text-sm font-semibold text-ink">Average check</label>
          <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div class="relative min-w-0 flex-1">
              <span class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-ink-soft">{{ currencyPrefix }}</span>
              <input
                id="average-check-amount"
                v-model="averageCheckDraft"
                type="text"
                inputmode="decimal"
                :placeholder="currencyStore.currency === 'AMD' ? '1600' : '4.00'"
                class="h-12 w-full rounded-2xl border border-border bg-surface pl-8 pr-4 text-sm font-medium text-ink outline-none focus:border-ink-soft"
                @keyup.enter="saveAverageCheck"
                @blur="saveAverageCheck"
              >
            </div>
            <AppButton
              class="shrink-0 sm:min-w-24"
              variant="secondary"
              :disabled="!canSave"
              @click="saveAverageCheck"
            >
              {{ saving ? 'Saving…' : 'Save' }}
            </AppButton>
          </div>
          <p v-if="saveError" class="mt-2 text-sm font-medium text-danger">{{ saveError }}</p>
        </div>
        <p v-else-if="!editable" class="mt-4 text-sm text-ink-muted">
          Select a single venue to set an average check amount.
        </p>
      </div>

      <div v-if="canShowEstimate && estimate" class="w-full rounded-2xl border border-border bg-surface-muted p-5 lg:max-w-sm">
        <p class="text-sm font-semibold text-ink-muted">Estimated revenue (all visits)</p>
        <p class="mt-2 text-4xl font-black tabular-nums tracking-tight text-ink">{{ totalRevenueLabel }}</p>
        <p class="mt-2 text-sm text-ink-muted">
          {{ estimate.total_visits.toLocaleString() }} visits × {{ averageCheckDisplay }}
        </p>
        <p class="mt-4 border-t border-border pt-4 text-sm text-ink-muted">
          {{ periodLabel ?? 'Last 28 days' }}:
          <span class="font-semibold text-ink">{{ rollingRevenueLabel }}</span>
          <span class="text-ink-soft">({{ estimate.visits_last_28_days.toLocaleString() }} visits)</span>
        </p>
      </div>

      <div v-else class="w-full rounded-2xl border border-dashed border-border bg-surface-muted p-5 lg:max-w-sm">
        <p class="text-sm font-semibold text-ink">Add your average check</p>
        <p class="mt-2 text-sm text-ink-muted">
          Example: 280 visits at {{ formatAmount(exampleAverageCheck) }} each ≈ {{ exampleRevenue }} estimated revenue.
        </p>
      </div>
    </div>
  </AppCard>
</template>
