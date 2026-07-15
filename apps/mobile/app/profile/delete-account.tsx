import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'

import AppButton from '../../src/components/ui/AppButton'
import FormField from '../../src/components/ui/FormField'
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
        <FormField
          label="Type DELETE to confirm"
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="DELETE"
        />

        {needsPassword ? (
          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Your password"
          />
        ) : null}

        {error ? <Text style={withAppFont({ color: colors.danger, fontWeight: '600' })}>{error}</Text> : null}

        <AppButton
          label={submitting ? 'Deleting...' : 'Delete my account'}
          onPress={() => void handleDelete()}
          disabled={!canSubmit}
          variant="ghost"
          style={{ marginTop: 8 }}
        />

        <AppButton label="Cancel" onPress={() => router.back()} variant="danger" />
      </View>
    </ScreenGradientLayout>
  )
}
