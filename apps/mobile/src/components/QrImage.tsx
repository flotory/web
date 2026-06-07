import { View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { colors } from '../theme'

export default function QrImage({ value, size = 200 }: { value: string; size?: number }) {
  if (!value) {
    return (
      <View style={{ width: size, height: size }} />
    )
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <QRCode
        value={value}
        size={size}
        quietZone={10}
        backgroundColor={colors.surface}
        color={colors.ink}
      />
    </View>
  )
}
