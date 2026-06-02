import { View } from 'react-native'

import { colors, media, radius } from '../../theme'
import ImageWithOverlay from './ImageWithOverlay'

interface CoverImageProps {
  uri?: string | null
}

export default function CoverImage({ uri }: CoverImageProps) {
  if (!uri) {
    return (
      <View
        style={{
          width: '100%',
          height: media.coverHeight,
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
        height: media.coverHeight,
        borderTopLeftRadius: radius.mediaTop,
        borderTopRightRadius: radius.mediaTop,
      }}
    />
  )
}
