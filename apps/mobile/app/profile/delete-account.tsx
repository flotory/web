import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import AppButton from '../../src/components/ui/AppButton'
import FormField from '../../src/components/ui/FormField'
import ScreenGradientLayout from '../../src/components/ui/ScreenGradientLayout'
import { ApiError } from '../../src/lib/api'
import { useAuth } from '../../src/providers/AuthProvider'
import { colors, space, type as typography } from '../../src/theme'
import { withAppFont } from '../../src/lib/typography'

export default function DeleteAccountScreen() {
  const { t } = useTranslation()
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
      setError(exception instanceof ApiError ? exception.message : t('deleteAccount.error'))
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = confirmation === 'DELETE' && (!needsPassword || password.length > 0) && !submitting

  return (
    <ScreenGradientLayout scrollable contentContainerStyle={{ padding: space.screenX, paddingTop: 24 }}>
      <Text style={typography.hero}>{t('deleteAccount.title')}</Text>
      <Text style={{ ...typography.body, marginTop: 10 }}>
        {t('deleteAccount.warning')}
      </Text>

      <View style={{ marginTop: space.sectionY, gap: 12 }}>
        <FormField
          label={t('deleteAccount.confirmLabel')}
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="DELETE"
        />

        {needsPassword ? (
          <FormField
            label={t('deleteAccount.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t('deleteAccount.passwordPlaceholder')}
          />
        ) : null}

        {error ? <Text style={withAppFont({ color: colors.danger, fontWeight: '600' })}>{error}</Text> : null}

        <AppButton
          label={submitting ? t('deleteAccount.deleting') : t('deleteAccount.confirm')}
          onPress={() => void handleDelete()}
          disabled={!canSubmit}
          variant="ghost"
          style={{ marginTop: 8 }}
        />

        <AppButton label={t('deleteAccount.cancel')} onPress={() => router.back()} variant="danger" />
      </View>
    </ScreenGradientLayout>
  )
}
