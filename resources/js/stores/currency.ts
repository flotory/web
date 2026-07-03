import { defineStore } from 'pinia'

import {
  CURRENCY_STORAGE_KEY,
  resolveCurrency,
  type AppCurrency,
} from '@/lib/currency'

export const useCurrencyStore = defineStore('currency', {
  state: () => ({
    currency: resolveCurrency(
      typeof localStorage !== 'undefined' ? localStorage.getItem(CURRENCY_STORAGE_KEY) : null,
    ),
  }),
  actions: {
    setCurrency(value: unknown, persist = true) {
      const currency = resolveCurrency(value)
      this.currency = currency

      if (persist && typeof localStorage !== 'undefined') {
        localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
      }
    },
    applyUserCurrency(value: string | null | undefined) {
      if (value) {
        this.setCurrency(value)
      }
    },
    current(): AppCurrency {
      return this.currency
    },
  },
})
