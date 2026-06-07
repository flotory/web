import { Ionicons } from '@expo/vector-icons'
import { Platform, View } from 'react-native'

import { colors, shadows, tabBarQr } from '../../theme'

interface TabBarQrButtonProps {
  focused?: boolean
}

function ScannerCorner({
  top,
  left,
  right,
  bottom,
}: {
  top?: number
  left?: number
  right?: number
  bottom?: number
}) {
  const inset = 8
  const arm = 12
  const stroke = 2.5

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left,
        right,
        bottom,
        width: arm,
        height: arm,
        borderTopWidth: top != null ? stroke : 0,
        borderLeftWidth: left != null ? stroke : 0,
        borderRightWidth: right != null ? stroke : 0,
        borderBottomWidth: bottom != null ? stroke : 0,
        borderColor: colors.accent,
        borderTopLeftRadius: top != null && left != null ? 4 : 0,
        borderTopRightRadius: top != null && right != null ? 4 : 0,
        borderBottomLeftRadius: bottom != null && left != null ? 4 : 0,
        borderBottomRightRadius: bottom != null && right != null ? 4 : 0,
        ...(top != null ? { top: inset } : {}),
        ...(left != null ? { left: inset } : {}),
        ...(right != null ? { right: inset } : {}),
        ...(bottom != null ? { bottom: inset } : {}),
      }}
    />
  )
}

export default function TabBarQrButton({ focused }: TabBarQrButtonProps) {
  const size = tabBarQr.size
  const radius = 18

  return (
    <View
      style={{
        width: size + 10,
        height: size + 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: tabBarQr.lift + 4,
      }}
    >
      <View
        style={{
          width: size + 6,
          height: size + 6,
          borderRadius: radius + 4,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          ...(Platform.OS === 'ios' ? shadows.sm : { elevation: 2 }),
        }}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: focused ? colors.primarySoft : colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <ScannerCorner top={0} left={0} />
          <ScannerCorner top={0} right={0} />
          <ScannerCorner bottom={0} left={0} />
          <ScannerCorner bottom={0} right={0} />
          <Ionicons name="qr-code" size={tabBarQr.iconSize} color={colors.primaryText} />
        </View>
      </View>
    </View>
  )
}
