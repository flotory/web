import { Ionicons } from '@expo/vector-icons'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import {
  firstJoinEducationCopy,
  type FirstJoinEducationVariant,
} from '../../lib/nfcEducation'
import { withAppFont } from '../../lib/typography'
import { colors } from '../../theme'

interface FirstJoinNfcEducationProps {
  variant?: FirstJoinEducationVariant
}

export default function FirstJoinNfcEducation({ variant = 'qr_join' }: FirstJoinNfcEducationProps) {
  const { t } = useTranslation()
  const copy = firstJoinEducationCopy(variant, t)

  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.accentBorder,
        backgroundColor: colors.accentSoft,
        padding: 16,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
        </View>
        <Text style={withAppFont({ flex: 1, fontSize: 18, fontWeight: '800', color: colors.ink })}>
          {copy.title}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Ionicons name="scan-outline" size={18} color={colors.accent} style={{ marginTop: 2 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={withAppFont({ fontSize: 15, fontWeight: '800', color: colors.ink, lineHeight: 21 })}>
            {copy.headline}
          </Text>
          <Text style={withAppFont({ fontSize: 14, fontWeight: '500', lineHeight: 20, color: colors.inkMuted })}>
            {copy.body}
          </Text>
        </View>
      </View>
    </View>
  )
}
