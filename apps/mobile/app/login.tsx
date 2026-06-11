import { Redirect, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import GoogleLogo from '../src/components/ui/GoogleLogo'
import ScreenGradientLayout from '../src/components/ui/ScreenGradientLayout'
import { ApiError } from '../src/lib/api'
import { startGoogleBrowserSignIn } from '../src/lib/googleBrowserAuth'
import { withAppFont } from '../src/lib/typography'
import { useAuth } from '../src/providers/AuthProvider'
import { colors } from '../src/theme'

function readParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0]
  }

  return null
}

export default function LoginScreen() {
  const { signIn, signUp, signInWithToken, token, role, booting } = useAuth()
  const { redirect, oauth_token, error: oauthError } = useLocalSearchParams<{
    redirect?: string | string[]
    oauth_token?: string | string[]
    error?: string | string[]
  }>()
  const redirectPath = Array.isArray(redirect) ? redirect[0] : redirect
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (readParam(oauthError) === 'google_auth_failed') {
      setError('Google sign-in could not be completed. Try again or use email and password.')
    }
  }, [oauthError])

  useEffect(() => {
    const oauthToken = readParam(oauth_token)
    if (!oauthToken || booting || token) {
      return
    }

    let cancelled = false
    setGoogleLoading(true)
    setError('')

    void signInWithToken(oauthToken)
      .catch(() => {
        if (!cancelled) {
          setError('Google sign-in failed. Please try again.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGoogleLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [booting, oauth_token, signInWithToken, token])

  if (booting) {
    return null
  }

  if (token && role !== null) {
    if (redirectPath?.startsWith('/')) {
      return <Redirect href={redirectPath} />
    }

    return <Redirect href="/" />
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

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError('')

    try {
      const result = await startGoogleBrowserSignIn()
      if (result.status === 'cancelled') {
        return
      }

      if (result.status === 'error') {
        setError(result.message)
        return
      }

      await signInWithToken(result.oauthToken)
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : 'Google sign-in failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const busy = submitting || googleLoading

  return (
    <ScreenGradientLayout scrollable tabBarInset={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
    <View style={{ padding: 20, gap: 12 }}>
      <Text style={withAppFont({ fontSize: 28, fontWeight: '800' })}>Flotory Mobile</Text>
      <Text style={{ color: colors.inkMuted }}>
        {isRegisterMode ? 'Create your account' : 'Sign in'}
      </Text>

      <Pressable
        testID="login-google-button"
        onPress={handleGoogleSignIn}
        disabled={busy}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 999,
          paddingVertical: 14,
          backgroundColor: colors.surface,
          opacity: busy ? 0.6 : 1,
        }}
      >
        <GoogleLogo size={20} />
        <Text style={withAppFont({ color: colors.ink, fontWeight: '700' })}>
          {googleLoading ? 'Connecting Google...' : 'Continue with Google'}
        </Text>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text style={withAppFont({ color: colors.inkSoft, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 })}>OR</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>

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
        placeholder="Password"
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.surface }}
      />

      {error ? <Text style={withAppFont({ color: colors.danger, fontWeight: '600' })}>{error}</Text> : null}

      <Pressable
        testID="login-submit-button"
        onPress={handleAuth}
        disabled={busy}
        style={{
          backgroundColor: colors.primary,
          borderRadius: 999,
          paddingVertical: 14,
          alignItems: 'center',
          opacity: busy ? 0.6 : 1,
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
