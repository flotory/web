import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useTranslation } from 'react-i18next'

import GoogleLogo from '../src/components/ui/GoogleLogo'
import ScreenGradientLayout from '../src/components/ui/ScreenGradientLayout'
import { ApiError } from '../src/lib/api'
import { isAppleSignInAvailable, startAppleSignIn } from '../src/lib/appleAuth'
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
  const { t } = useTranslation()
  const router = useRouter()
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
  const [appleLoading, setAppleLoading] = useState(false)
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void isAppleSignInAvailable().then(setAppleAvailable)
  }, [])

  useEffect(() => {
    if (readParam(oauthError) === 'google_auth_failed') {
      setError(t('login.googleCouldNotComplete'))
    }
  }, [oauthError, t])

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
          setError(t('login.googleFailed'))
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
  }, [booting, oauth_token, signInWithToken, token, t])

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
      setError(exception instanceof ApiError ? exception.message : t('login.authFailed'))
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
      setError(exception instanceof ApiError ? exception.message : t('login.googleFailed'))
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleAppleSignIn() {
    setAppleLoading(true)
    setError('')

    try {
      const result = await startAppleSignIn()
      if (result.status === 'cancelled') {
        return
      }

      if (result.status === 'error') {
        setError(result.message)
        return
      }

      await signInWithToken(result.auth.token)
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : t('login.appleFailed'))
    } finally {
      setAppleLoading(false)
    }
  }

  const busy = submitting || googleLoading || appleLoading

  return (
    <ScreenGradientLayout scrollable tabBarInset={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
    <View style={{ padding: 20, gap: 12 }}>
      <Text style={withAppFont({ fontSize: 28, fontWeight: '800' })}>{t('login.title')}</Text>
      <Text style={{ color: colors.inkMuted }}>
        {isRegisterMode ? t('login.createAccountSubtitle') : t('login.signInSubtitle')}
      </Text>

      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={999}
          style={{ width: '100%', height: 48, opacity: busy ? 0.6 : 1 }}
          onPress={() => void handleAppleSignIn()}
        />
      ) : null}

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
          {googleLoading ? t('login.connectingGoogle') : t('login.continueWithGoogle')}
        </Text>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text style={withAppFont({ color: colors.inkSoft, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 })}>{t('login.or')}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>

      {isRegisterMode ? (
        <TextInput
          testID="login-name-input"
          value={name}
          onChangeText={setName}
          placeholder={t('login.fullName')}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.surface }}
        />
      ) : null}

      <TextInput
        testID="login-email-input"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        placeholder={t('login.email')}
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.surface }}
      />
      <TextInput
        testID="login-password-input"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder={t('login.password')}
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
          {submitting ? t('login.pleaseWait') : isRegisterMode ? t('login.createAccount') : t('common.signIn')}
        </Text>
      </Pressable>

      <Pressable onPress={() => setIsRegisterMode((value) => !value)} style={{ alignItems: 'center', paddingTop: 2 }}>
        <Text style={withAppFont({ color: colors.inkMuted, fontWeight: '600' })}>
          {isRegisterMode ? t('login.alreadyHaveAccount') : t('login.newCustomer')}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(customer)/venues')} style={{ alignItems: 'center', paddingTop: 10 }}>
        <Text style={withAppFont({ color: colors.inkMuted, fontWeight: '700' })}>{t('login.browseWithoutSignIn')}</Text>
      </Pressable>
    </View>
    </ScreenGradientLayout>
  )
}
