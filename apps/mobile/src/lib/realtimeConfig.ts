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

function defaultReverbScheme(): 'http' | 'https' {
  if (process.env.EXPO_PUBLIC_REVERB_SCHEME === 'http' || process.env.EXPO_PUBLIC_REVERB_SCHEME === 'https') {
    return process.env.EXPO_PUBLIC_REVERB_SCHEME
  }

  try {
    return new URL(apiOrigin()).protocol === 'http:' ? 'http' : 'https'
  } catch {
    return 'https'
  }
}

function defaultReverbPort(scheme: 'http' | 'https'): number {
  if (process.env.EXPO_PUBLIC_REVERB_PORT) {
    return Number(process.env.EXPO_PUBLIC_REVERB_PORT)
  }

  return scheme === 'https' ? 443 : 8080
}

const scheme = defaultReverbScheme()

export const reverbConfig = {
  key: process.env.EXPO_PUBLIC_REVERB_APP_KEY ?? 'flotory-local-key',
  host: process.env.EXPO_PUBLIC_REVERB_HOST ?? defaultReverbHost(),
  port: defaultReverbPort(scheme),
  scheme,
  authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
}
