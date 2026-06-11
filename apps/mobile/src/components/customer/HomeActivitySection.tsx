import { Text, View } from 'react-native'

import type { ActivityRow } from '../../types/loyalty'
import { withAppFont } from '../../lib/typography'
import { colors, space, type as typography } from '../../theme'
import HomeSectionHeader from '../ui/HomeSectionHeader'

interface HomeActivitySectionProps {
  activity: ActivityRow[]
}

export default function HomeActivitySection({ activity }: HomeActivitySectionProps) {
  if (activity.length === 0) {
    return null
  }

  return (
    <View style={{ paddingHorizontal: space.screenX }}>
      <HomeSectionHeader title="Recent activity" label="Your wallet" />
      <View style={{ marginTop: 14, gap: 12 }}>
        {activity.map((row) => (
          <View key={row.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={withAppFont({ flex: 1, fontSize: 16, color: colors.ink, fontWeight: '500' })} numberOfLines={2}>
              {row.label}
            </Text>
            <Text style={typography.caption}>{row.time}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
