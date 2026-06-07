import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'

import { fonts, withAppFont } from '../../lib/typography'
import { colors, screenWallpaperBaseColor, type as typography } from '../../theme'
interface HomeScreenHeaderProps {
  pretitle: string
  title?: string
  subtitle?: string
  onNotificationsPress?: () => void
  /** Show accent dot only when there are unread inbox items. */
  unreadCount?: number
}

export default function HomeScreenHeader({
  pretitle,
  title,
  subtitle,
  onNotificationsPress,
  unreadCount = 0,
}: HomeScreenHeaderProps) {
  const showUnreadBadge = unreadCount > 0
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={withAppFont({
            fontFamily: fonts.bold,
            fontSize: 22,
            fontWeight: '700',
            color: colors.ink,
            letterSpacing: -0.2,
            lineHeight: 28,
          })}
        >
          {pretitle}
        </Text>
        {title ? <Text style={{ ...typography.hero, marginTop: 8 }}>{title}</Text> : null}
        {subtitle ? <Text style={{ ...typography.body, marginTop: 6 }}>{subtitle}</Text> : null}
      </View>
      <Pressable
        onPress={onNotificationsPress}
        disabled={!onNotificationsPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={showUnreadBadge ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: !onNotificationsPress ? 0.5 : pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="notifications-outline" size={24} color={colors.ink} />
        {showUnreadBadge ? (
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: colors.accent,
              borderWidth: 2,
              borderColor: screenWallpaperBaseColor(),
            }}
          />
        ) : null}
      </Pressable>
    </View>
  )
}
