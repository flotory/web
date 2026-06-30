import { defineStore } from 'pinia'

import {
  getActiveLocale,
  LOCALE_STORAGE_KEY,
  resolveLocale,
  setActiveLocale,
  type AppLocale,
} from '@/i18n'

export const useLocaleStore = defineStore('locale', {
  state: () => ({
    locale: getActiveLocale(),
  }),
  actions: {
    setLocale(value: unknown, persist = true) {
      const locale = resolveLocale(value)
      this.locale = locale
      setActiveLocale(locale)

      if (persist) {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale)
      }
    },
    applyUserLocale(value: string | null | undefined) {
      if (value) {
        this.setLocale(value)
      }
    },
    current(): AppLocale {
      return this.locale
    },
  },
})
