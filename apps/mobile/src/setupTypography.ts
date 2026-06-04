import { Text, TextInput, type TextStyle } from 'react-native'

import { fonts } from './lib/typography'

type ComponentWithDefaultProps = {
  defaultProps?: { style?: TextStyle | TextStyle[] }
}

/**
 * Apply Plus Jakarta Sans as the app default before any screen renders.
 * Inline styles with fontWeight should use withAppFont() for the matching font file.
 */
export function applyDefaultAppTypography() {
  const textComponent = Text as typeof Text & ComponentWithDefaultProps
  const inputComponent = TextInput as typeof TextInput & ComponentWithDefaultProps

  textComponent.defaultProps = {
    ...textComponent.defaultProps,
    style: { fontFamily: fonts.regular },
  }

  inputComponent.defaultProps = {
    ...inputComponent.defaultProps,
    style: { fontFamily: fonts.regular },
  }
}

export { fontFamilyForWeight, fonts, withAppFont } from './lib/typography'
