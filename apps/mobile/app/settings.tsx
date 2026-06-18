import { useFocusEffect, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { useCallback, useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'

import ProfileMenuRow from '../src/components/customer/ProfileMenuRow'
import ScreenGradientLayout from '../src/components/ui/ScreenGradientLayout'
import { useCustomerCards } from '../src/hooks/useCustomerCards'
import { webAppOrigin } from '../src/lib/config'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, radius, space, type as typography } from '../src/theme'
import { withAppFont } from '../src/lib/typography'

export default function SettingsScreen() {
  const router = useRouter()
  const { user, signOut, refreshUser } = useAuth()
  const cardsQuery = useCustomerCards({ refetchOnFocus: true })

  useFocusEffect(
    useCallback(() => {
      void refreshUser()
    }, [refreshUser]),
  )

  const stats = useMemo(() => {
    const cards = cardsQuery.data ?? []
    return {
      venues: cards.length,
      stamps: cards.reduce((sum, card) => sum + (card.summary?.stamps ?? card.stamps), 0),
      rewards: cards.reduce((sum, card) => sum + (card.summary?.pending_rewards_count ?? 0), 0),
    }
  }, [cardsQuery.data])

  const initials = (user?.name ?? '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const webOrigin = webAppOrigin()

  function openWeb(path: string) {
    void Linking.openURL(`${webOrigin}${path}`)
  }

  return (
    <ScreenGradientLayout scrollable tabBarInset>
      <View style={{ paddingHorizontal: space.screenX, paddingBottom: space.sectionY }}>
        <Text style={typography.hero}>Profile</Text>

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
            {user?.name ?? 'Guest'}
          </Text>
          <Text style={{ ...typography.body, marginTop: 4 }}>{user?.email}</Text>
        </View>

        <View style={{ marginTop: space.sectionY, flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Venues', value: String(stats.venues), accent: false },
            { label: 'Stamps', value: String(stats.stamps), accent: false },
            { label: 'Ready', value: String(stats.rewards), accent: stats.rewards > 0 },
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
          <Text style={{ ...typography.label, marginTop: 14, marginBottom: 4 }}>Account</Text>
          <ProfileMenuRow
            icon="notifications-outline"
            label="Notifications"
            subtitle="Offers and reward updates"
            onPress={() => router.push('/(customer)/notifications')}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <ProfileMenuRow
            icon="lock-closed-outline"
            label="Change password"
            onPress={() => router.push('/profile/change-password')}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <ProfileMenuRow
            icon="key-outline"
            label="Forgot password"
            onPress={() => openWeb('/forgot-password')}
            external
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <ProfileMenuRow
            icon="globe-outline"
            label="About Flotory"
            onPress={() => openWeb('/')}
            external
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <ProfileMenuRow
            icon="trash-outline"
            label="Delete account"
            subtitle="Permanently remove your data"
            onPress={() => router.push('/profile/delete-account')}
            destructive
          />
        </View>

        <View style={{ marginTop: space.sectionY }}>
          <Pressable
            onPress={() => void signOut()}
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
            <Text style={withAppFont({ color: colors.danger, fontWeight: '800', fontSize: 16 })}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    </ScreenGradientLayout>
  )
}
