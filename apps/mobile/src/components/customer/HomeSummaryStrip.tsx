import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows } from '../../theme'

interface HomeSummaryStripProps {
  cardCount: number
  readyCount: number
  stampsToGo: number | null
}

function SummaryPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: radius.image,
        backgroundColor: accent ? colors.accentSoft : colors.surface,
        borderWidth: 1,
        borderColor: accent ? colors.accentBorder : colors.border,
        ...shadows.sm,
      }}
    >
      <Text style={withAppFont({ fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 })}>
        {value}
      </Text>
      <Text
        style={withAppFont({ marginTop: 2, fontSize: 11, fontWeight: '700', color: colors.inkMuted })}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

export default function HomeSummaryStrip({ cardCount, readyCount, stampsToGo }: HomeSummaryStripProps) {
  const { t } = useTranslation()

  if (cardCount === 0 && readyCount === 0) {
    return null
  }

  const pills: Array<{ label: string; value: string; accent?: boolean }> = [
    {
      label: t('home.loyaltyCard', { count: cardCount }),
      value: String(cardCount),
    },
  ]

  if (readyCount > 0) {
    pills.push({
      label: t('home.readyNow'),
      value: String(readyCount),
      accent: true,
    })
  } else if (stampsToGo != null && stampsToGo > 0) {
    pills.push({
      label: t('home.stampToGo', { count: stampsToGo }),
      value: String(stampsToGo),
    })
  }

  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {pills.map((pill) => (
        <SummaryPill key={pill.label} label={pill.label} value={pill.value} accent={pill.accent} />
      ))}
    </View>
  )
}
