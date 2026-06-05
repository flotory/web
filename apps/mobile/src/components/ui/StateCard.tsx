import { Ionicons } from '@expo/vector-icons'
import { Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius, space, type as typography } from '../../theme'
import PrimaryButton from './PrimaryButton'

interface StateCardAction {
  label: string
  onPress: () => void
}

interface StateCardProps {
  emoji?: string
  icon?: keyof typeof Ionicons.glyphMap
  iconColor?: string
  title: string
  message: string
  primaryAction?: StateCardAction
  secondaryAction?: StateCardAction
}

export default function StateCard({
  emoji,
  icon,
  iconColor = colors.inkMuted,
  title,
  message,
  primaryAction,
  secondaryAction,
}: StateCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: space.cardPad,
        alignItems: 'center',
      }}
    >
      {icon ? (
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={36} color={iconColor} />
        </View>
      ) : null}
      {emoji ? <Text style={{ fontSize: 48 }}>{emoji}</Text> : null}
      <Text style={{ ...typography.section, marginTop: icon || emoji ? 12 : 0, textAlign: 'center' }}>{title}</Text>
      <Text style={{ ...typography.body, marginTop: 8, textAlign: 'center' }}>{message}</Text>
      {primaryAction ? (
        <View style={{ marginTop: 18, alignSelf: 'stretch' }}>
          <PrimaryButton label={primaryAction.label} onPress={primaryAction.onPress} />
        </View>
      ) : null}
      {secondaryAction ? (
        <Text
          onPress={secondaryAction.onPress}
          style={withAppFont({
            marginTop: primaryAction ? 14 : 18,
            color: colors.inkMuted,
            fontWeight: '700',
            fontSize: 15,
          })}
        >
          {secondaryAction.label}
        </Text>
      ) : null}
    </View>
  )
}
