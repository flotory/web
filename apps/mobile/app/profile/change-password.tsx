import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import FormField from '../../src/components/ui/FormField'
import PrimaryButton from '../../src/components/ui/PrimaryButton'
import ScreenGradientLayout from '../../src/components/ui/ScreenGradientLayout'
import { StickyBackHeader } from '../../src/components/ui/StickyBackButton'
import { ApiError } from '../../src/lib/api'
import { updatePassword } from '../../src/lib/profileApi'
import { withAppFont } from '../../src/lib/typography'
import { useAuth } from '../../src/providers/AuthProvider'
import { colors, radius, space, type as typography } from '../../src/theme'

export default function ChangePasswordScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { token, user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleBack() {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace('/(customer)/settings')
  }

  async function handleSubmit() {
    if (!token) {
      setError(t('changePassword.signInRequired'))
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('changePassword.mismatch'))
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await updatePassword(token, {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      })
      setSuccess(t('changePassword.success'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : t('changePassword.updateError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScreenGradientLayout scrollable={false} flexContent tabBarInset={false} fixedHeader={null} paddingTop={0}>
      <StickyBackHeader onPress={handleBack} topInset={insets.top} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: space.screenX,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
          gap: space.sectionGap,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={typography.label}>{t('changePassword.eyebrow')}</Text>
          <Text style={{ ...typography.hero, marginTop: 6, fontSize: 28, lineHeight: 34 }}>{t('changePassword.title')}</Text>
          <Text style={{ ...typography.body, marginTop: 8, fontSize: 15 }}>
            {user?.email ? t('changePassword.signedInAs', { email: user.email }) : t('changePassword.subtitle')}
          </Text>
        </View>

        {success ? (
          <View
            style={{
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: colors.successBorder,
              backgroundColor: colors.successBg,
              padding: 16,
            }}
          >
            <Text style={withAppFont({ color: colors.successText, fontWeight: '600', fontSize: 14, lineHeight: 20 })}>
              {success}
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 16 }}>
          <FormField
            label={t('changePassword.currentPassword')}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
          />
          <FormField
            label={t('changePassword.newPassword')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password-new"
          />
          <FormField
            label={t('changePassword.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password-new"
            error={error || undefined}
          />

          <PrimaryButton
            label={submitting ? t('changePassword.saving') : t('changePassword.save')}
            onPress={() => void handleSubmit()}
            disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
          />
        </View>
      </ScrollView>
    </ScreenGradientLayout>
  )
}
