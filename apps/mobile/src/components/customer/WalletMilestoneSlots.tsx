import { Ionicons } from '@expo/vector-icons'
import { View } from 'react-native'

import { colors } from '../../theme'

interface WalletMilestoneSlotsProps {
  filled: number
  milestoneStamp: number
  maxVisible?: number
}

const CELL_SIZE = 20

export default function WalletMilestoneSlots({ filled, milestoneStamp, maxVisible = 10 }: WalletMilestoneSlotsProps) {
  const slots = Math.min(Math.max(milestoneStamp, 1), maxVisible)
  const filledCount = Math.min(Math.max(filled, 0), slots)

  return (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
      {Array.from({ length: slots }).map((_, index) => {
        const stamp = index + 1
        const isGift = stamp === milestoneStamp
        const isFilled = stamp <= filledCount

        let backgroundColor = 'rgba(255,255,255,0.1)'
        let borderColor = 'rgba(255,255,255,0.25)'

        if (isGift) {
          backgroundColor = isFilled ? colors.accentSoft : 'rgba(255,255,255,0.1)'
          borderColor = colors.accentBorder
        } else if (isFilled) {
          backgroundColor = colors.accent
          borderColor = colors.accent
        }

        return (
          <View
            key={stamp}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              borderRadius: CELL_SIZE / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor,
              borderWidth: 1,
              borderColor,
            }}
          >
            {isGift ? (
              <Ionicons name="gift" size={11} color={isFilled ? colors.accentActive : colors.accent} />
            ) : isFilled ? (
              <Ionicons name="checkmark" size={11} color={colors.primary} />
            ) : null}
          </View>
        )
      })}
    </View>
  )
}
