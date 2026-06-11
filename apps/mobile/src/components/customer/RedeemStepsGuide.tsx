import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows, space } from '../../theme'

type IoniconName = ComponentProps<typeof Ionicons>['name']

const STEPS: { icon: IoniconName; title: string; body: string }[] = [
  {
    icon: 'phone-portrait-outline',
    title: 'Show this screen',
    body: 'Hold your phone up at the counter so staff can see your reward.',
  },
  {
    icon: 'arrow-forward-circle-outline',
    title: 'Slide to confirm',
    body: 'When they are ready, slide the button below to redeem.',
  },
  {
    icon: 'cafe-outline',
    title: 'Enjoy your treat',
    body: 'Your reward is marked as used — no QR code needed.',
  },
]

export default function RedeemStepsGuide() {
  return (
    <View
      style={{
        padding: space.cardPad,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 16,
        ...shadows.sm,
      }}
    >
      <Text style={withAppFont({ fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: colors.inkSoft, textTransform: 'uppercase' })}>
        How it works
      </Text>

      {STEPS.map((step, index) => (
        <View key={step.title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              backgroundColor: index === 1 ? colors.accentSoft : colors.surfaceMuted,
              borderWidth: 1,
              borderColor: index === 1 ? colors.accentBorder : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={step.icon} size={20} color={index === 1 ? colors.accentActive : colors.ink} />
          </View>
          <View style={{ flex: 1, gap: 3, paddingTop: 2 }}>
            <Text style={withAppFont({ fontSize: 16, fontWeight: '800', color: colors.ink })}>{step.title}</Text>
            <Text style={withAppFont({ fontSize: 14, lineHeight: 20, color: colors.inkMuted })}>{step.body}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}
