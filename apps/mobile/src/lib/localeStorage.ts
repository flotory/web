import * as SecureStore from 'expo-secure-store'

import { resolveLocale, type AppLocale } from '../i18n'

const LOCALE_KEY = 'flotory_mobile_locale'

export async function saveLocale(locale: AppLocale): Promise<void> {
  await SecureStore.setItemAsync(LOCALE_KEY, locale)
}

export async function getSavedLocale(): Promise<AppLocale | null> {
  return resolveLocale(await SecureStore.getItemAsync(LOCALE_KEY))
}
