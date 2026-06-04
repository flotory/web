import { Ionicons } from '@expo/vector-icons'
import { Platform, Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows, space } from '../../theme'

export interface VenueJoinMilestone {
  id: number
  title: string
  required_stamps: number
}

interface VenueJoinMilestonesProps {
  milestones: VenueJoinMilestone[]
}

export default function VenueJoinMilestones({ milestones }: VenueJoinMilestonesProps) {
  if (!milestones.length) return null

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.discoverCardBorder,
        padding: space.cardPad,
        ...(Platform.OS === 'ios' ? shadows.sm : { elevation: 1 }),
      }}
    >
      <Text style={withAppFont({ fontSize: 16, fontWeight: '800', color: colors.ink })}>Rewards you can earn</Text>
      <Text style={withAppFont({ marginTop: 4, fontSize: 13, color: colors.inkMuted, lineHeight: 18 })}>
        Collect stamps on each visit to unlock these milestones.
      </Text>
      <View style={{ marginTop: 14, gap: 10 }}>
        {milestones.map((milestone, index) => (
          <View
            key={milestone.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingBottom: index < milestones.length - 1 ? 10 : 0,
              borderBottomWidth: index < milestones.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: colors.lavender,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="gift-outline" size={18} color={colors.primarySoft} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={withAppFont({ fontSize: 15, fontWeight: '700', color: colors.ink })} numberOfLines={2}>
                {milestone.title}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: colors.surfaceMuted,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={withAppFont({ fontSize: 12, fontWeight: '700', color: colors.inkMuted })}>
                {milestone.required_stamps} stamps
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
