import { ActivityIndicator, Image, Text, View } from 'react-native'

import { colors } from '../../theme'

const flotoryIcon = require('../../../assets/flotory-icon.png')

interface FlotoryBootScreenProps {
  message?: string
}

export default function FlotoryBootScreen({ message }: FlotoryBootScreenProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
        paddingHorizontal: 32,
      }}
    >
      <Image source={flotoryIcon} style={{ width: 96, height: 96, borderRadius: 22 }} resizeMode="contain" />
      <Text style={{ marginTop: 16, fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 }}>
        Flotory
      </Text>
      {message ? <Text style={{ marginTop: 8, fontSize: 15, color: colors.inkMuted, textAlign: 'center' }}>{message}</Text> : null}
      <ActivityIndicator style={{ marginTop: 28 }} color={colors.ink} />
    </View>
  )
}
