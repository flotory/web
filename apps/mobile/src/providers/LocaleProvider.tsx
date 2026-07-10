import type { PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { I18nextProvider } from 'react-i18next'

import i18n, { DEFAULT_LOCALE, resolveLocale, type AppLocale } from '../i18n'
import { getSavedLocale, saveLocale } from '../lib/localeStorage'

interface LocaleContextValue {
  locale: AppLocale
  setLocale: (locale: AppLocale) => Promise<void>
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<AppLocale>(resolveLocale(i18n.language) ?? DEFAULT_LOCALE)

  useEffect(() => {
    let active = true

    getSavedLocale()
      .then((savedLocale) => {
        if (!active || !savedLocale) return
        setLocaleState(savedLocale)
        void i18n.changeLanguage(savedLocale)
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  const setLocale = useCallback(async (nextLocale: AppLocale) => {
    setLocaleState(nextLocale)
    await i18n.changeLanguage(nextLocale)
    await saveLocale(nextLocale)
  }, [])

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale])

  return (
    <LocaleContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  )
}

export function useLocalePreference(): LocaleContextValue {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocalePreference must be used inside LocaleProvider')
  }

  return context
}
