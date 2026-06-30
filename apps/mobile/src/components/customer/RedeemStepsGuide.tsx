import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { withAppFont } from '../../lib/typography'
import { colors, radius, space } from '../../theme'

type IoniconName = ComponentProps<typeof Ionicons>['name']

const STEPS: { icon: IoniconName; titleKey: string; bodyKey: string }[] = [
  {
    icon: 'phone-portrait-outline',
    titleKey: 'redeem.showScreenTitle',
    bodyKey: 'redeem.showScreenBody',
  },
  {
    icon: 'arrow-forward-circle-outline',
    titleKey: 'redeem.slideTitle',
    bodyKey: 'redeem.slideBody',
  },
  {
    icon: 'cafe-outline',
    titleKey: 'redeem.enjoyTreatTitle',
    bodyKey: 'redeem.enjoyTreatBody',
  },
]

export default function RedeemStepsGuide() {
  const { t } = useTranslation()

  return (
    <View
      style={{
        padding: space.cardPad,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 16,
      }}
    >
      <Text style={withAppFont({ fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: colors.inkSoft, textTransform: 'uppercase' })}>
        {t('redeem.howItWorks')}
      </Text>

      {STEPS.map((step, index) => (
        <View key={step.titleKey} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
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
            <Text style={withAppFont({ fontSize: 16, fontWeight: '800', color: colors.ink })}>{t(step.titleKey)}</Text>
            <Text style={withAppFont({ fontSize: 14, lineHeight: 20, color: colors.inkMuted })}>{t(step.bodyKey)}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}
