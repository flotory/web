import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'

import PrimaryButton from '../src/components/ui/PrimaryButton'
import ScreenGradientLayout from '../src/components/ui/ScreenGradientLayout'
import { useCustomerCards } from '../src/hooks/useCustomerCards'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, radius, space, type as typography } from '../src/theme'
import { withAppFont } from '../src/lib/typography'

function ProfileRow({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable style={{ paddingVertical: 12 }} onPress={onPress}>
      <Text style={withAppFont({ fontSize: 16, color: colors.ink, fontWeight: '500' })}>{label}</Text>
    </Pressable>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const cardsQuery = useCustomerCards()
  const stats = useMemo(() => {
    const cards = cardsQuery.data ?? []
    const venues = cards.length
    const stamps = cards.reduce((sum, card) => sum + (card.summary?.stamps ?? card.stamps), 0)
    const rewards = cards.reduce((sum, card) => sum + (card.summary?.pending_rewards_count ?? 0), 0)
    return { venues, stamps, rewards }
  }, [cardsQuery.data])

  const initials = (user?.name ?? '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <ScreenGradientLayout scrollable tabBarInset>
      <View style={{ paddingHorizontal: space.screenX }}>
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
          <Text style={withAppFont({ marginTop: 14, fontSize: 22, fontWeight: '700', color: colors.ink })}>{user?.name ?? 'Guest'}</Text>
          <Text style={{ ...typography.body, marginTop: 4 }}>{user?.email}</Text>
        </View>

        <View
          style={{
            marginTop: space.sectionY,
            flexDirection: 'row',
            gap: 10,
          }}
        >
          {[
            { label: 'Venues', value: String(stats.venues) },
            { label: 'Stamps', value: String(stats.stamps) },
            { label: 'Ready', value: String(stats.rewards) },
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
              <Text style={withAppFont({ fontSize: 22, fontWeight: '800', color: colors.ink })}>{item.value}</Text>
              <Text style={{ ...typography.caption, marginTop: 4 }}>{item.label}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton
          label="Show My QR"
          onPress={() => router.navigate('/(customer)/qr')}
          style={{ marginTop: space.sectionY }}
        />

        <Pressable
          onPress={() => router.push('/(customer)/venues')}
          style={{ marginTop: 10, alignItems: 'center', paddingVertical: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Discover venues"
        >
          <Text style={withAppFont({ fontSize: 15, fontWeight: '700', color: colors.ink })}>Discover venues</Text>
        </Pressable>

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
          <Text style={{ ...typography.label, marginTop: 14, marginBottom: 4 }}>ACCOUNT</Text>
          <ProfileRow label="Discover venues" onPress={() => router.push('/(customer)/venues')} />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <ProfileRow label="Notifications" />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <ProfileRow label="Help" />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <ProfileRow label="Privacy" />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <ProfileRow label="About Flotory" />
        </View>

        <View style={{ marginTop: space.sectionY }}>
          <Text style={{ ...typography.label, marginBottom: 10 }}>DANGER ZONE</Text>
          <Pressable
            onPress={() => void signOut()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              borderWidth: 1,
              borderColor: colors.dangerSoft,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={withAppFont({ color: colors.danger, fontWeight: '800', fontSize: 16 })}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    </ScreenGradientLayout>
  )
}
