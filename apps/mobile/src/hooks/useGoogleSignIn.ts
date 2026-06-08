import type { AuthSessionResult } from 'expo-auth-session'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'

WebBrowser.maybeCompleteAuthSession()

export function resolveGoogleIdToken(response: AuthSessionResult | null): string | null {
  if (!response || response.type !== 'success') {
    return null
  }

  const fromAuthentication = response.authentication?.idToken
  if (typeof fromAuthentication === 'string' && fromAuthentication.length > 0) {
    return fromAuthentication
  }

  const fromParams = response.params.id_token
  if (typeof fromParams === 'string' && fromParams.length > 0) {
    return fromParams
  }

  return null
}

export function useGoogleSignIn(webClientId: string) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      webClientId,
      iosClientId: webClientId,
      androidClientId: webClientId,
    },
    { scheme: 'flotory' },
  )

  return {
    request,
    response,
    promptAsync,
    ready: Boolean(webClientId && request),
  }
}
