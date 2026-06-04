import { View } from 'react-native'

interface WalletStampDashesProps {
  filled: number
  total: number
  maxVisible?: number
}

export default function WalletStampDashes({ filled, total, maxVisible = 10 }: WalletStampDashesProps) {
  const slots = Math.min(Math.max(total, 1), maxVisible)
  const filledCount = Math.min(Math.max(filled, 0), slots)

  return (
    <View style={{ flexDirection: 'row', gap: 5, marginTop: 10 }}>
      {Array.from({ length: slots }).map((_, index) => (
        <View
          key={index}
          style={{
            width: 22,
            height: 5,
            borderRadius: 3,
            backgroundColor: index < filledCount ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.28)',
          }}
        />
      ))}
    </View>
  )
}
