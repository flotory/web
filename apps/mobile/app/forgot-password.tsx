import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import FormField from '../src/components/ui/FormField'
import PrimaryButton from '../src/components/ui/PrimaryButton'
import ScreenGradientLayout from '../src/components/ui/ScreenGradientLayout'
import { StickyBackHeader } from '../src/components/ui/StickyBackButton'
import { ApiError } from '../src/lib/api'
import { requestPasswordReset } from '../src/lib/authApi'
import { withAppFont } from '../src/lib/typography'
import { colors, radius, space, type as typography } from '../src/theme'

function readParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0]
  }

  return ''
}

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { email: emailParam } = useLocalSearchParams<{ email?: string | string[] }>()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const initialEmail = readParam(emailParam).trim()
    if (initialEmail) {
      setEmail(initialEmail)
    }
  }, [emailParam])

  function handleBack() {
    if (router.canGoBack()) {
      router.back()
      return
    }

    router.replace('/login')
  }

  async function handleSubmit() {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError(t('forgotPassword.emailRequired'))
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const message = await requestPasswordReset(trimmedEmail)
      setSuccess(message)
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : t('forgotPassword.sendFailed'))
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
          <Text style={typography.label}>{t('forgotPassword.badge')}</Text>
          <Text style={{ ...typography.hero, marginTop: 6, fontSize: 28, lineHeight: 34 }}>{t('forgotPassword.title')}</Text>
          <Text style={{ ...typography.body, marginTop: 8, fontSize: 15 }}>{t('forgotPassword.subtitle')}</Text>
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
        ) : (
          <View style={{ gap: 16 }}>
            <FormField
              label={t('login.email')}
              testID="forgot-password-email-input"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder={t('login.email')}
              error={error || undefined}
            />

            <PrimaryButton
              label={submitting ? t('forgotPassword.sending') : t('forgotPassword.sendLink')}
              onPress={() => void handleSubmit()}
              disabled={submitting || !email.trim()}
            />
          </View>
        )}

        <Pressable onPress={handleBack} style={{ alignItems: 'center', paddingTop: 4 }}>
          <Text style={withAppFont({ color: colors.inkMuted, fontWeight: '600', fontSize: 14 })}>
            {t('forgotPassword.backToLogin')}
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenGradientLayout>
  )
}
