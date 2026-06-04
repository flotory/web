import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Pressable, Text, View } from 'react-native'

import { colors, radius, shadows, space, type as typography } from '../../theme'
import { withAppFont } from '../../lib/typography'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface QuickAction {
  id: string
  label: string
  subtitle: string
  icon: IoniconName
  tint: string
  onPress: () => void
}

interface HomeQuickActionsProps {
  actions: QuickAction[]
}

export default function HomeQuickActions({ actions }: HomeQuickActionsProps) {
  return (
    <View style={{ paddingHorizontal: space.screenX }}>
      <Text style={typography.section}>Quick actions</Text>
      <View style={{ marginTop: 12, gap: 10 }}>
        {actions.map((action) => (
          <Pressable
            key={action.id}
            onPress={action.onPress}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: radius.card,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.94 : 1,
              },
              shadows.sm,
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: action.tint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={action.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={withAppFont({ fontSize: 16, fontWeight: '800', color: colors.ink })}>{action.label}</Text>
              <Text style={{ marginTop: 2, fontSize: 13, color: colors.inkMuted }}>{action.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
          </Pressable>
        ))}
      </View>
    </View>
  )
}
