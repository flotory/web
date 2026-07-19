import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { buildScanLandingQuickFacts, type ScanLandingMembership, type ScanLandingQuickFactIcon } from '../../lib/venueScanLanding'
import { withAppFont } from '../../lib/typography'
import { colors } from '../../theme'

type IoniconName = ComponentProps<typeof Ionicons>['name']

const iconMap: Record<ScanLandingQuickFactIcon, IoniconName> = {
  stamps: 'star-outline',
  rewards: 'gift-outline',
  join: 'phone-portrait-outline',
  nfc: 'scan-outline',
}

interface VenueScanQuickFactsProps {
  firstRewardStamps?: number | null
  milestoneCount: number
  membership?: ScanLandingMembership | null
}

export default function VenueScanQuickFacts({ firstRewardStamps, milestoneCount, membership }: VenueScanQuickFactsProps) {
  const { t } = useTranslation()
  const facts = buildScanLandingQuickFacts({ firstRewardStamps, milestoneCount, membership }, t)

  return (
    <View style={{ gap: 12 }}>
      {facts.map((fact) => (
        <View key={fact.text} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Ionicons name={iconMap[fact.icon]} size={18} color={colors.accent} style={{ marginTop: 1 }} />
          <Text style={withAppFont({ flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20, color: colors.ink })}>
            {fact.text}
          </Text>
        </View>
      ))}
    </View>
  )
}
