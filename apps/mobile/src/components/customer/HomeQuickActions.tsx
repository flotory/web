import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Pressable, Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows, space } from '../../theme'
import HomeSectionHeader from '../ui/HomeSectionHeader'

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
      <HomeSectionHeader title="Quick actions" label="Do more" />
      <View style={{ marginTop: 14, flexDirection: 'row', gap: 10 }}>
        {actions.map((action) => (
          <Pressable
            key={action.id}
            onPress={action.onPress}
            style={({ pressed }) => [
              {
                flex: 1,
                minWidth: 0,
                paddingVertical: 16,
                paddingHorizontal: 10,
                borderRadius: radius.image,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                opacity: pressed ? 0.94 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
              shadows.sm,
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 15,
                backgroundColor: action.tint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={action.icon} size={22} color={colors.accentActive} />
            </View>
            <Text
              style={withAppFont({
                marginTop: 10,
                fontSize: 13,
                fontWeight: '800',
                color: colors.ink,
                textAlign: 'center',
              })}
              numberOfLines={2}
            >
              {action.label}
            </Text>
            <Text
              style={withAppFont({
                marginTop: 4,
                fontSize: 11,
                fontWeight: '500',
                color: colors.inkSoft,
                textAlign: 'center',
                lineHeight: 14,
              })}
              numberOfLines={2}
            >
              {action.subtitle}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
