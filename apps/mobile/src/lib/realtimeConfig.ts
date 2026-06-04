import { API_BASE_URL } from './config'

function apiOrigin(): string {
  return API_BASE_URL.replace(/\/api\/?$/, '')
}

function defaultReverbHost(): string {
  try {
    return new URL(apiOrigin()).hostname
  } catch {
    return 'localhost'
  }
}

function defaultReverbPort(): number {
  const scheme = process.env.EXPO_PUBLIC_REVERB_SCHEME ?? 'https'
  return Number(process.env.EXPO_PUBLIC_REVERB_PORT || (scheme === 'https' ? 443 : 8080))
}

export const reverbConfig = {
  key: process.env.EXPO_PUBLIC_REVERB_APP_KEY ?? 'flotory-local-key',
  host: process.env.EXPO_PUBLIC_REVERB_HOST ?? defaultReverbHost(),
  port: defaultReverbPort(),
  scheme: process.env.EXPO_PUBLIC_REVERB_SCHEME ?? 'https',
  authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
}
