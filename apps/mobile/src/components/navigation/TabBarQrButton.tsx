import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
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
        borderColor: 'rgba(245, 208, 138, 0.92)',
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
          width: size + 8,
          height: size + 8,
          borderRadius: radius + 6,
          backgroundColor: '#F5D08A',
          alignItems: 'center',
          justifyContent: 'center',
          ...(Platform.OS === 'ios' ? shadows.button : { elevation: 6 }),
        }}
      >
        <View
          style={{
            width: size + 4,
            height: size + 4,
            borderRadius: radius + 4,
            backgroundColor: '#FFFBF5',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LinearGradient
            colors={focused ? ['#334155', '#0F172A', '#1E293B'] : ['#1E293B', '#0F172A', '#172033']}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={{
              width: size,
              height: size,
              borderRadius: radius,
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
          </LinearGradient>
        </View>
      </View>
    </View>
  )
}
