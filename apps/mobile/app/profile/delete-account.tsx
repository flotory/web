import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import ScreenGradientLayout from '../../src/components/ui/ScreenGradientLayout'
import { ApiError } from '../../src/lib/api'
import { useAuth } from '../../src/providers/AuthProvider'
import { colors, space, type as typography } from '../../src/theme'
import { withAppFont } from '../../src/lib/typography'

export default function DeleteAccountScreen() {
  const router = useRouter()
  const { user, deleteAccount } = useAuth()
  const [confirmation, setConfirmation] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const needsPassword = !user?.google_id && !user?.apple_id

  async function handleDelete() {
    setSubmitting(true)
    setError('')

    try {
      await deleteAccount({
        confirmation,
        password: needsPassword ? password : undefined,
      })
      router.replace('/login')
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : 'Could not delete account.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = confirmation === 'DELETE' && (!needsPassword || password.length > 0) && !submitting

  return (
    <ScreenGradientLayout scrollable contentContainerStyle={{ padding: space.screenX, paddingTop: 24 }}>
      <Text style={typography.hero}>Delete account</Text>
      <Text style={{ ...typography.body, marginTop: 10 }}>
        This permanently deletes your Flotory account, loyalty cards, stamps, and reward history. This cannot be undone.
      </Text>

      <View style={{ marginTop: space.sectionY, gap: 12 }}>
        <Text style={typography.label}>Type DELETE to confirm</Text>
        <TextInput
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="DELETE"
          placeholderTextColor={colors.inkSoft}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 12,
            backgroundColor: colors.surface,
            color: colors.ink,
          }}
        />

        {needsPassword ? (
          <>
            <Text style={typography.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Your password"
              placeholderTextColor={colors.inkSoft}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 12,
                backgroundColor: colors.surface,
                color: colors.ink,
              }}
            />
          </>
        ) : null}

        {error ? <Text style={withAppFont({ color: colors.danger, fontWeight: '600' })}>{error}</Text> : null}

        <Pressable
          onPress={() => void handleDelete()}
          disabled={!canSubmit}
          style={({ pressed }) => ({
            marginTop: 8,
            backgroundColor: colors.danger,
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: 'center',
            opacity: !canSubmit ? 0.5 : pressed ? 0.92 : 1,
          })}
        >
          <Text style={withAppFont({ color: '#fff', fontWeight: '800', fontSize: 16 })}>
            {submitting ? 'Deleting...' : 'Delete my account'}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={withAppFont({ color: colors.inkMuted, fontWeight: '700' })}>Cancel</Text>
        </Pressable>
      </View>
    </ScreenGradientLayout>
  )
}
