import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import PrimaryButton from '../../src/components/ui/PrimaryButton'
import ScreenGradientLayout from '../../src/components/ui/ScreenGradientLayout'
import { StickyBackHeader } from '../../src/components/ui/StickyBackButton'
import { ApiError } from '../../src/lib/api'
import { updatePassword } from '../../src/lib/profileApi'
import { withAppFont } from '../../src/lib/typography'
import { useAuth } from '../../src/providers/AuthProvider'
import { colors, radius, shadows, space, type as typography } from '../../src/theme'

function PasswordField({
  label,
  value,
  onChangeText,
  autoComplete,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  autoComplete?: 'password' | 'password-new' | 'current-password'
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={typography.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        placeholderTextColor={colors.inkSoft}
        style={withAppFont({
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.image,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          color: colors.ink,
          ...shadows.sm,
        })}
      />
    </View>
  )
}

export default function ChangePasswordScreen() {
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
      setError('Sign in required.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
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
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Password updated successfully.')
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : 'Could not update password.')
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
          <Text style={typography.label}>Security</Text>
          <Text style={{ ...typography.hero, marginTop: 6, fontSize: 28, lineHeight: 34 }}>Change password</Text>
          <Text style={{ ...typography.body, marginTop: 8, fontSize: 15 }}>
            Signed in as {user?.email ?? 'your account'}.
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            autoComplete="current-password"
          />
          <PasswordField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            autoComplete="password-new"
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoComplete="password-new"
          />
        </View>

        {error ? (
          <Text style={withAppFont({ color: colors.danger, fontWeight: '600', fontSize: 14 })}>{error}</Text>
        ) : null}
        {success ? (
          <Text style={withAppFont({ color: colors.successText, fontWeight: '600', fontSize: 14 })}>{success}</Text>
        ) : null}

        <PrimaryButton
          label={submitting ? 'Saving…' : 'Update password'}
          onPress={() => void handleSubmit()}
          disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
        />
      </ScrollView>
    </ScreenGradientLayout>
  )
}
