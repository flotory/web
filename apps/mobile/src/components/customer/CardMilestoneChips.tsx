import { Ionicons } from '@expo/vector-icons'
import { ScrollView, Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius } from '../../theme'
import type { MilestoneProgress } from '../../types/loyalty'

interface CardMilestoneChipsProps {
  milestones: MilestoneProgress[]
  stamps: number
}

export default function CardMilestoneChips({ milestones, stamps }: CardMilestoneChipsProps) {
  if (!milestones.length) return null

  return (
    <View style={{ marginTop: 20 }}>
      <Text style={withAppFont({ fontSize: 13, fontWeight: '700', color: colors.inkMuted })}>Reward milestones</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingTop: 10, paddingRight: 4 }}
      >
        {milestones.map((milestone) => {
          const reached = stamps >= milestone.required_stamps

          return (
            <View
              key={milestone.id}
              style={{
                minWidth: 118,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: radius.image,
                backgroundColor: reached ? colors.accentSoft : colors.surface,
                borderWidth: 1,
                borderColor: reached ? colors.accentBorder : colors.discoverCardBorder,
              }}
            >
              <Ionicons
                name={reached ? 'checkmark-circle' : 'lock-closed-outline'}
                size={20}
                color={reached ? colors.accentActive : colors.inkSoft}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={withAppFont({
                    fontSize: 15,
                    fontWeight: '800',
                    color: reached ? colors.accentActive : colors.ink,
                  })}
                >
                  {milestone.required_stamps}
                </Text>
                <Text
                  style={withAppFont({
                    marginTop: 2,
                    fontSize: 12,
                    fontWeight: '500',
                    color: reached ? colors.accentActive : colors.inkMuted,
                  })}
                  numberOfLines={2}
                >
                  {milestone.title}
                </Text>
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}
