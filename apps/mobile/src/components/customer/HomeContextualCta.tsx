import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius, space } from '../../theme'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface HomeContextualCtaProps {
  label: string
  hint: string
  icon: IoniconName
  onPress: () => void
}

export default function HomeContextualCta({ label, hint, icon, onPress }: HomeContextualCtaProps) {
  return (
    <View style={{ paddingHorizontal: space.screenX }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${hint}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: radius.card,
          backgroundColor: colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(5, 13, 30, 0.08)',
          opacity: pressed ? 0.94 : 1,
          transform: [{ scale: pressed ? 0.992 : 1 }],
        })}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: colors.accentSoft,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: 'rgba(215, 163, 93, 0.22)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={22} color={colors.accentActive} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={withAppFont({ fontSize: 15, fontWeight: '800', color: colors.ink })} numberOfLines={1}>
            {label}
          </Text>
          <Text style={withAppFont({ fontSize: 13, fontWeight: '500', color: colors.inkMuted })} numberOfLines={1}>
            {hint}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
      </Pressable>
    </View>
  )
}
