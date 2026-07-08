import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useLocaleSwitcher } from '@/composables/useLocaleSwitcher'
import { LOCALE_STORAGE_KEY, setActiveLocale } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useLocaleStore } from '@/stores/locale'

const localStore = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => localStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    localStore.set(key, value)
  },
  removeItem: (key: string) => {
    localStore.delete(key)
  },
  clear: () => {
    localStore.clear()
  },
})

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}))

import { api } from '@/lib/api'

describe('useLocaleSwitcher', () => {
  beforeEach(() => {
    localStore.clear()
    setActivePinia(createPinia())
    setActiveLocale('en')
    useLocaleStore().setLocale('en')
    vi.mocked(api).mockReset()
  })

  it('updates locale locally for guests without calling the API', async () => {
    const { setAppLocale } = useLocaleSwitcher()
    const localeStore = useLocaleStore()

    const result = await setAppLocale('hy')

    expect(result).toBe('ok')
    expect(localeStore.locale).toBe('hy')
    expect(localStore.get(LOCALE_STORAGE_KEY)).toBe('hy')
    expect(api).not.toHaveBeenCalled()
  })

  it('syncs locale to the server when authenticated', async () => {
    const auth = useAuthStore()
    auth.token = 'token'
    auth.user = {
      id: 1,
      name: 'Owner',
      email: 'owner@example.com',
      is_admin: false,
      locale: 'en',
      currency: 'USD',
    }

    vi.mocked(api).mockResolvedValue({
      user: { ...auth.user!, locale: 'hy' },
    })

    const { setAppLocale } = useLocaleSwitcher()
    const localeStore = useLocaleStore()

    const result = await setAppLocale('hy')

    expect(result).toBe('ok')
    expect(localeStore.locale).toBe('hy')
    expect(api).toHaveBeenCalledWith('/auth/locale', {
      method: 'PUT',
      body: { locale: 'hy' },
    })
    expect(auth.user?.locale).toBe('hy')
  })

  it('rolls back locale when the API request fails', async () => {
    const auth = useAuthStore()
    auth.token = 'token'
    auth.user = {
      id: 1,
      name: 'Owner',
      email: 'owner@example.com',
      is_admin: false,
      locale: 'en',
      currency: 'USD',
    }

    vi.mocked(api).mockRejectedValue(new Error('network'))

    const { setAppLocale } = useLocaleSwitcher()
    const localeStore = useLocaleStore()

    const result = await setAppLocale('hy')

    expect(result).toBe('error')
    expect(localeStore.locale).toBe('en')
  })

  it('cycles to the next supported locale', async () => {
    const { cycleLocale } = useLocaleSwitcher()
    const localeStore = useLocaleStore()

    expect(localeStore.locale).toBe('en')

    const result = await cycleLocale()

    expect(result).toBe('ok')
    expect(localeStore.locale).toBe('hy')

    const again = await cycleLocale()

    expect(again).toBe('ok')
    expect(localeStore.locale).toBe('en')
  })
})
