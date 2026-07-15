import { Text, type TextProps, type TextStyle } from 'react-native'

import { withAppFont } from '../../lib/typography'

/** Typography-aware Text — prefer `withAppFont` on Text or `type.*` presets for one-offs. */
export default function AppText({ style, ...props }: TextProps) {
  return <Text {...props} style={withAppFont((style ?? {}) as TextStyle)} />
}
