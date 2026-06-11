import { Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, type as typography } from '../../theme'

interface HomeSectionHeaderProps {
  title: string
  label?: string
  trailing?: string
}

export default function HomeSectionHeader({ title, label, trailing }: HomeSectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        {label ? <Text style={typography.label}>{label}</Text> : null}
        <Text style={{ ...typography.section, marginTop: label ? 6 : 0 }}>{title}</Text>
      </View>
      {trailing ? (
        <Text style={withAppFont({ fontSize: 13, fontWeight: '600', color: colors.inkSoft, paddingBottom: 2 })}>
          {trailing}
        </Text>
      ) : null}
    </View>
  )
}
