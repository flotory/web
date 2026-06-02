import { Redirect } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import ScreenGradientLayout from '../src/components/ui/ScreenGradientLayout'
import { ApiError } from '../src/lib/api'
import { useAuth } from '../src/providers/AuthProvider'
import { colors } from '../src/theme'

export default function LoginScreen() {
  const { signIn, signUp, token, booting } = useAuth()
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (booting) {
    return null
  }

  if (token) {
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

  return (
    <ScreenGradientLayout scrollable tabBarInset={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
    <View style={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: '800' }}>Flotory Mobile</Text>
      <Text style={{ color: colors.inkMuted }}>
        {isRegisterMode ? 'Create your account' : 'Sign in'}
      </Text>

      {isRegisterMode ? (
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.surface }}
        />
      ) : null}

      <TextInput
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.surface }}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.surface }}
      />

      {error ? <Text style={{ color: colors.danger, fontWeight: '600' }}>{error}</Text> : null}

      <Pressable
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
        <Text style={{ color: colors.primaryText, fontWeight: '700' }}>
          {submitting ? 'Please wait...' : isRegisterMode ? 'Create account' : 'Sign in'}
        </Text>
      </Pressable>

      <Pressable onPress={() => setIsRegisterMode((value) => !value)} style={{ alignItems: 'center', paddingTop: 2 }}>
        <Text style={{ color: colors.inkMuted, fontWeight: '600' }}>
          {isRegisterMode ? 'Already have an account? Sign in' : 'New customer? Create account'}
        </Text>
      </Pressable>
    </View>
    </ScreenGradientLayout>
  )
}

