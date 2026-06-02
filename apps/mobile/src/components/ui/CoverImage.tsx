import { View } from 'react-native'

import { colors, media, radius } from '../../theme'
import ImageWithOverlay from './ImageWithOverlay'

interface CoverImageProps {
  uri?: string | null
  height?: number
}

export default function CoverImage({ uri, height = media.coverHeight }: CoverImageProps) {
  if (!uri) {
    return (
      <View
        style={{
          width: '100%',
          height,
          backgroundColor: colors.surfaceMuted,
        }}
      />
    )
  }

  return (
    <ImageWithOverlay
      uri={uri}
      style={{
        width: '100%',
        height,
        borderTopLeftRadius: radius.mediaTop,
        borderTopRightRadius: radius.mediaTop,
      }}
    />
  )
}
