import { Ionicons } from '@expo/vector-icons'
import { Platform, View } from 'react-native'

import { colors, shadows, tabBarQr } from '../../theme'

interface TabBarQrButtonProps {
  focused?: boolean
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
          }}
        >
          <Ionicons
            name={focused ? 'radio' : 'radio-outline'}
            size={tabBarQr.iconSize}
            color={colors.primaryText}
          />
        </View>
      </View>
    </View>
  )
}
