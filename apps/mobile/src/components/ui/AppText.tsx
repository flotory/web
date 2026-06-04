import { Text, type TextProps, type TextStyle } from 'react-native'

import { withAppFont } from '../../lib/typography'

/**
 * Text that maps fontWeight to the correct Plus Jakarta Sans file.
 */
export default function AppText({ style, ...props }: TextProps) {
  const flat = Array.isArray(style) ? Object.assign({}, ...style) : (style ?? {})

  return <Text {...props} style={withAppFont(flat as TextStyle)} />
}
