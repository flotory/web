import { Image, View, type ImageStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

interface ImageWithOverlayProps {
  uri: string
  style: ImageStyle
}

export default function ImageWithOverlay({ uri, style }: ImageWithOverlayProps) {
  return (
    <View>
      <Image source={{ uri }} style={style} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />
    </View>
  )
}
