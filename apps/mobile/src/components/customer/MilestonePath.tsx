import { Text, View } from 'react-native'

import { colors } from '../../theme'

interface MilestonePathProps {
  collected: number
  total: number
  milestoneStamp?: number
}

export default function MilestonePath({ collected, total, milestoneStamp }: MilestonePathProps) {
  const giftAt = milestoneStamp ?? total

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {Array.from({ length: total }, (_, index) => index + 1).map((stamp) => {
        const filled = stamp <= collected
        const isGift = stamp === giftAt

        let backgroundColor = '#FFFFFF'
        let borderColor = '#E2E8F0'
        let textColor = '#94A3B8'

        if (isGift && filled) {
          backgroundColor = '#FEF3C7'
          borderColor = '#FDE68A'
          textColor = '#B45309'
        } else if (isGift) {
          backgroundColor = '#F1F5F9'
          borderColor = '#E2E8F0'
          textColor = '#94A3B8'
        } else if (filled) {
          backgroundColor = colors.ink
          borderColor = colors.ink
          textColor = '#FFFFFF'
        }

        const content = isGift ? '🎁' : filled ? '✓' : String(stamp)

        return (
          <View
            key={stamp}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor,
              borderWidth: 1,
              borderColor,
            }}
          >
            <Text style={{ fontSize: isGift ? 16 : 14, fontWeight: '800', color: textColor }}>{content}</Text>
          </View>
        )
      })}
    </View>
  )
}
