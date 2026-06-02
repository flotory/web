import { Text, View } from 'react-native'

import { type as typography } from '../../theme'

interface ScreenHeaderProps {
  title: string
  subtitle: string
  pretitle?: string
}

export default function ScreenHeader({ title, subtitle, pretitle }: ScreenHeaderProps) {
  return (
    <View>
      {pretitle ? <Text style={{ ...typography.caption, fontWeight: '600' }}>{pretitle}</Text> : null}
      <Text style={{ ...typography.hero, marginTop: pretitle ? 6 : 0 }}>{title}</Text>
      <Text style={{ ...typography.body, marginTop: 6 }}>{subtitle}</Text>
    </View>
  )
}
