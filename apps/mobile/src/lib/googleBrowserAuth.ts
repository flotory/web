import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'

import { webAppOrigin } from './config'

const MOBILE_GOOGLE_RETURN_URL = 'flotory://login'

export type GoogleBrowserAuthResult =
  | { status: 'success'; oauthToken: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }

export function googleOAuthStartUrl(): string {
  return `${webAppOrigin()}/auth/google/redirect?mobile=1`
}

export async function startGoogleBrowserSignIn(): Promise<GoogleBrowserAuthResult> {
  const result = await WebBrowser.openAuthSessionAsync(googleOAuthStartUrl(), MOBILE_GOOGLE_RETURN_URL)

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { status: 'cancelled' }
  }

  if (result.type !== 'success' || !result.url) {
    return { status: 'error', message: 'Google sign-in could not be completed.' }
  }

  const parsed = Linking.parse(result.url)
  const oauthToken = readQueryParam(parsed.queryParams?.oauth_token)
  if (oauthToken) {
    return { status: 'success', oauthToken }
  }

  const error = readQueryParam(parsed.queryParams?.error)
  if (error === 'google_auth_failed') {
    return { status: 'error', message: 'Google sign-in could not be completed. Try again or use email and password.' }
  }

  return { status: 'error', message: 'Google sign-in did not return a token.' }
}

function readQueryParam(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0]
  }

  return null
}
