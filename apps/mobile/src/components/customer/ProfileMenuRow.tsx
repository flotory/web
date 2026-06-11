import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Pressable, Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors } from '../../theme'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface ProfileMenuRowProps {
  icon: IoniconName
  label: string
  subtitle?: string
  onPress?: () => void
  destructive?: boolean
  external?: boolean
}

export default function ProfileMenuRow({
  icon,
  label,
  subtitle,
  onPress,
  destructive = false,
  external = false,
}: ProfileMenuRowProps) {
  const tint = destructive ? colors.dangerSoft : colors.accentSoft
  const iconColor = destructive ? colors.danger : colors.accentActive
  const labelColor = destructive ? colors.danger : colors.ink

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        opacity: !onPress ? 0.5 : pressed ? 0.88 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 13,
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={withAppFont({ fontSize: 16, fontWeight: '700', color: labelColor })}>{label}</Text>
        {subtitle ? (
          <Text style={withAppFont({ marginTop: 2, fontSize: 13, color: colors.inkMuted, lineHeight: 18 })}>{subtitle}</Text>
        ) : null}
      </View>
      {onPress ? (
        <Ionicons
          name={external ? 'open-outline' : 'chevron-forward'}
          size={18}
          color={colors.inkSoft}
        />
      ) : null}
    </Pressable>
  )
}
