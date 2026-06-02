import { View } from 'react-native'

import { colors, radius } from '../../theme'

interface ProgressBarProps {
  value: number
  max: number
}

export default function ProgressBar({ value, max }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0

  return (
    <View style={{ height: 8, borderRadius: radius.button, backgroundColor: '#EDECE8', overflow: 'hidden' }}>
      <View style={{ width: `${percent}%`, height: '100%', borderRadius: radius.button, backgroundColor: colors.ink }} />
    </View>
  )
}
