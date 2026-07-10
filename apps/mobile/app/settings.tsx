import { Redirect, useFocusEffect, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { useCallback, useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import ProfileMenuRow from '../src/components/customer/ProfileMenuRow'
import LanguageSelectRow from '../src/components/customer/LanguageSelectRow'
import ScreenGradientLayout from '../src/components/ui/ScreenGradientLayout'
import { useCustomerCards } from '../src/hooks/useCustomerCards'
import { apiRequest } from '../src/lib/api'
import { webAppOrigin } from '../src/lib/config'
import { useAuth } from '../src/providers/AuthProvider'
import { type AppLocale } from '../src/i18n'
import { useLocalePreference } from '../src/providers/LocaleProvider'
import { colors, radius, space, type as typography } from '../src/theme'
import { profileDisplayName, profileInitials } from '../src/lib/profileDisplay'
import { withAppFont } from '../src/lib/typography'

export default function SettingsScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { locale, setLocale } = useLocalePreference()
  const { user, signOut, refreshUser, token, booting } = useAuth()
  const cardsQuery = useCustomerCards({ refetchOnFocus: Boolean(token) })

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return
      }
      void refreshUser()
    }, [refreshUser, token]),
  )

  const stats = useMemo(() => {
    const cards = cardsQuery.data ?? []
    return {
      venues: cards.length,
      stamps: cards.reduce((sum, card) => sum + (card.summary?.stamps ?? card.stamps), 0),
      rewards: cards.reduce((sum, card) => sum + (card.summary?.pending_rewards_count ?? 0), 0),
    }
  }, [cardsQuery.data])

  const displayName = profileDisplayName(user)
  const initials = profileInitials(user)

  const webOrigin = webAppOrigin()

  function openWeb(path: string) {
    void Linking.openURL(`${webOrigin}${path}`)
  }

  async function handleSignOut() {
    await signOut()
    router.replace('/(customer)/venues')
  }

  async function handleLocaleChange(nextLocale: AppLocale) {
    await setLocale(nextLocale)
    if (!token) return

    await apiRequest('/auth/locale', {
      method: 'PUT',
      token,
      body: { locale: nextLocale },
    }).catch(() => undefined)
  }

  if (!booting && !token) {
    return <Redirect href="/(customer)/venues" />
  }

  return (
    <ScreenGradientLayout scrollable tabBarInset>
      <View style={{ paddingHorizontal: space.screenX, paddingBottom: space.sectionY }}>
        <Text style={typography.hero}>{t('settings.profile')}</Text>

        <View style={{ marginTop: space.sectionY, alignItems: 'center' }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={withAppFont({ color: colors.primaryText, fontSize: 28, fontWeight: '800' })}>{initials}</Text>
          </View>
          <Text style={withAppFont({ marginTop: 14, fontSize: 22, fontWeight: '700', color: colors.ink })}>
            {displayName}
          </Text>
          <Text style={{ ...typography.body, marginTop: 4 }}>{user?.email}</Text>
        </View>

        <View style={{ marginTop: space.sectionY, flexDirection: 'row', gap: 10 }}>
          {[
            { label: t('settings.venues'), value: String(stats.venues), accent: false },
            { label: t('settings.stamps'), value: String(stats.stamps), accent: false },
            { label: t('settings.ready'), value: String(stats.rewards), accent: stats.rewards > 0 },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text
                style={withAppFont({
                  fontSize: 22,
                  fontWeight: '800',
                  color: item.accent ? colors.accentActive : colors.ink,
                })}
              >
                {item.value}
              </Text>
              <Text style={{ ...typography.caption, marginTop: 4 }}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View
          style={{
            marginTop: space.sectionY,
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            paddingHorizontal: space.cardPad,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ ...typography.label, marginTop: 14, marginBottom: 4 }}>{t('settings.account')}</Text>
          <ProfileMenuRow
            icon="notifications-outline"
            label={t('settings.notifications')}
            subtitle={t('settings.notificationSubtitle')}
            onPress={() => router.push('/(customer)/notifications')}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <LanguageSelectRow
            label={t('settings.language')}
            subtitle={t('settings.languageSubtitle')}
            value={locale}
            onChange={(nextLocale) => void handleLocaleChange(nextLocale)}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <ProfileMenuRow
            icon="lock-closed-outline"
            label={t('settings.changePassword')}
            onPress={() => router.push('/profile/change-password')}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <ProfileMenuRow
            icon="globe-outline"
            label={t('settings.about')}
            onPress={() => openWeb('/')}
            external
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <ProfileMenuRow
            icon="trash-outline"
            label={t('settings.deleteAccount')}
            subtitle={t('settings.deleteAccountSubtitle')}
            onPress={() => router.push('/profile/delete-account')}
            destructive
          />
        </View>

        <View style={{ marginTop: space.sectionY }}>
          <Pressable
            onPress={() => void handleSignOut()}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: colors.dangerSoft,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Text style={withAppFont({ color: colors.danger, fontWeight: '800', fontSize: 16 })}>{t('settings.signOut')}</Text>
          </Pressable>
        </View>
      </View>
    </ScreenGradientLayout>
  )
}
