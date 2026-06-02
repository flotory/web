import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import { ApiError } from '../src/lib/api'
import { useAuth } from '../src/providers/AuthProvider'

export default function LoginScreen() {
  const { signIn, signUp, token } = useAuth()
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('customer@example.com')
  const [password, setPassword] = useState('password')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) {
      router.replace('/')
    }
  }, [token])

  async function handleAuth() {
    setSubmitting(true)
    setError('')
    try {
      if (isRegisterMode) {
        await signUp(name.trim(), email.trim(), password)
      } else {
        await signIn(email.trim(), password)
      }
      router.replace('/')
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : 'Could not authenticate.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 12, backgroundColor: '#f8fafc' }}>
      <Text style={{ fontSize: 28, fontWeight: '800' }}>Flotory Mobile</Text>
      <Text style={{ color: '#475569' }}>
        {isRegisterMode ? 'Create your account' : 'Sign in'}
      </Text>

      {isRegisterMode ? (
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }}
        />
      ) : null}

      <TextInput
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, backgroundColor: '#fff' }}
      />

      {error ? <Text style={{ color: '#b91c1c', fontWeight: '600' }}>{error}</Text> : null}

      <Pressable
        onPress={handleAuth}
        disabled={submitting}
        style={{
          backgroundColor: '#0f172a',
          borderRadius: 999,
          paddingVertical: 14,
          alignItems: 'center',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          {submitting ? 'Please wait...' : isRegisterMode ? 'Create account' : 'Sign in'}
        </Text>
      </Pressable>

      <Pressable onPress={() => setIsRegisterMode((value) => !value)} style={{ alignItems: 'center', paddingTop: 2 }}>
        <Text style={{ color: '#334155', fontWeight: '600' }}>
          {isRegisterMode ? 'Already have an account? Sign in' : 'New customer? Create account'}
        </Text>
      </Pressable>
    </View>
  )
}

