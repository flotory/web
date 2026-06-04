import Svg, { Circle } from 'react-native-svg'

import { colors } from '../../theme'

interface ProgressRingProps {
  value: number
  max: number
  size?: number
}

export default function ProgressRing({ value, max, size = 56 }: ProgressRingProps) {
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = max > 0 ? Math.min(1, value / max) : 0
  const offset = circumference * (1 - progress)
  const center = size / 2

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={colors.progressTrack}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={colors.primary}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${center}, ${center}`}
      />
    </Svg>
  )
}
