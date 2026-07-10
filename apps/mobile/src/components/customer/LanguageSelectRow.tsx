import { Ionicons } from '@expo/vector-icons'
import { ActionSheetIOS, Alert, Platform, Pressable, Text, View } from 'react-native'

import { localeOptions, type AppLocale } from '../../i18n'
import { withAppFont } from '../../lib/typography'
import { colors } from '../../theme'

interface LanguageSelectRowProps {
  label: string
  subtitle?: string
  value: AppLocale
  onChange: (locale: AppLocale) => void
}

export default function LanguageSelectRow({ label, subtitle, value, onChange }: LanguageSelectRowProps) {
  const selectedLabel = localeOptions.find((option) => option.value === value)?.label ?? 'English'

  function openPicker() {
    const optionLabels = localeOptions.map((option) => option.label)
    const cancelLabel = 'Cancel'

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...optionLabels, cancelLabel],
          cancelButtonIndex: optionLabels.length,
        },
        (index) => {
          if (index === undefined || index >= localeOptions.length) {
            return
          }
          onChange(localeOptions[index].value)
        },
      )
      return
    }

    Alert.alert(
      label,
      subtitle,
      [
        ...localeOptions.map((option) => ({
          text: option.label,
          onPress: () => onChange(option.value),
        })),
        { text: cancelLabel, style: 'cancel' as const },
      ],
    )
  }

  return (
    <Pressable
      onPress={openPicker}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        opacity: pressed ? 0.88 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 13,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="language-outline" size={20} color={colors.accentActive} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={withAppFont({ fontSize: 16, fontWeight: '700', color: colors.ink })}>{label}</Text>
        {subtitle ? (
          <Text style={withAppFont({ marginTop: 2, fontSize: 13, color: colors.inkMuted, lineHeight: 18 })}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={withAppFont({ fontSize: 15, fontWeight: '700', color: colors.accentActive })}>{selectedLabel}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.inkSoft} />
      </View>
    </Pressable>
  )
}
