import { Redirect } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import GoogleLogo from '../src/components/ui/GoogleLogo'
import SecondaryButton from '../src/components/ui/SecondaryButton'
import ScreenGradientLayout from '../src/components/ui/ScreenGradientLayout'
import { resolveGoogleIdToken, useGoogleSignIn } from '../src/hooks/useGoogleSignIn'
import { ApiError, apiRequest } from '../src/lib/api'
import { GOOGLE_WEB_CLIENT_ID } from '../src/lib/config'
import { withAppFont } from '../src/lib/typography'
import { useAuth } from '../src/providers/AuthProvider'
import { colors } from '../src/theme'

export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle, token, role, booting } = useAuth()
  const [googleClientId, setGoogleClientId] = useState(GOOGLE_WEB_CLIENT_ID)
  const { request, response, promptAsync, ready } = useGoogleSignIn(googleClientId)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const processedGoogleToken = useRef<string | null>(null)

  useEffect(() => {
    void apiRequest<{ google_oauth_client_id?: string | null }>('/public/app-config')
      .then((config) => {
        if (config.google_oauth_client_id) {
          setGoogleClientId(config.google_oauth_client_id)
        }
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!response) {
      return
    }

    if (response.type === 'cancel' || response.type === 'dismiss') {
      setSubmitting(false)
      return
    }

    if (response.type === 'error') {
      setSubmitting(false)
      setError('Google sign-in could not be completed. Try again or use email and password.')
      return
    }

    const idToken = resolveGoogleIdToken(response)
    if (!idToken) {
      setSubmitting(false)
      setError('Google sign-in did not return a token. Try again.')
      return
    }

    if (processedGoogleToken.current === idToken) {
      return
    }

    processedGoogleToken.current = idToken
    void completeGoogleSignIn(idToken)
  }, [response])

  if (booting) {
    return null
  }

  if (token && role !== null) {
    return <Redirect href="/" />
  }

  async function completeGoogleSignIn(idToken: string) {
    setSubmitting(true)
    setError('')
    try {
      await signInWithGoogle(idToken)
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : 'Google sign-in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAuth() {
    setSubmitting(true)
    setError('')
    try {
      if (isRegisterMode) {
        await signUp(name.trim(), email.trim(), password)
      } else {
        await signIn(email.trim(), password)
      }
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : 'Could not authenticate.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGooglePress() {
    if (!ready || !request) {
      setError('Google sign-in is not configured yet.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await promptAsync()
    } catch {
      setSubmitting(false)
      setError('Google sign-in could not be started.')
    }
  }

  return (
    <ScreenGradientLayout scrollable tabBarInset={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
    <View style={{ padding: 20, gap: 12 }}>
      <Text style={withAppFont({ fontSize: 28, fontWeight: '800' })}>Flotory Mobile</Text>
      <Text style={withAppFont({ color: colors.inkMuted })}>
        {isRegisterMode ? 'Create your account' : 'Sign in'}
      </Text>

      <SecondaryButton
        variant="surface"
        label={submitting ? 'Connecting Google...' : 'Continue with Google'}
        leading={<GoogleLogo size={20} />}
        onPress={handleGooglePress}
        disabled={submitting || !ready}
        testID="login-google-button"
      />

      <Text style={withAppFont({ textAlign: 'center', color: colors.inkMuted, fontSize: 13 })}>or</Text>

      {isRegisterMode ? (
        <TextInput
          testID="login-name-input"
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.surface }}
        />
      ) : null}

      <TextInput
        testID="login-email-input"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.surface }}
      />
      <TextInput
        testID="login-password-input"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={isRegisterMode ? 'new-password' : 'password'}
        placeholder="Password"
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.surface }}
      />

      {error ? <Text style={withAppFont({ color: colors.danger, fontWeight: '600' })}>{error}</Text> : null}

      <Pressable
        testID="login-submit-button"
        onPress={handleAuth}
        disabled={submitting}
        style={{
          backgroundColor: colors.primary,
          borderRadius: 999,
          paddingVertical: 14,
          alignItems: 'center',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        <Text style={withAppFont({ color: colors.primaryText, fontWeight: '700' })}>
          {submitting ? 'Please wait...' : isRegisterMode ? 'Create account' : 'Sign in'}
        </Text>
      </Pressable>

      <Pressable onPress={() => setIsRegisterMode((value) => !value)} style={{ alignItems: 'center', paddingTop: 2 }}>
        <Text style={withAppFont({ color: colors.inkMuted, fontWeight: '600' })}>
          {isRegisterMode ? 'Already have an account? Sign in' : 'New customer? Create account'}
        </Text>
      </Pressable>
    </View>
    </ScreenGradientLayout>
  )
}
