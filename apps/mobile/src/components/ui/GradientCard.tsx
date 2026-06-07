import { type PropsWithChildren, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'

import { colors, media, radius, shadows, space } from '../../theme'

interface GradientCardProps extends PropsWithChildren {
  header?: ReactNode
  /** Content pinned on the cover/content seam (e.g. avatar over cover) */
  overlap?: ReactNode
  /** Half-height reserved below the cover for overlap content */
  overlapInset?: number
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  padding?: number
}

export default function GradientCard({
  children,
  header,
  overlap,
  overlapInset = 22,
  style,
  contentStyle,
  padding = space.cardPad,
}: GradientCardProps) {
  const contentTopPad = header && overlap ? overlapInset : padding

  return (
    <View
      style={[
        {
          position: 'relative',
          borderRadius: radius.card,
          overflow: 'hidden',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.carousel,
        },
        style,
      ]}
    >
      {header}
      <View style={[{ padding, paddingTop: contentTopPad, backgroundColor: colors.surface }, contentStyle]}>
        {children}
      </View>
      {header && overlap ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: media.coverHeight - overlapInset,
            left: padding,
            zIndex: 10,
            elevation: 8,
          }}
        >
          {overlap}
        </View>
      ) : null}
    </View>
  )
}
