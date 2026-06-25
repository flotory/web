import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform } from 'react-native'

import { apiRequest } from './api'
import { displayNameFromAppleEmail } from './profileDisplay'
import type { AuthResponse } from '../types/auth'

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false
  }

  try {
    return await AppleAuthentication.isAvailableAsync()
  } catch {
    return false
  }
}

export async function startAppleSignIn(): Promise<
  | { status: 'success'; auth: AuthResponse }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }
> {
  if (Platform.OS !== 'ios') {
    return { status: 'error', message: 'Sign in with Apple is only available on iOS.' }
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })

    if (!credential.identityToken) {
      return { status: 'error', message: 'Apple sign-in did not return a token.' }
    }

    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter((part): part is string => typeof part === 'string' && part.length > 0)
      .join(' ')
      .trim()

    const derivedName = fullName || displayNameFromAppleEmail(credential.email)

    const auth = await apiRequest<AuthResponse>('/auth/apple', {
      method: 'POST',
      body: {
        id_token: credential.identityToken,
        ...(derivedName ? { name: derivedName } : {}),
        device_name: 'flotory-mobile',
      },
    })

    return { status: 'success', auth }
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ERR_REQUEST_CANCELED'
    ) {
      return { status: 'cancelled' }
    }

    const message = error instanceof Error ? error.message : 'Apple sign-in failed.'
    return { status: 'error', message }
  }
}
