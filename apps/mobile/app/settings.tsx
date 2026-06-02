import { Pressable, Text, View } from 'react-native'

import ScreenGradientLayout from '../src/components/ui/ScreenGradientLayout'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, radius, space, type as typography } from '../src/theme'

function ProfileRow({ label }: { label: string }) {
  return (
    <Pressable style={{ paddingVertical: 12 }}>
      <Text style={{ fontSize: 16, color: colors.ink, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  )
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth()

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
            <Text style={{ color: colors.primaryText, fontSize: 28, fontWeight: '800' }}>{initials}</Text>
          </View>
          <Text style={{ marginTop: 14, fontSize: 22, fontWeight: '700', color: colors.ink }}>{user?.name ?? 'Guest'}</Text>
          <Text style={{ ...typography.body, marginTop: 4 }}>{user?.email}</Text>
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
          <Text style={{ ...typography.label, marginTop: 14, marginBottom: 4 }}>ACCOUNT</Text>
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
            <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 16 }}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    </ScreenGradientLayout>
  )
}
