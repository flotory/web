import { ref } from 'vue'

import type { AppLocale } from '@/i18n'
import { SUPPORTED_LOCALES } from '@/i18n'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useLocaleStore } from '@/stores/locale'
import type { User } from '@/types'

export function useLocaleSwitcher() {
  const localeStore = useLocaleStore()
  const auth = useAuthStore()
  const loading = ref(false)

  async function setAppLocale(nextLocale: AppLocale): Promise<'ok' | 'error' | 'unchanged'> {
    const previousLocale = localeStore.locale

    if (nextLocale === previousLocale) {
      return 'unchanged'
    }

    localeStore.setLocale(nextLocale)

    if (!auth.isAuthenticated) {
      return 'ok'
    }

    loading.value = true

    try {
      const response = await api<{ user: User }>('/auth/locale', {
        method: 'PUT',
        body: { locale: localeStore.locale },
      })

      auth.user = response.user

      return 'ok'
    } catch {
      localeStore.setLocale(previousLocale)

      return 'error'
    } finally {
      loading.value = false
    }
  }

  async function cycleLocale(): Promise<'ok' | 'error' | 'unchanged'> {
    const currentIndex = SUPPORTED_LOCALES.indexOf(localeStore.locale)
    const nextIndex = (currentIndex + 1) % SUPPORTED_LOCALES.length
    const nextLocale = SUPPORTED_LOCALES[nextIndex] ?? SUPPORTED_LOCALES[0]

    return setAppLocale(nextLocale)
  }

  return {
    loading,
    setAppLocale,
    cycleLocale,
  }
}
