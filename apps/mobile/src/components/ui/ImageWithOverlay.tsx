import { Image, View, type ImageStyle } from 'react-native'

interface ImageWithOverlayProps {
  uri: string
  style: ImageStyle
}

export default function ImageWithOverlay({ uri, style }: ImageWithOverlayProps) {
  return (
    <View>
      <Image source={{ uri }} style={style} resizeMode="cover" />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: 'rgba(5, 13, 30, 0.45)',
        }}
      />
    </View>
  )
}
