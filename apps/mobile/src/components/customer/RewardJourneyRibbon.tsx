import { Text, View } from 'react-native'

import { colors } from '../../theme'
import { withAppFont } from '../../lib/typography'

interface RewardJourneyRibbonProps {
  value: number
  target: number
  checkpoints?: number[]
}

export default function RewardJourneyRibbon({ value, target, checkpoints = [] }: RewardJourneyRibbonProps) {
  const cap = Math.max(target, 1)
  const progress = Math.min(Math.max(value / cap, 0), 1)
  const ordered = checkpoints.length ? [...checkpoints].sort((a, b) => a - b) : [target]

  return (
    <View>
      <View
        style={{
          height: 14,
          borderRadius: 999,
          backgroundColor: colors.surfaceMuted,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: '100%',
            borderRadius: 999,
            backgroundColor: colors.primary,
          }}
        />
      </View>

      <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
        {ordered.map((checkpoint) => {
          const unlocked = value >= checkpoint
          const isNext = !unlocked && checkpoint === ordered.find((point) => value < point)

          return (
            <View
              key={checkpoint}
              style={{
                paddingVertical: 4,
                paddingHorizontal: 9,
                borderRadius: 999,
                backgroundColor: unlocked ? colors.accentSoft : colors.surface,
                borderWidth: 1,
                borderColor: unlocked ? colors.accentBorder : colors.border,
              }}
            >
              <Text
                style={withAppFont({
                  fontSize: 11,
                  fontWeight: '700',
                  color: unlocked ? colors.accent : colors.inkMuted,
                })}
              >
                {isNext ? `Next ${checkpoint}` : unlocked ? `Unlocked ${checkpoint}` : `${checkpoint}`}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
