import { View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

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
        backgroundColor="#FFFFFF"
        color="#111827"
      />
    </View>
  )
}

