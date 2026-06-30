import { getLocales } from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { localeOptions, resolveLocale, type AppLocale } from './localeConfig'
import en from './locales/en'
import hy from './locales/hy'
import { setRuntimeLocale } from './runtime'

export { localeOptions, resolveLocale, type AppLocale } from './localeConfig'

export function deviceLocale(): AppLocale {
  return resolveLocale(getLocales()[0]?.languageTag) ?? 'en'
}

export function currentLocale(): AppLocale {
  return resolveLocale(i18n.language) ?? 'en'
}

setRuntimeLocale(deviceLocale())

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  lng: deviceLocale(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  resources: {
    en: { translation: en },
    hy: { translation: hy },
  },
})

i18n.on('languageChanged', (locale) => {
  setRuntimeLocale(resolveLocale(locale) ?? 'en')
})

export default i18n
